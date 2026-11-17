export function createTranslationRepository(db) {
  return {
    listForPoi(poiId) {
      return db
        .prepare('SELECT language_code, title, narration_text, audio_url, audio_source FROM poi_translation WHERE poi_id = ?')
        .all(poiId);
    },
    find(poiId, lang) {
      return db.prepare('SELECT * FROM poi_translation WHERE poi_id = ? AND language_code = ?').get(poiId, lang);
    },
    /** Ghi đè phần chữ; giữ nguyên audio đã có của ngôn ngữ đó. */
    upsertText(poiId, { language_code, title, narration_text }) {
      db.prepare(
        `INSERT INTO poi_translation (poi_id, language_code, title, narration_text) VALUES (?, ?, ?, ?)
         ON CONFLICT (poi_id, language_code) DO UPDATE SET title = excluded.title, narration_text = excluded.narration_text`,
      ).run(poiId, language_code, title ?? null, narration_text ?? '');
    },
    deleteExcept(poiId, keepCodes) {
      const all = this.listForPoi(poiId);
      const removed = all.filter((t) => !keepCodes.includes(t.language_code));
      for (const t of removed) {
        db.prepare('DELETE FROM poi_translation WHERE poi_id = ? AND language_code = ?').run(poiId, t.language_code);
      }
      return removed;
    },
    setAudio(poiId, lang, audioUrl, source) {
      db.prepare(
        `INSERT INTO poi_translation (poi_id, language_code, narration_text, audio_url, audio_source) VALUES (?, ?, '', ?, ?)
         ON CONFLICT (poi_id, language_code) DO UPDATE SET audio_url = excluded.audio_url, audio_source = excluded.audio_source`,
      ).run(poiId, lang, audioUrl, source);
    },
    /** Bản dịch do máy tạo từ bản tiếng Việt có mã băm sourceHash. */
    markAuto(poiId, lang, sourceHash) {
      db.prepare('UPDATE poi_translation SET is_auto = 1, source_hash = ? WHERE poi_id = ? AND language_code = ?').run(sourceHash, poiId, lang);
    },
    /** Người quản trị tự sửa bản dịch: từ nay máy không ghi đè nữa. */
    markManual(poiId, lang) {
      db.prepare('UPDATE poi_translation SET is_auto = 0, source_hash = NULL WHERE poi_id = ? AND language_code = ?').run(poiId, lang);
    },
    setAudioHash(poiId, lang, hash) {
      db.prepare('UPDATE poi_translation SET audio_hash = ? WHERE poi_id = ? AND language_code = ?').run(hash, poiId, lang);
    },
    clearAudio(poiId, lang) {
      db.prepare('UPDATE poi_translation SET audio_url = NULL, audio_source = NULL WHERE poi_id = ? AND language_code = ?').run(poiId, lang);
    },
  };
}
