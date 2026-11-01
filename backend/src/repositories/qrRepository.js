/**
 * Tầng repository: quản lý bảng qr_code.
 * Mỗi mã QR gắn với một POI qua poi_id và có payload duy nhất dùng để tra cứu khi quét.
 */

// Tạo repository QR; payload do qrService sinh, repository chỉ đọc/ghi.
export function createQrRepository(db) {
  return {
    // Liệt kê toàn bộ mã QR kèm tên POI, mới nhất trước (dùng cho màn quản lý).
    listAll() {
      return db
        .prepare(
          'SELECT q.id, q.poi_id, q.payload, q.label, q.created_at, p.name AS poi_name FROM qr_code q JOIN poi p ON p.id = q.poi_id ORDER BY q.id DESC',
        )
        .all();
    },
    // Danh sách mã QR của một POI, sắp theo id tăng dần.
    listForPoi(poiId) {
      return db.prepare('SELECT id, poi_id, payload, label, created_at FROM qr_code WHERE poi_id = ? ORDER BY id').all(poiId);
    },
    // Tra mã QR theo payload - điểm vào khi app quét mã; trả undefined nếu không khớp.
    findByPayload(payload) {
      return db.prepare('SELECT * FROM qr_code WHERE payload = ?').get(payload);
    },
    // Đọc một mã QR theo id (dùng ngay sau khi tạo để trả bản ghi đầy đủ).
    findById(id) {
      return db.prepare('SELECT * FROM qr_code WHERE id = ?').get(id);
    },
    // Tạo mã mới; payload do service sinh và phải duy nhất (ràng buộc UNIQUE).
    create(poiId, payload, label) {
      // label là ghi chú vị trí đặt mã (VD "Trạm xe buýt Bến Nhà Rồng").
      const r = db.prepare('INSERT INTO qr_code (poi_id, payload, label) VALUES (?, ?, ?)').run(poiId, payload, label ?? null);
      return Number(r.lastInsertRowid);
    },
    // Xoá mã QR; trả false khi id không tồn tại để service ném 404.
    delete(id) {
      return db.prepare('DELETE FROM qr_code WHERE id = ?').run(id).changes > 0;
    },
  };
}
