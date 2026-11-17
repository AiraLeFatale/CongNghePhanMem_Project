import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { tokenStore } from '../lib/storage';
import { LANGUAGES } from '../lib/languages';
import { formatNumber } from '../lib/format';
import '../live-now.css';

export interface LiveSnapshot {
  at: string;
  ttl_seconds: number;
  total: number;
  listening: number;
  browsing: number;
  by_poi: { poi_id: number; name: string; listening: number }[];
  by_language: Record<string, number>;
  by_method: Record<string, number>;
  by_source: Record<string, number>;
}

export type Status = 'connecting' | 'live' | 'polling' | 'retrying';

const POLL_MS = 3_000;
const STALE_MS = 20_000;

const METHOD_LABEL: Record<string, string> = { qr: 'Quét QR', manual: 'Bấm nghe', geofence: 'Tự phát GPS' };

/**
 * Nhận số người đang dùng qua luồng Server-Sent Events. Dùng fetch thay EventSource để gửi được header
 * Authorization. Rớt kết nối thì tự nối lại, chờ lâu dần tới tối đa 15 giây.
 */
export function useLiveStream() {
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const retry = useRef(0);

  useEffect(() => {
    let stopped = false;
    let ctrl: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Lần cuối nhận được gì từ luồng (kể cả dòng ": ping" giữ kết nối)
    let lastChunk = 0;
    let lastEvent = 0;

    // Dự phòng: proxy giữ luồng lại hoặc luồng rớt thì tự hỏi số mỗi 3 giây
    const poller = setInterval(async () => {
      if (stopped || Date.now() - lastChunk < STALE_MS) return;
      try {
        const snap = await api.request<LiveSnapshot>('GET', '/admin/live');
        if (stopped || Date.now() - lastEvent < STALE_MS) return;
        setSnap(snap);
        setStatus('polling');
      } catch {
        /* lần sau thử lại */
      }
    }, POLL_MS);

    async function connect() {
      ctrl = new AbortController();
      try {
        const token = tokenStore.getToken();
        const res = await fetch(`${api.baseUrl}/api/admin/live/stream`, {
          headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          signal: ctrl.signal,
          cache: 'no-store',
        });
        if (!res.ok || !res.body) throw new Error(String(res.status));
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          lastChunk = Date.now();
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const line = block.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            setSnap(JSON.parse(line.slice(6)));
            lastEvent = Date.now();
            setStatus('live');
            retry.current = 0;
          }
        }
        throw new Error('closed');
      } catch {
        if (stopped) return;
        setStatus((s) => (s === 'polling' ? s : 'retrying'));
        const wait = Math.min(15_000, 1000 * 2 ** retry.current++);
        timer = setTimeout(connect, wait);
      }
    }
    connect();
    return () => {
      stopped = true;
      clearInterval(poller);
      ctrl?.abort();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { snap, status };
}

export function LiveNow() {
  const { snap, status } = useLiveStream();
  const langs = snap ? LANGUAGES.filter((l) => snap.by_language[l.code]).map((l) => ({ label: l.label, n: snap.by_language[l.code] })) : [];
  const methods = snap ? Object.entries(snap.by_method).map(([k, n]) => ({ label: METHOD_LABEL[k] ?? k, n })) : [];
  const top = snap?.by_poi[0]?.listening ?? 0;

  return (
    <section className="card live" aria-live="polite">
      <div className="live-head">
        <h2 className="live-title">Đang dùng ngay lúc này</h2>
        <span className={`live-status live-${status}`}>
          <i aria-hidden="true" />
          {status === 'live'
            ? 'Trực tiếp'
            : status === 'polling'
              ? 'Cập nhật mỗi 3 giây'
              : status === 'connecting'
                ? 'Đang kết nối…'
                : 'Mất kết nối, đang thử lại…'}
        </span>
      </div>

      <div className="live-body">
        <div className="live-nums">
          <div className="live-big">
            <span className="live-n">{snap ? formatNumber(snap.total) : '–'}</span>
            <span className="live-l">người đang mở web hoặc app</span>
          </div>
          <div className="live-split">
            <div>
              <span className="live-n2">{snap ? formatNumber(snap.listening) : '–'}</span>
              <span className="live-l">đang nghe</span>
            </div>
            <div>
              <span className="live-n2">{snap ? formatNumber(snap.browsing) : '–'}</span>
              <span className="live-l">đang xem, chưa nghe</span>
            </div>
          </div>
          {(langs.length > 0 || methods.length > 0) && (
            <div className="live-chips">
              {langs.map((l) => (
                <span key={l.label} className="live-chip">
                  {l.label} <b>{l.n}</b>
                </span>
              ))}
              {methods.map((m) => (
                <span key={m.label} className="live-chip live-chip-alt">
                  {m.label} <b>{m.n}</b>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="live-pois">
          <h3 className="live-sub">Đang nghe ở điểm nào</h3>
          {!snap || snap.by_poi.length === 0 ? (
            <p className="muted live-empty">Chưa có ai đang nghe. Số sẽ hiện ngay khi có người bấm phát hoặc quét mã QR.</p>
          ) : (
            <ul>
              {snap.by_poi.map((p) => (
                <li key={p.poi_id}>
                  <span className="live-bar" style={{ width: `${top ? (p.listening / top) * 100 : 0}%` }} aria-hidden="true" />
                  <span className="live-poi-name">{p.name}</span>
                  <b>{p.listening}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="live-foot muted">
        Ẩn danh, không lưu lại. Một người được tính là đã rời đi nếu {snap?.ttl_seconds ?? 45} giây không còn tín hiệu.
        {snap && ` Cập nhật lúc ${new Date(snap.at).toLocaleTimeString('vi-VN')}.`}
      </p>
    </section>
  );
}
