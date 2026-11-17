import type { Order, Poi, QrResolution, SyncData } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error?.message ?? `Lỗi ${res.status}`, res.status);
  return body as T;
}

let syncCache: Promise<SyncData> | null = null;

/** Toàn bộ nội dung công khai (điểm, bản dịch, tour). Gọi một lần cho cả phiên. */
export function loadContent(): Promise<SyncData> {
  if (!syncCache) {
    syncCache = get<SyncData>('/sync');
    syncCache.catch(() => (syncCache = null));
  }
  return syncCache;
}

export function resolveQr(code: string): Promise<QrResolution> {
  return get<QrResolution>(`/qr/${encodeURIComponent(code)}`);
}

export interface UsageRecord {
  poi_id: number;
  session_id: string;
  trigger_method: 'qr' | 'manual';
  language_code: string;
  played_at: string;
  listen_seconds: number;
}

/** Ghi lượt nghe ẩn danh. Dùng sendBeacon để vẫn gửi được khi khách đóng tab. */
export function logUsage(record: UsageRecord) {
  const body = JSON.stringify([record]);
  try {
    if (navigator.sendBeacon?.('/api/logs/usage', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    /* thử fetch bên dưới */
  }
  fetch('/api/logs/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

/** Mã phiên ẩn danh, giữ trong tab hiện tại. */
export function sessionId(): string {
  const key = 'narr_session';
  try {
    const old = sessionStorage.getItem(key);
    if (old) return old;
    const id = `web_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `web_${Math.random().toString(36).slice(2, 14)}`;
  }
}

// ---- Điểm có phí ----
const ACCESS_KEY = 'narr_access';

/** Mã quyền nghe đã mua trên máy này. */
export function accessTokens(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveAccessToken(token: string) {
  try {
    const all = new Set(accessTokens());
    all.add(token);
    localStorage.setItem(ACCESS_KEY, JSON.stringify([...all].slice(-50)));
  } catch {
    /* trình duyệt chặn bộ nhớ: vẫn nghe được trong lần này */
  }
}

/** Nội dung đầy đủ của điểm có phí; ném ApiError 402 nếu chưa mua. */
export function fullPoi(id: number, extraToken?: string): Promise<Poi> {
  const tokens = [...accessTokens(), ...(extraToken ? [extraToken] : [])];
  return get<Poi>(`/pois/${id}/full`, { headers: { 'x-access-token': tokens.join(',') } });
}

export function createOrder(poiId: number): Promise<Order> {
  return get<Order>('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ poi_id: poiId }) });
}

export function orderStatus(code: string, token: string): Promise<Order> {
  return get<Order>(`/orders/${code}`, { headers: { 'x-order-token': token } });
}

/** Khách báo đã chuyển khoản: máy chủ mở khoá ngay, quản trị viên đối chiếu sau. */
export function claimOrder(code: string, token: string): Promise<Order> {
  return get<Order>(`/orders/${code}/claim`, { method: 'POST', headers: { 'x-order-token': token } });
}
