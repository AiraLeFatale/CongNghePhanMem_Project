export function createTourRepository(db) {
  const poisOf = db.prepare(
    `SELECT p.id, p.name, p.latitude, p.longitude, tp.visit_order
     FROM tour_poi tp JOIN poi p ON p.id = tp.poi_id WHERE tp.tour_id = ? ORDER BY tp.visit_order`,
  );
  return {
    list() {
      return db
        .prepare(
          `SELECT t.id, t.name, t.description, t.created_at, t.updated_at, COUNT(tp.poi_id) AS poi_count
           FROM tour t LEFT JOIN tour_poi tp ON tp.tour_id = t.id GROUP BY t.id ORDER BY t.name`,
        )
        .all();
    },
    listWithPois() {
      return db
        .prepare('SELECT id, name, description, updated_at FROM tour ORDER BY name')
        .all()
        .map((t) => ({ ...t, poi_ids: poisOf.all(t.id).map((p) => p.id) }));
    },
    findById(id) {
      const tour = db.prepare('SELECT id, name, description, created_at, updated_at FROM tour WHERE id = ?').get(id);
      if (!tour) return null;
      return { ...tour, pois: poisOf.all(id) };
    },
    create({ name, description }, adminId) {
      const r = db.prepare('INSERT INTO tour (name, description, created_by) VALUES (?, ?, ?)').run(name, description ?? null, adminId ?? null);
      return Number(r.lastInsertRowid);
    },
    update(id, { name, description }) {
      db.prepare("UPDATE tour SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?").run(name, description ?? null, id);
    },
    setPois(id, poiIds) {
      db.prepare('DELETE FROM tour_poi WHERE tour_id = ?').run(id);
      const ins = db.prepare('INSERT INTO tour_poi (tour_id, poi_id, visit_order) VALUES (?, ?, ?)');
      poiIds.forEach((poiId, i) => ins.run(id, poiId, i + 1));
    },
    delete(id) {
      return db.prepare('DELETE FROM tour WHERE id = ?').run(id).changes > 0;
    },
    poiIdsOf(id) {
      return poisOf.all(id).map((p) => p.id);
    },
  };
}
