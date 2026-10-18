/** Hàm hình học thuần (không phụ thuộc Expo) — dùng chung cho geofence, analytics và mô phỏng. */

const EARTH_RADIUS_M = 6371008.8;
const toRad = (d: number) => (d * Math.PI) / 180;

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Khoảng cách haversine giữa hai toạ độ, đơn vị mét. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Điểm nằm trên đoạn a→b tại tỉ lệ t (0..1). Đủ chính xác cho quãng ngắn trong nội đô. */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

/** Dịch một toạ độ theo hướng tới đích một đoạn `meters`; trả về đích nếu đã tới. */
export function stepTowards(from: LatLng, to: LatLng, meters: number): { point: LatLng; arrived: boolean } {
  const d = haversineMeters(from, to);
  if (d <= meters || d === 0) return { point: { ...to }, arrived: true };
  return { point: interpolate(from, to, meters / d), arrived: false };
}

export function formatDistance(m: number): string {
  if (!Number.isFinite(m)) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
