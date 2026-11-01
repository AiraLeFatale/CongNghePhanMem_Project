/**
 * Tầng nghiệp vụ: quản lý tour (nhóm POI theo thứ tự tham quan).
 * Validate tên và danh sách POI, ghi tour + tour_poi trong transaction và bump content_version.
 */
import { transaction } from '../db/database.js';
import { badRequest, notFound } from '../utils/errors.js';
import { trimOrNull } from '../utils/validate.js';

// Tạo service tour; dùng tours, pois (kiểm tra tồn tại) và meta (phiên bản nội dung).
export function createTourService(repos) {
  const { tours, pois, meta } = repos;

  // Validate payload tour: tên bắt buộc, >= 1 POI, không trùng và tất cả POI phải tồn tại.
  // Trả object đã chuẩn hoá hoặc ném 400 kèm lỗi theo từng trường.
  function validate(body) {
    const errors = {};
    const name = trimOrNull(body?.name, 200);
    if (!name) errors.name = 'Tên tour không được để trống';
    const ids = Array.isArray(body?.poi_ids) ? body.poi_ids.map(Number) : [];
    if (ids.length === 0) errors.poi_ids = 'Tour phải có ít nhất một điểm thuyết minh';
    if (ids.some((x) => !Number.isInteger(x))) errors.poi_ids = 'Danh sách điểm không hợp lệ';
    if (new Set(ids).size !== ids.length) errors.poi_ids = 'Một điểm không được lặp lại trong cùng tour';
    const missing = ids.filter((x) => Number.isInteger(x) && !pois.findById(x));
    if (missing.length) errors.poi_ids = `Không tìm thấy điểm: ${missing.join(', ')}`;
    if (Object.keys(errors).length) throw badRequest('Dữ liệu tour không hợp lệ', errors);
    return { name, description: trimOrNull(body.description, 2000), poi_ids: ids };
  }

  return {
    list: () => tours.list(),
    // Chi tiết tour kèm POI; ném 404 nếu không có.
    get(id) {
      const t = tours.findById(id);
      if (!t) throw notFound('Không tìm thấy tour');
      return t;
    },
    create(body, adminId) {
      const data = validate(body);
      // Tạo tour và gắn danh sách POI trong cùng transaction.
      const id = transaction(repos.db, () => {
        const newId = tours.create(data, adminId);
        tours.setPois(newId, data.poi_ids);
        meta.bumpContentVersion();
        return newId;
      });
      return this.get(id);
    },
    update(id, body) {
      if (!tours.findById(id)) throw notFound('Không tìm thấy tour');
      const data = validate(body);
      transaction(repos.db, () => {
        // setPois() thay toàn bộ danh sách POI cũ bằng danh sách mới.
        tours.update(id, data);
        tours.setPois(id, data.poi_ids);
        meta.bumpContentVersion();
      });
      return this.get(id);
    },
    delete(id) {
      if (!tours.findById(id)) throw notFound('Không tìm thấy tour');
      // tour_poi được xoá theo nhờ ON DELETE CASCADE.
      transaction(repos.db, () => {
        tours.delete(id);
        meta.bumpContentVersion();
      });
    },
  };
}
