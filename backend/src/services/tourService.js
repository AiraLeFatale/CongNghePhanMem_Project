import { transaction } from '../db/database.js';
import { badRequest, notFound } from '../utils/errors.js';
import { trimOrNull } from '../utils/validate.js';

export function createTourService(repos) {
  const { tours, pois, meta } = repos;

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
    get(id) {
      const t = tours.findById(id);
      if (!t) throw notFound('Không tìm thấy tour');
      return t;
    },
    create(body, adminId) {
      const data = validate(body);
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
        tours.update(id, data);
        tours.setPois(id, data.poi_ids);
        meta.bumpContentVersion();
      });
      return this.get(id);
    },
    delete(id) {
      if (!tours.findById(id)) throw notFound('Không tìm thấy tour');
      transaction(repos.db, () => {
        tours.delete(id);
        meta.bumpContentVersion();
      });
    },
  };
}
