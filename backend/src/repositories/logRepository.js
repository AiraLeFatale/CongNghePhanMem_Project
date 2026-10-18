export function createLogRepository(db) {
  return {
    insertUsage(rows) {
      const st = db.prepare(
        'INSERT INTO usage_log (poi_id, session_id, trigger_method, language_code, played_at, listen_seconds) VALUES (?, ?, ?, ?, ?, ?)',
      );
      for (const r of rows) st.run(r.poi_id, r.session_id, r.trigger_method, r.language_code, r.played_at, r.listen_seconds);
      return rows.length;
    },
    insertLocations(rows) {
      const st = db.prepare('INSERT INTO location_log (session_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, ?)');
      for (const r of rows) st.run(r.session_id, r.latitude, r.longitude, r.recorded_at);
      return rows.length;
    },
  };
}
