import { languageCodes } from '../config.js';
import { transaction } from '../db/database.js';
import { badRequest } from '../utils/errors.js';
import { isIsoDate } from '../utils/validate.js';

const METHODS = ['geofence', 'qr', 'manual'];
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_BATCH = 500;

// Làm tròn toạ độ 4 chữ số (~11 m) trước khi lưu: đủ cho heatmap, không lưu vị trí chính xác (BR UC5).
const round4 = (x) => Math.round(x * 1e4) / 1e4;

export function createLogService(repos) {
  function asArray(body) {
    const rows = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [body];
    if (rows.length === 0) throw badRequest('Không có dữ liệu');
    if (rows.length > MAX_BATCH) throw badRequest(`Tối đa ${MAX_BATCH} bản ghi mỗi lần gửi`);
    return rows;
  }

  return {
    recordUsage(body) {
      const input = asArray(body);
      // POI bị xoá sau khi app ghi log offline: bỏ qua bản ghi đó, không từ chối cả lô
      const known = input.filter((r) => Number.isInteger(Number(r?.poi_id)) && repos.pois.findById(Number(r.poi_id)));
      if (known.length === 0) throw badRequest('POI không tồn tại');
      const rows = known.map((r, i) => {
        const poiId = Number(r.poi_id);
        if (!SESSION_RE.test(String(r?.session_id ?? ''))) throw badRequest(`Bản ghi ${i}: session_id không hợp lệ`);
        if (!METHODS.includes(r?.trigger_method)) throw badRequest(`Bản ghi ${i}: trigger_method phải là ${METHODS.join('/')}`);
        if (!languageCodes.includes(r?.language_code)) throw badRequest(`Bản ghi ${i}: ngôn ngữ không hợp lệ`);
        const playedAt = r?.played_at && isIsoDate(r.played_at) ? new Date(r.played_at).toISOString() : new Date().toISOString();
        const secs = Math.max(0, Math.min(3600, Math.round(Number(r?.listen_seconds) || 0)));
        return { poi_id: poiId, session_id: r.session_id, trigger_method: r.trigger_method, language_code: r.language_code, played_at: playedAt, listen_seconds: secs };
      });
      return { inserted: transaction(repos.db, () => repos.logs.insertUsage(rows)), skipped: input.length - rows.length };
    },
    recordLocations(body) {
      const rows = asArray(body).map((r, i) => {
        const lat = Number(r?.latitude);
        const lng = Number(r?.longitude);
        if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
          throw badRequest(`Bản ghi ${i}: toạ độ không hợp lệ`);
        }
        if (!SESSION_RE.test(String(r?.session_id ?? ''))) throw badRequest(`Bản ghi ${i}: session_id không hợp lệ`);
        const at = r?.recorded_at && isIsoDate(r.recorded_at) ? new Date(r.recorded_at).toISOString() : new Date().toISOString();
        return { session_id: r.session_id, latitude: round4(lat), longitude: round4(lng), recorded_at: at };
      });
      return { inserted: transaction(repos.db, () => repos.logs.insertLocations(rows)) };
    },
  };
}
