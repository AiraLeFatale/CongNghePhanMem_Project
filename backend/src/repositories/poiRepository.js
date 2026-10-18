const POI_COLUMNS = 'id, name, address, latitude, longitude, radius_m, priority, image_url, created_at, updated_at';

export function createPoiRepository(db) {
  const translationsFor = db.prepare(
    'SELECT language_code, title, narration_text, audio_url, audio_source FROM poi_translation WHERE poi_id = ? ORDER BY language_code',
  );

  return {
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
    findById(id) {
      const poi = db.prepare(`SELECT ${POI_COLUMNS} FROM poi WHERE id = ?`).get(id);
      if (!poi) return null;
      return { ...poi, translations: translationsFor.all(id) };
    },
    listWithTranslations() {
      return db
        .prepare(`SELECT ${POI_COLUMNS} FROM poi ORDER BY priority DESC, id`)
        .all()
        .map((p) => ({ ...p, translations: translationsFor.all(p.id) }));
    },
    create(data, adminId) {
      const r = db
        .prepare(
          'INSERT INTO poi (name, address, latitude, longitude, radius_m, priority, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(data.name, data.address ?? null, data.latitude, data.longitude, data.radius_m, data.priority, data.image_url ?? null, adminId ?? null);
      return Number(r.lastInsertRowid);
    },
    update(id, data) {
      db.prepare(
        "UPDATE poi SET name = ?, address = ?, latitude = ?, longitude = ?, radius_m = ?, priority = ?, image_url = ?, updated_at = datetime('now') WHERE id = ?",
      ).run(data.name, data.address ?? null, data.latitude, data.longitude, data.radius_m, data.priority, data.image_url ?? null, id);
    },
    delete(id) {
      return db.prepare('DELETE FROM poi WHERE id = ?').run(id).changes > 0;
    },
    touch(id) {
      db.prepare("UPDATE poi SET updated_at = datetime('now') WHERE id = ?").run(id);
    },
    count() {
      return db.prepare('SELECT COUNT(*) AS n FROM poi').get().n;
    },
  };
}
