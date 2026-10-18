export function createQrRepository(db) {
  return {
    listAll() {
      return db
        .prepare(
          'SELECT q.id, q.poi_id, q.payload, q.label, q.created_at, p.name AS poi_name FROM qr_code q JOIN poi p ON p.id = q.poi_id ORDER BY q.id DESC',
        )
        .all();
    },
    listForPoi(poiId) {
      return db.prepare('SELECT id, poi_id, payload, label, created_at FROM qr_code WHERE poi_id = ? ORDER BY id').all(poiId);
    },
    findByPayload(payload) {
      return db.prepare('SELECT * FROM qr_code WHERE payload = ?').get(payload);
    },
    findById(id) {
      return db.prepare('SELECT * FROM qr_code WHERE id = ?').get(id);
    },
    create(poiId, payload, label) {
      const r = db.prepare('INSERT INTO qr_code (poi_id, payload, label) VALUES (?, ?, ?)').run(poiId, payload, label ?? null);
      return Number(r.lastInsertRowid);
    },
    delete(id) {
      return db.prepare('DELETE FROM qr_code WHERE id = ?').run(id).changes > 0;
    },
  };
}
