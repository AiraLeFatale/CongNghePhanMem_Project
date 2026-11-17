import { badRequest } from '../utils/errors.js';

const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;
const STATES = new Set(['browsing', 'listening', 'left']);
const METHODS = new Set(['geofence', 'qr', 'manual']);
const SOURCES = new Set(['web', 'app']);
const LANGS = new Set(['vi', 'en', 'zh', 'ko', 'ja', 'fr']);

/**
 * Người đang dùng ngay lúc này. Mỗi web/app gửi nhịp tim khoảng 15 giây một lần; quá ttlMs không nhận
 * được thì coi như đã rời đi. Chỉ giữ trong RAM, không ghi cơ sở dữ liệu (lượt nghe vẫn ghi qua /logs/usage).
 * Nhiều tiến trình máy chủ thì mỗi tiến trình đếm riêng; triển khai hiện tại chạy một tiến trình.
 */
export function createLiveService(repos, { ttlMs = 45_000, sweepMs = 5_000, throttleMs = 500, now = () => Date.now() } = {}) {
  const sessions = new Map();
  const listeners = new Set();
  let timer = null;
  let lastSent = 0;

  function notify() {
    if (!listeners.size || timer) return;
    const wait = Math.max(0, lastSent + throttleMs - now());
    timer = setTimeout(() => {
      timer = null;
      lastSent = now();
      const snap = snapshot();
      for (const fn of listeners) fn(snap);
    }, wait);
    timer.unref?.();
  }

  function sweep() {
    const cutoff = now() - ttlMs;
    let changed = false;
    for (const [id, s] of sessions) {
      if (s.lastSeen < cutoff) {
        sessions.delete(id);
        changed = true;
      }
    }
    if (changed) notify();
  }
  const sweeper = setInterval(sweep, sweepMs);
  sweeper.unref?.();

  function ping(body) {
    const b = body && typeof body === 'object' ? body : {};
    if (typeof b.session_id !== 'string' || !SESSION_RE.test(b.session_id)) throw badRequest('session_id không hợp lệ');
    const state = b.state ?? 'browsing';
    if (!STATES.has(state)) throw badRequest('state không hợp lệ');
    if (state === 'left') {
      if (sessions.delete(b.session_id)) notify();
      return;
    }
    const poiId = b.poi_id == null ? null : Number(b.poi_id);
    if (poiId !== null && !(Number.isInteger(poiId) && poiId > 0)) throw badRequest('poi_id không hợp lệ');
    const prev = sessions.get(b.session_id);
    const next = {
      state,
      poi_id: state === 'listening' ? poiId : null,
      language_code: LANGS.has(b.language_code) ? b.language_code : null,
      trigger_method: state === 'listening' && METHODS.has(b.trigger_method) ? b.trigger_method : null,
      source: SOURCES.has(b.source) ? b.source : 'web',
      since: prev && prev.state === state && prev.poi_id === (state === 'listening' ? poiId : null) ? prev.since : now(),
      lastSeen: now(),
    };
    sessions.set(b.session_id, next);
    if (!prev || prev.state !== next.state || prev.poi_id !== next.poi_id || prev.language_code !== next.language_code) notify();
  }

  function snapshot() {
    sweepQuiet();
    const byPoi = new Map();
    const byLanguage = {};
    const byMethod = {};
    const bySource = {};
    let listening = 0;
    for (const s of sessions.values()) {
      bySource[s.source] = (bySource[s.source] ?? 0) + 1;
      if (s.state !== 'listening') continue;
      listening++;
      if (s.language_code) byLanguage[s.language_code] = (byLanguage[s.language_code] ?? 0) + 1;
      if (s.trigger_method) byMethod[s.trigger_method] = (byMethod[s.trigger_method] ?? 0) + 1;
      if (s.poi_id) byPoi.set(s.poi_id, (byPoi.get(s.poi_id) ?? 0) + 1);
    }
    const pois = [...byPoi.entries()]
      .map(([poi_id, count]) => ({ poi_id, name: repos.pois.findById(poi_id)?.name ?? `#${poi_id}`, listening: count }))
      .sort((a, b) => b.listening - a.listening || a.name.localeCompare(b.name, 'vi'));
    return {
      at: new Date(now()).toISOString(),
      ttl_seconds: Math.round(ttlMs / 1000),
      total: sessions.size,
      listening,
      browsing: sessions.size - listening,
      by_poi: pois,
      by_language: byLanguage,
      by_method: byMethod,
      by_source: bySource,
    };
  }

  // Dọn phiên hết hạn trước khi đếm, không phát sự kiện (người gọi đang lấy số mới nhất rồi)
  function sweepQuiet() {
    const cutoff = now() - ttlMs;
    for (const [id, s] of sessions) if (s.lastSeen < cutoff) sessions.delete(id);
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function close() {
    clearInterval(sweeper);
    if (timer) clearTimeout(timer);
    listeners.clear();
  }

  return { ping, snapshot, subscribe, sweep, close };
}
