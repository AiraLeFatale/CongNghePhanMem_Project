import { tokenStore } from './storage';
import type {
  AdminUser,
  AnalyticsQuery,
  AnalyticsReport,
  LanguageCode,
  Poi,
  PoiInput,
  PoiListItem,
  QrCode,
  Tour,
  TourInput,
  TourListItem,
} from './types';

/** Lỗi thống nhất từ API: `{ error: { code, message, details } }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, string> | undefined;

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorMessage(err: unknown, fallback = 'Đã xảy ra lỗi, vui lòng thử lại'): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** Bỏ dấu "/" cuối để ghép đường dẫn không bị "//". */
export function normalizeBase(base: string | undefined | null): string {
  return (base ?? '').trim().replace(/\/+$/, '');
}

export function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  getToken?: () => string | null;
  /** Gọi khi API quản trị trả 401 (phiên hết hạn) — CMS đưa về trang đăng nhập. */
  onUnauthorized?: () => void;
}

type Body = unknown;

export function createApiClient(opts: ApiClientOptions = {}) {
  const base = normalizeBase(opts.baseUrl);
  const doFetch: typeof fetch = (...args) => (opts.fetchImpl ?? globalThis.fetch)(...args);
  const getToken = opts.getToken ?? (() => null);

  /** Đường dẫn tuyệt đối cho file trong /uploads (audio_url, image_url lưu dạng tương đối). */
  function fileUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^(https?:|blob:|data:)/i.test(path)) return path;
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  async function request<T>(method: string, path: string, body?: Body, { auth = true } = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = auth ? getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body; // trình duyệt tự đặt multipart boundary
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await doFetch(`${base}/api${path}`, { method, headers, body: payload });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Kiểm tra mạng hoặc backend.');
    }

    if (res.status === 204) return null as T;
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const e = (data as { error?: { code?: string; message?: string; details?: Record<string, string> } } | null)?.error;
      const err = new ApiError(res.status, e?.code ?? `HTTP_${res.status}`, e?.message ?? `Máy chủ trả lỗi ${res.status}`, e?.details ?? undefined);
      if (res.status === 401 && auth) opts.onUnauthorized?.();
      throw err;
    }
    return data as T;
  }

  const get = <T>(p: string) => request<T>('GET', p);
  const post = <T>(p: string, b?: Body) => request<T>('POST', p, b);
  const put = <T>(p: string, b?: Body) => request<T>('PUT', p, b);
  const del = <T>(p: string) => request<T>('DELETE', p);

  return {
    baseUrl: base,
    fileUrl,
    request,
    // Đăng nhập
    login: (username: string, password: string) =>
      request<{ token: string; user: AdminUser }>('POST', '/auth/login', { username, password }, { auth: false }),
    me: () => get<{ user: AdminUser }>('/admin/me'),
    changePassword: (current_password: string, new_password: string) =>
      post<null>('/admin/me/password', { current_password, new_password }),
    // POI
    listPois: (q?: string) => get<{ items: PoiListItem[] }>(`/admin/pois${buildQuery({ q })}`).then((r) => r.items),
    getPoi: (id: number) => get<Poi>(`/admin/pois/${id}`),
    createPoi: (input: PoiInput) => post<Poi>('/admin/pois', input),
    updatePoi: (id: number, input: PoiInput) => put<Poi>(`/admin/pois/${id}`, input),
    deletePoi: (id: number) => del<null>(`/admin/pois/${id}`),
    uploadAudio: (id: number, lang: LanguageCode, file: File) => {
      const fd = new FormData();
      fd.append('audio', file);
      return post<Poi>(`/admin/pois/${id}/audio/${lang}`, fd);
    },
    removeAudio: (id: number, lang: LanguageCode) => del<Poi>(`/admin/pois/${id}/audio/${lang}`),
    generateTts: (id: number, lang: LanguageCode) => post<Poi>(`/admin/pois/${id}/tts/${lang}`),
    uploadImage: (file: File) => {
      const fd = new FormData();
      fd.append('image', file);
      return post<{ url: string }>('/admin/images', fd);
    },
    translate: (text: string, source: LanguageCode, target: LanguageCode) =>
      post<{ text: string; provider: string }>('/admin/translate', { text, source, target }),
    // QR
    listPoiQrCodes: (poiId: number) => get<{ items: QrCode[] }>(`/admin/pois/${poiId}/qrcodes`).then((r) => r.items),
    createQrCode: (poiId: number, label: string | null) => post<QrCode>(`/admin/pois/${poiId}/qrcodes`, { label }),
    listQrCodes: () => get<{ items: QrCode[] }>('/admin/qrcodes').then((r) => r.items),
    deleteQrCode: (id: number) => del<null>(`/admin/qrcodes/${id}`),
    // Tour
    listTours: () => get<{ items: TourListItem[] }>('/admin/tours').then((r) => r.items),
    getTour: (id: number) => get<Tour>(`/admin/tours/${id}`),
    createTour: (input: TourInput) => post<Tour>('/admin/tours', input),
    updateTour: (id: number, input: TourInput) => put<Tour>(`/admin/tours/${id}`, input),
    deleteTour: (id: number) => del<null>(`/admin/tours/${id}`),
    // Thống kê
    analytics: (q: AnalyticsQuery) =>
      get<AnalyticsReport>(`/admin/analytics${buildQuery({ from: q.from, to: q.to, tour_id: q.tour_id ?? undefined })}`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Gắn bộ xử lý 401 từ AuthProvider (tránh phụ thuộc vòng). */
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL,
  getToken: () => tokenStore.getToken(),
  onUnauthorized: () => unauthorizedHandler?.(),
});

/** Nội dung in lên mã QR. API danh sách theo POI có `content`; dự phòng tự ghép từ payload. */
export function qrContent(qr: Pick<QrCode, 'payload' | 'content'>): string {
  return qr.content || `NARR:${qr.payload}`;
}
