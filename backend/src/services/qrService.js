import crypto from 'node:crypto';
import { badRequest, notFound } from '../utils/errors.js';
import { trimOrNull } from '../utils/validate.js';
import { config } from '../config.js';
import { lockPoi } from './paymentService.js';

export const QR_PREFIX = 'NARR:';

/**
 * Nội dung in trên mã QR: một đường link. Camera điện thoại bất kỳ mở link này ra trang nghe
 * thuyết minh trên trình duyệt; app của hệ thống cũng đọc được dạng link (lấy phần mã sau /q/).
 */
export function qrLink(payload) {
  return `${config.publicUrl}/q/${payload}`;
}

/** Lấy mã từ chuỗi quét được: link .../q/<mã>, dạng cũ "NARR:<mã>" hoặc mã trần. */
export function extractPayload(raw) {
  const s = String(raw ?? '').trim();
  const m = s.match(/\/q\/([A-Za-z0-9_-]{6,64})\/?$/);
  if (m) return m[1];
  if (s.startsWith(QR_PREFIX)) return s.slice(QR_PREFIX.length);
  return s;
}

export function createQrService(repos) {
  const { qrcodes, pois } = repos;
  return {
    listAll: () => qrcodes.listAll().map((q) => ({ ...q, content: qrLink(q.payload) })),
    listForPoi(poiId) {
      if (!pois.findById(poiId)) throw notFound('Không tìm thấy điểm thuyết minh');
      return qrcodes.listForPoi(poiId).map((q) => ({ ...q, content: qrLink(q.payload) }));
    },
    create(poiId, label) {
      if (!pois.findById(poiId)) throw notFound('Không tìm thấy điểm thuyết minh');
      const payload = crypto.randomBytes(9).toString('base64url');
      const id = qrcodes.create(poiId, payload, trimOrNull(label, 200));
      repos.meta.bumpContentVersion();
      const q = qrcodes.findById(id);
      return { ...q, content: qrLink(q.payload) };
    },
    delete(id) {
      if (!qrcodes.delete(id)) throw notFound('Không tìm thấy mã QR');
      repos.meta.bumpContentVersion();
    },
    /** UC2 bước 3–4: giải mã QR thành POI và nội dung. */
    resolve(raw) {
      const payload = extractPayload(raw);
      if (!payload) throw badRequest('Mã QR không hợp lệ');
      const q = qrcodes.findByPayload(payload);
      if (!q) throw notFound('Mã QR không hợp lệ hoặc chưa được gắn với điểm thuyết minh nào');
      const poi = pois.findById(q.poi_id);
      return { qr: { id: q.id, label: q.label }, poi: lockPoi(poi) };
    },
  };
}
