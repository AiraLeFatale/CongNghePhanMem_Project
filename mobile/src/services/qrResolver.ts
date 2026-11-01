/**
 * QR scanner → Narration engine (UC2).
 * Thứ tự tra mã:
 *  1. Bảng qr_code đồng bộ từ /api/sync (offline được).
 *  2. qr_cache — mã đã từng tra qua máy chủ.
 *  3. Chỉ khi chưa có trên máy: gọi GET /api/qr/:payload (online), rồi lưu vào qr_cache.
 *  Không tìm thấy + không có mạng → E2; máy chủ trả 404 → E1 "Mã QR không hợp lệ".
 */
import { api, ApiError, NetworkError } from '../data/api';
import { qrCacheDelete, qrCacheGet, qrCachePut, qrLocalGet, upsertPoi } from '../data/db';
import { loadLocalContent } from '../data/sync';
import { parseQrPayload } from '../engine/qr';
import { poiById, store } from '../state/store';
import type { Poi } from '../types';
import { refreshRegions } from './pipeline';

/** Kết quả tra một mã QR: tìm thấy POI, mã sai, mất mạng hoặc lỗi khác. */
export type QrResolution =
  | { status: 'ok'; poi: Poi; label: string | null; source: 'local' | 'server' | 'cache' }
  | { status: 'invalid' }
  | { status: 'offline' }
  | { status: 'error'; message: string };

/**
 * Tra mã QR theo thứ tự local → cache → máy chủ; trả về POI kèm nguồn tìm được.
 * Có thể ghi cache và cập nhật POI/geofence nếu máy chủ trả về dữ liệu mới.
 */
export async function resolveQr(raw: string): Promise<QrResolution> {
  const parsed = parseQrPayload(raw);
  if (!parsed) return { status: 'invalid' };

  // 1) Bảng qr_code đồng bộ sẵn — dùng được offline.
  const local = await qrLocalGet(parsed.code);
  const localPoi = local ? poiById(local.poi_id) : undefined;
  if (local && localPoi) return { status: 'ok', poi: localPoi, label: local.label, source: 'local' };

  // 2) Mã đã từng tra và lưu trong cache.
  const cached = await qrCacheGet(parsed.code);
  const cachedPoi = cached ? poiById(cached.poi_id) : undefined;
  if (cached && cachedPoi) return { status: 'ok', poi: cachedPoi, label: cached.label, source: 'cache' };

  try {
    // 3) Chỉ gọi máy chủ khi chưa có trên máy; kết quả được lưu lại cho lần sau.
    const res = await api.resolveQr(store.get().apiBase, parsed);
    await qrCachePut(parsed.code, res.poi.id, res.qr.label);
    let poi = poiById(res.poi.id);
    if (!poi) {
      // Dữ liệu máy cũ hơn máy chủ (POI mới tạo): lưu tạm POI máy chủ trả về để phát và dùng offline.
      await upsertPoi(res.poi);
      await loadLocalContent();
      refreshRegions();
      poi = poiById(res.poi.id) ?? res.poi;
    }
    return { status: 'ok', poi, label: res.qr.label, source: 'server' };
  } catch (e) {
    // Mã không tồn tại/không hợp lệ → xoá cache cũ và báo E1.
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
      await qrCacheDelete(parsed.code);
      return { status: 'invalid' };
    }
    if (e instanceof NetworkError) {
      // Không có mạng → E2, giữ cache để lần sau dùng offline.
      store.set({ online: false });
      return { status: 'offline' };
    }
    return { status: 'error', message: (e as Error)?.message ?? String(e) };
  }
}
