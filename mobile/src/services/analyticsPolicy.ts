/** Chính sách lấy mẫu vị trí ẩn danh (thuần, kiểm thử được). */
import { haversineMeters, LatLng } from '../engine/geo';

export const LOCATION_SAMPLE_INTERVAL_MS = 30_000;
export const LOCATION_SAMPLE_DISTANCE_M = 25;
/** Khoảng cách tối thiểu giữa hai mẫu kể cả khi di chuyển nhanh (tránh dồn dập). */
export const LOCATION_SAMPLE_MIN_GAP_MS = 5_000;

export interface Sample extends LatLng {
  t: number;
}

/** Ghi mẫu khi đã qua ~30 s, hoặc đã đi được ≥ 25 m (nhưng không dày hơn 5 s/mẫu). */
export function shouldSampleLocation(last: Sample | null, next: Sample): boolean {
  if (!last) return true;
  const dt = next.t - last.t;
  if (dt >= LOCATION_SAMPLE_INTERVAL_MS) return true;
  if (dt < LOCATION_SAMPLE_MIN_GAP_MS) return false;
  return haversineMeters(last, next) >= LOCATION_SAMPLE_DISTANCE_M;
}

/** session_id ẩn danh: 8–64 ký tự [A-Za-z0-9_-] (khớp kiểm tra phía máy chủ). */
export function isValidSessionId(s: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(s);
}

/** Cắt mảng thành các lô ≤ size (máy chủ nhận tối đa 500 bản ghi/lần). */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
