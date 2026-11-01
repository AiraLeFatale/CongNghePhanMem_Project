/**
 * Tầng nghiệp vụ: quản lý mã QR gắn với POI.
 * Sinh payload ngẫu nhiên, định dạng "NARR:<payload>" và giải mã QR thành POI khi app quét.
 */
import crypto from 'node:crypto';
import { badRequest, notFound } from '../utils/errors.js';
import { trimOrNull } from '../utils/validate.js';
import { maskLockedAudio } from '../utils/locked.js';

// Tiền tố nhận diện payload do hệ thống sinh ra.
export const QR_PREFIX = 'NARR:';

/** Payload in trên mã QR: "NARR:<mã ngẫu nhiên>". App chấp nhận cả dạng URL .../q/<mã>. */
// Nhận cả URL lẫn payload thuần; trả về phần mã (chuỗi rỗng nếu input rỗng).
export function extractPayload(raw) {
  const s = String(raw ?? '').trim();
  const m = s.match(/\/q\/([A-Za-z0-9_-]{6,64})\/?$/);
  if (m) return m[1];
  if (s.startsWith(QR_PREFIX)) return s.slice(QR_PREFIX.length);
  return s;
}

// Tạo service QR; luôn kiểm tra POI tồn tại trước khi đọc/ghi mã.
export function createQrService(repos) {
  const { qrcodes, pois } = repos;
  return {
    // Trả kèm trường content (payload đầy đủ) để CMS in mã mà không cần ghép tiền tố.
    listAll: () => qrcodes.listAll().map((q) => ({ ...q, content: QR_PREFIX + q.payload })),
    // Danh sách mã của một POI; ném 404 nếu POI không tồn tại.
    listForPoi(poiId) {
      if (!pois.findById(poiId)) throw notFound('Không tìm thấy điểm thuyết minh');
      return qrcodes.listForPoi(poiId).map((q) => ({ ...q, content: QR_PREFIX + q.payload }));
    },
    create(poiId, label) {
      if (!pois.findById(poiId)) throw notFound('Không tìm thấy điểm thuyết minh');
      // 9 byte ngẫu nhiên → 12 ký tự base64url, đủ khó đoán để không ai tự tạo mã giả.
      const payload = crypto.randomBytes(9).toString('base64url');
      const id = qrcodes.create(poiId, payload, trimOrNull(label, 200));
      // Mã QR là một phần nội dung nên phải tăng content_version cho app đồng bộ.
      repos.meta.bumpContentVersion();
      const q = qrcodes.findById(id);
      return { ...q, content: QR_PREFIX + q.payload };
    },
    delete(id) {
      // Xoá thất bại nghĩa là id không tồn tại → 404; thành công thì bump version.
      if (!qrcodes.delete(id)) throw notFound('Không tìm thấy mã QR');
      repos.meta.bumpContentVersion();
    },
    /** UC2 bước 3–4: giải mã QR thành POI và nội dung. */
    resolve(raw) {
      const payload = extractPayload(raw);
      if (!payload) throw badRequest('Mã QR không hợp lệ');
      // Tra payload ra bản ghi QR, sau đó nạp POI tương ứng.
      const q = qrcodes.findByPayload(payload);
      if (!q) throw notFound('Mã QR không hợp lệ hoặc chưa được gắn với điểm thuyết minh nào');
      const poi = pois.findById(q.poi_id);
      // Điểm có phí: ẩn audio cho tới khi khách mua (giống website đang chạy).
      return { qr: { id: q.id, label: q.label }, poi: maskLockedAudio(poi) };
    },
  };
}
