/**
 * Tầng repository: truy vấn bảng poi và ghép thông tin phụ (ngôn ngữ đã có, số mã QR).
 * Không xử lý validate nghiệp vụ - dữ liệu vào đã được poiService kiểm tra.
 */
// Danh sách cột trả về cho client, tránh lộ created_by và giữ câu SQL ngắn gọn.
const POI_COLUMNS = 'id, name, address, latitude, longitude, radius_m, priority, image_url, price, created_at, updated_at';

// Tạo repository POI; giữ sẵn câu query bản dịch theo poi_id để tái sử dụng.
export function createPoiRepository(db) {
  const translationsFor = db.prepare(
    'SELECT language_code, title, narration_text, audio_url, audio_source, is_auto FROM poi_translation WHERE poi_id = ? ORDER BY language_code',
  );

  return {
    // Danh sách POI, hỗ trợ tìm gần đúng theo tên/địa chỉ (q); kèm ngôn ngữ, ngôn ngữ có audio, số QR.
    list({ q } = {}) {
      const rows = q
        ? db.prepare(`SELECT ${POI_COLUMNS} FROM poi WHERE name LIKE ? OR address LIKE ? ORDER BY priority DESC, name`).all(`%${q}%`, `%${q}%`)
        : db.prepare(`SELECT ${POI_COLUMNS} FROM poi ORDER BY priority DESC, name`).all();
      const langs = db.prepare('SELECT poi_id, language_code, audio_url FROM poi_translation').all();
      const qrCounts = db.prepare('SELECT poi_id, COUNT(*) AS n FROM qr_code GROUP BY poi_id').all();
      return rows.map((p) => ({
        ...p,
        languages: langs.filter((l) => l.poi_id === p.id).map((l) => l.language_code),
        audio_languages: langs.filter((l) => l.poi_id === p.id && l.audio_url).map((l) => l.language_code),
        qr_count: qrCounts.find((c) => c.poi_id === p.id)?.n ?? 0,
      }));
    },
    // Lấy 1 POI kèm toàn bộ bản dịch; trả null nếu không tồn tại (service sẽ ném 404).
    findById(id) {
      const poi = db.prepare(`SELECT ${POI_COLUMNS} FROM poi WHERE id = ?`).get(id);
      if (!poi) return null;
      return { ...poi, translations: translationsFor.all(id) };
    },
    // Dùng cho API đồng bộ offline: tất cả POI + bản dịch, sắp theo priority.
    listWithTranslations() {
      return db
        .prepare(`SELECT ${POI_COLUMNS} FROM poi ORDER BY priority DESC, id`)
        .all()
        .map((p) => ({ ...p, translations: translationsFor.all(p.id) }));
    },
    create(data, adminId) {
      // adminId có thể null (VD dữ liệu seed/nhập tay); DB cho phép NULL ở created_by.
      const r = db
        .prepare(
          'INSERT INTO poi (name, address, latitude, longitude, radius_m, priority, image_url, price, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(data.name, data.address ?? null, data.latitude, data.longitude, data.radius_m, data.priority, data.image_url ?? null, data.price ?? 0, adminId ?? null);
      return Number(r.lastInsertRowid);
    },
    update(id, data) {
      // Ghi đè toàn bộ trường nội dung và tự cập nhật updated_at.
      db.prepare(
        "UPDATE poi SET name = ?, address = ?, latitude = ?, longitude = ?, radius_m = ?, priority = ?, image_url = ?, price = ?, updated_at = datetime('now') WHERE id = ?",
      ).run(data.name, data.address ?? null, data.latitude, data.longitude, data.radius_m, data.priority, data.image_url ?? null, data.price ?? 0, id);
    },
    delete(id) {
      // Trả true/false để service biết có xoá được bản ghi hay không.
      return db.prepare('DELETE FROM poi WHERE id = ?').run(id).changes > 0;
    },
    // Chạm updated_at khi chỉ thay đổi dữ liệu con (bản dịch, audio, QR).
    touch(id) {
      db.prepare("UPDATE poi SET updated_at = datetime('now') WHERE id = ?").run(id);
    },
    count() {
      // Dùng cho healthcheck/thống kê nhanh số POI hiện có.
      return db.prepare('SELECT COUNT(*) AS n FROM poi').get().n;
    },
  };
}
