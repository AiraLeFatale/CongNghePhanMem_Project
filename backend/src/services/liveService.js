/**
 * Tầng nghiệp vụ: đếm người đang dùng website/app theo thời gian thực.
 *
 * Website gửi heartbeat POST /api/live/ping mỗi 15 giây. Backend giữ các phiên còn
 * "sống" trong bộ nhớ (không ghi DB) và trả snapshot cho CMS qua GET /api/admin/live
 * hoặc SSE /api/admin/live/stream.
 *
 * config.liveDemoFactor cho phép nhân số liệu để demo (mặc định 2 = gấp đôi);
 * đặt LIVE_DEMO_FACTOR=1 để hiển thị số thật.
 */
import { config, languageCodes } from '../config.js';
import { badRequest } from '../utils/errors.js';

const STATES = new Set(['browsing', 'listening', 'left']);
// session_id do web/app sinh; yêu cầu tối thiểu 8 ký tự để tránh rác.
const SESSION_RE = /^[A-Za-z0-9_-]{8,128}$/;

// Tạo service đếm live. options.factor/options.ttlMs cho phép test đổi hệ số và TTL
// mà không cần đặt biến môi trường.
export function createLiveService(repos, options = {}) {
  const factor = options.factor ?? config.liveDemoFactor;
  const ttlMs = options.ttlMs ?? config.liveTtlMs;
  // session_id → { state, source, poi_id, language_code, trigger_method, updated_at }
  const sessions = new Map();
  const clients = new Set();

  const scale = (n) => Math.round(n * factor);

  // Dọn phiên quá TTL trước mỗi lần đọc số, tránh "kẹt" người dùng khi app mất mạng.
  function prune(now = Date.now()) {
    for (const [id, s] of sessions) if (now - s.updated_at > ttlMs) sessions.delete(id);
  }

  // Ghi nhận một heartbeat; state "left" xoá phiên ngay.
  function ping(body) {
    const sessionId = String(body?.session_id ?? '').trim();
    if (!SESSION_RE.test(sessionId)) throw badRequest('session_id không hợp lệ');
    const state = String(body?.state ?? '');
    if (!STATES.has(state)) throw badRequest('state không hợp lệ');
    if (state === 'left') {
      sessions.delete(sessionId);
      return;
    }
    const prev = sessions.get(sessionId);
    const poiId = Number(body?.poi_id);
    sessions.set(sessionId, {
      state,
      source: String(body?.source ?? prev?.source ?? 'web').slice(0, 32),
      language_code: body?.language_code != null ? String(body.language_code).slice(0, 16) : (prev?.language_code ?? null),
      poi_id: state === 'listening' && Number.isFinite(poiId) ? poiId : null,
      trigger_method: state === 'listening' && body?.trigger_method ? String(body.trigger_method).slice(0, 32) : null,
      updated_at: Date.now(),
    });
  }

  // Snapshot đã nhân hệ số demo; mọi nơi (REST + SSE) dùng chung hàm này.
  function snapshot() {
    const now = Date.now();
    prune(now);
    const active = [...sessions.values()];
    const listening = active.filter((s) => s.state === 'listening');
    const byLanguage = {};
    const byMethod = {};
    const bySource = {};
    const byPoi = new Map();

    for (const s of active) {
      if (s.source) bySource[s.source] = (bySource[s.source] ?? 0) + 1;
      if (s.state !== 'listening') continue;
      if (s.language_code) byLanguage[s.language_code] = (byLanguage[s.language_code] ?? 0) + 1;
      if (s.trigger_method) byMethod[s.trigger_method] = (byMethod[s.trigger_method] ?? 0) + 1;
      if (s.poi_id != null) {
        const poi = repos.pois.findById(s.poi_id);
        if (poi) {
          const row = byPoi.get(s.poi_id) ?? { poi_id: s.poi_id, name: poi.name, listening: 0 };
          row.listening++;
          byPoi.set(s.poi_id, row);
        }
      }
    }

    const scaledMap = (obj) => Object.fromEntries(Object.entries(obj).filter(([, n]) => n > 0).map(([k, n]) => [k, scale(n)]));

    return {
      at: new Date(now).toISOString(),
      ttl_seconds: Math.round(ttlMs / 1000),
      // total = số phiên còn sống × LIVE_DEMO_FACTOR (mặc định 1 = số thật).
      total: scale(active.length),
      listening: scale(listening.length),
      browsing: scale(active.filter((s) => s.state === 'browsing').length),
      by_poi: [...byPoi.values()].sort((a, b) => b.listening - a.listening || a.poi_id - b.poi_id).map((p) => ({ ...p, listening: scale(p.listening) })),
      by_language: scaledMap(byLanguage),
      by_method: scaledMap(byMethod),
      by_source: scaledMap(bySource),
    };
  }

  // SSE: gửi snapshot ngay khi kết nối rồi lặp lại mỗi vài giây.
  function stream(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Tránh nginx/OpenLiteSpeed đệm dữ liệu SSE.
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const send = () => {
      if (res.writableEnded) return;
      try {
        res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
      } catch {
        cleanup();
      }
    };
    const timer = setInterval(send, config.liveSseIntervalMs);
    timer.unref?.();
    const cleanup = () => {
      clearInterval(timer);
      clients.delete(res);
      if (!res.writableEnded) res.end();
    };
    clients.add(res);
    res.on('close', () => {
      clearInterval(timer);
      clients.delete(res);
    });
    send();
    // Giữ tham chiếu req để tránh bị tối ưu/GC trong một số runtime.
    void req;
  }

  // Đóng toàn bộ kết nối SSE khi server tắt (dùng cho test).
  function close() {
    for (const res of clients) {
      try {
        res.end();
      } catch {
        // bỏ qua
      }
    }
    clients.clear();
  }

  return { ping, snapshot, stream, close, supportedLanguages: languageCodes };
}
