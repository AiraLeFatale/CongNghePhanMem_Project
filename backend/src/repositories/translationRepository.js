/**
 * Tầng repository: đọc/ghi bảng poi_translation (bản dịch và audio theo ngôn ngữ).
 * Ràng buộc UNIQUE (poi_id, language_code) cho phép dùng UPSERT để vừa tạo vừa cập nhật.
 */

// Tạo repository bản dịch; mọi truy vấn đều theo cặp (poiId, language_code).
export function createTranslationRepository(db) {
  return {
    // Toàn bộ bản dịch của một POI (không sắp xếp, dùng cho API đồng bộ).
    listForPoi(poiId) {
      return db
        .prepare('SELECT language_code, title, narration_text, audio_url, audio_source, is_auto FROM poi_translation WHERE poi_id = ?')
        .all(poiId);
    },
    // Tìm đúng một bản dịch theo ngôn ngữ; trả undefined nếu chưa có.
    find(poiId, lang) {
      return db.prepare('SELECT * FROM poi_translation WHERE poi_id = ? AND language_code = ?').get(poiId, lang);
    },
    /** Ghi đè phần chữ; giữ nguyên audio đã có của ngôn ngữ đó. */
    upsertText(poiId, { language_code, title, narration_text, is_auto = 0 }) {
      db.prepare(
        `INSERT INTO poi_translation (poi_id, language_code, title, narration_text, is_auto) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (poi_id, language_code) DO UPDATE SET title = excluded.title, narration_text = excluded.narration_text, is_auto = excluded.is_auto`,
      ).run(poiId, language_code, title ?? null, narration_text ?? '', is_auto ? 1 : 0);
    },
    /** Bản dịch do máy tạo: đánh dấu is_auto = 1 để lần lưu sau không coi là bản admin tự sửa. */
    upsertAuto(poiId, { language_code, title, narration_text }) {
      this.upsertText(poiId, { language_code, title, narration_text, is_auto: 1 });
    },
    deleteExcept(poiId, keepCodes) {
      // Xoá các bản dịch không còn trong danh sách gửi lên; trả về danh sách đã xoá.
      const all = this.listForPoi(poiId);
      const removed = all.filter((t) => !keepCodes.includes(t.language_code));
      for (const t of removed) {
        db.prepare('DELETE FROM poi_translation WHERE poi_id = ? AND language_code = ?').run(poiId, t.language_code);
      }
      return removed;
    },
    setAudio(poiId, lang, audioUrl, source) {
      // UPSERT riêng cho audio: nếu bản dịch chưa có thì tạo với narration_text rỗng.
      db.prepare(
        `INSERT INTO poi_translation (poi_id, language_code, narration_text, audio_url, audio_source) VALUES (?, ?, '', ?, ?)
         ON CONFLICT (poi_id, language_code) DO UPDATE SET audio_url = excluded.audio_url, audio_source = excluded.audio_source`,
      ).run(poiId, lang, audioUrl, source);
    },
    // Gỡ audio khỏi bản dịch (giữ nguyên phần chữ).
    clearAudio(poiId, lang) {
      db.prepare('UPDATE poi_translation SET audio_url = NULL, audio_source = NULL WHERE poi_id = ? AND language_code = ?').run(poiId, lang);
    },
  };
}
