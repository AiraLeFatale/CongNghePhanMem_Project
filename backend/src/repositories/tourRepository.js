/**
 * Tầng repository: quản lý tour và bảng nối tour_poi (thứ tự tham quan).
 * Cung cấp cả bản rút gọn cho danh sách và bản đầy đủ kèm POI cho API đồng bộ.
 */
// Câu query các POI của một tour, sắp theo visit_order; chuẩn bị sẵn 1 lần.
export function createTourRepository(db) {
  const poisOf = db.prepare(
    `SELECT p.id, p.name, p.latitude, p.longitude, tp.visit_order
     FROM tour_poi tp JOIN poi p ON p.id = tp.poi_id WHERE tp.tour_id = ? ORDER BY tp.visit_order`,
  );
  return {
    // Danh sách tour kèm số POI (LEFT JOIN để tour rỗng vẫn xuất hiện).
    list() {
      return db
        .prepare(
          `SELECT t.id, t.name, t.description, t.created_at, t.updated_at, COUNT(tp.poi_id) AS poi_count
           FROM tour t LEFT JOIN tour_poi tp ON tp.tour_id = t.id GROUP BY t.id ORDER BY t.name`,
        )
        .all();
    },
    // Bản dùng cho app: mỗi tour chỉ kèm mảng poi_ids theo thứ tự.
    listWithPois() {
      return db
        .prepare('SELECT id, name, description, updated_at FROM tour ORDER BY name')
        .all()
        .map((t) => ({ ...t, poi_ids: poisOf.all(t.id).map((p) => p.id) }));
    },
    // Chi tiết tour kèm thông tin từng POI; trả null nếu id không tồn tại.
    findById(id) {
      const tour = db.prepare('SELECT id, name, description, created_at, updated_at FROM tour WHERE id = ?').get(id);
      if (!tour) return null;
      return { ...tour, pois: poisOf.all(id) };
    },
    // Tạo tour rỗng (chưa gắn POI); service gọi setPois() ngay sau đó.
    create({ name, description }, adminId) {
      const r = db.prepare('INSERT INTO tour (name, description, created_by) VALUES (?, ?, ?)').run(name, description ?? null, adminId ?? null);
      return Number(r.lastInsertRowid);
    },
    // Cập nhật tên/mô tả; danh sách POI do setPois() xử lý riêng.
    update(id, { name, description }) {
      db.prepare("UPDATE tour SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?").run(name, description ?? null, id);
    },
    // Thay toàn bộ danh sách POI: xoá cũ rồi chèn lại với visit_order 1..n.
    setPois(id, poiIds) {
      db.prepare('DELETE FROM tour_poi WHERE tour_id = ?').run(id);
      const ins = db.prepare('INSERT INTO tour_poi (tour_id, poi_id, visit_order) VALUES (?, ?, ?)');
      poiIds.forEach((poiId, i) => ins.run(id, poiId, i + 1));
    },
    // Xoá tour; tour_poi tự xoá theo nhờ ON DELETE CASCADE.
    delete(id) {
      return db.prepare('DELETE FROM tour WHERE id = ?').run(id).changes > 0;
    },
    // Chỉ trả mảng id POI của tour (dùng khi cần tính khung bao cho bản đồ nhiệt).
    poiIdsOf(id) {
      return poisOf.all(id).map((p) => p.id);
    },
  };
}
