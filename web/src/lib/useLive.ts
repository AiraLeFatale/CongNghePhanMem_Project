import { useEffect } from 'react';
import type { LanguageCode } from './types';

/**
 * Báo cho máy chủ biết có người đang mở web hoặc đang nghe, để CMS hiện "đang dùng ngay lúc này".
 * Gửi khi mở trang, mỗi 15 giây khi tab đang hiện hoặc đang phát, và ngay khi bấm phát/dừng.
 * Chỉ gửi mã phiên ngẫu nhiên, điểm đang nghe và ngôn ngữ; máy chủ không lưu vào cơ sở dữ liệu.
 */
type LiveState = {
  state: 'browsing' | 'listening';
  poi_id: number | null;
  language_code: LanguageCode | null;
  trigger_method: 'qr' | 'manual' | null;
};

const INTERVAL_MS = 15_000;

/**
 * Mã "người đang dùng" chung cho mọi tab của cùng một trình duyệt, để mở 2 tab vẫn tính là 1 người.
 * Khác với sessionId() của lượt nghe (mỗi tab một mã). Ngẫu nhiên, không gắn với thông tin cá nhân.
 */
function liveId(): string {
  const key = 'narr_live_id';
  try {
    const old = localStorage.getItem(key);
    if (old) return old;
    const id = `web_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return (fallbackId ??= `web_${Math.random().toString(36).slice(2, 14)}`);
  }
}
let fallbackId: string | undefined;
let current: LiveState = { state: 'browsing', poi_id: null, language_code: null, trigger_method: null };
let active = false;

function send(body: object) {
  fetch('/api/live/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: liveId(), source: 'web', ...body }),
    keepalive: true,
  }).catch(() => {});
}

const sendCurrent = () => send(current);

/** Gọi khi bắt đầu phát (truyền thông tin điểm) hoặc khi dừng (truyền null). */
export function setLiveListening(info: { poi_id: number; language_code: LanguageCode; trigger_method: 'qr' | 'manual' } | null) {
  const next: LiveState = info
    ? { state: 'listening', ...info }
    : { state: 'browsing', poi_id: null, language_code: current.language_code, trigger_method: null };
  if (next.state === current.state && next.poi_id === current.poi_id && next.language_code === current.language_code) return;
  current = next;
  if (active) sendCurrent();
}

/** Đặt một lần ở khung trang (Layout). */
export function useLivePresence(lang: LanguageCode) {
  useEffect(() => {
    if (current.state === 'browsing') current = { ...current, language_code: lang };
  }, [lang]);

  useEffect(() => {
    active = true;
    sendCurrent();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' || current.state === 'listening') sendCurrent();
    }, INTERVAL_MS);
    const onLeave = () => {
      const body = JSON.stringify({ session_id: liveId(), state: 'left' });
      if (!navigator.sendBeacon?.('/api/live/ping', new Blob([body], { type: 'application/json' }))) send({ state: 'left' });
    };
    // Điện thoại thường không báo khi đóng tab hay chuyển app, nhưng luôn báo trang bị ẩn:
    // ẩn mà không phát gì thì báo rời đi ngay; mở lại thì báo có mặt.
    const onVisible = () => {
      if (document.visibilityState === 'visible') sendCurrent();
      else if (current.state !== 'listening') onLeave();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onLeave);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onLeave);
    };
  }, []);
}
