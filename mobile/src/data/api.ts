/** Client REST tối giản cho các API công khai của backend. */
import { REQUEST_TIMEOUT_MS } from '../config';
import type { LocationLog, Poi, SyncBundle, UsageLog } from '../types';
import { ParsedQr, qrApiPath } from '../engine/qr';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Lỗi mạng (không kết nối được, hết thời gian chờ) — khác với lỗi máy chủ trả về. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

async function request<T>(base: string, path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
    });
  } catch (e: any) {
    throw new NetworkError(e?.name === 'AbortError' ? 'Hết thời gian chờ máy chủ' : 'Không kết nối được máy chủ');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new ApiError(json?.error?.message ?? `HTTP ${res.status}`, res.status, json?.error?.code);
  }
  return json as T;
}

export const api = {
  health: (base: string) => request<{ status: string }>(base, '/api/health', {}, 4000),
  syncVersion: (base: string) => request<{ version: number }>(base, '/api/sync/version'),
  sync: (base: string) => request<SyncBundle>(base, '/api/sync', {}, 20000),
  resolveQr: (base: string, parsed: ParsedQr) =>
    request<{ qr: { id: number; label: string | null }; poi: Poi }>(base, qrApiPath(parsed), {}, 6000),
  postUsage: (base: string, logs: UsageLog[]) =>
    request<{ inserted: number }>(base, '/api/logs/usage', { method: 'POST', body: JSON.stringify(logs) }),
  postLocations: (base: string, logs: LocationLog[]) =>
    request<{ inserted: number }>(base, '/api/logs/location', { method: 'POST', body: JSON.stringify(logs) }),
};
