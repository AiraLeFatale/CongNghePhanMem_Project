/**
 * Truy vấn thống kê. Điều kiện lọc: khoảng ngày (theo played_at/recorded_at, dạng ISO) và tour (lọc theo POI thuộc tour).
 * Bản ghi vị trí không gắn với POI nên lọc tour cho heatmap dùng khung bao quanh các POI của tour.
 */
// Tạo repository thống kê; mọi hàm nhận bộ lọc f = { from, to, tourId/bbox } đã chuẩn hoá.
export function createAnalyticsRepository(db) {
  // Dựng mệnh đề WHERE động cho usage_log: lọc theo thời gian và/hoặc POI thuộc tour.
  // Trả về { sql, params } để tránh lặp code ở từng truy vấn thống kê.
  function usageWhere({ from, to, tourId }) {
    const clauses = [];
    const params = [];
    if (from) { clauses.push('u.played_at >= ?'); params.push(from); }
    if (to) { clauses.push('u.played_at < ?'); params.push(to); }
    if (tourId) { clauses.push('u.poi_id IN (SELECT poi_id FROM tour_poi WHERE tour_id = ?)'); params.push(tourId); }
    return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  }

  return {
    // Tổng quan: số lượt nghe, số phiên, thời lượng nghe trung bình và tổng.
    summary(f) {
      const w = usageWhere(f);
      return db
        .prepare(
          `SELECT COUNT(*) AS plays, COUNT(DISTINCT u.session_id) AS sessions,
                  COALESCE(ROUND(AVG(u.listen_seconds), 1), 0) AS avg_listen_seconds,
                  COALESCE(SUM(u.listen_seconds), 0) AS total_listen_seconds
           FROM usage_log u ${w.sql}`,
        )
        .get(...w.params);
    },
    // Phân bố lượt nghe theo cách kích hoạt (geofence/qr/manual).
    byMethod(f) {
      const w = usageWhere(f);
      return db.prepare(`SELECT u.trigger_method AS method, COUNT(*) AS plays FROM usage_log u ${w.sql} GROUP BY u.trigger_method`).all(...w.params);
    },
    // Phân bố lượt nghe theo ngôn ngữ, giảm dần để biết ngôn ngữ phổ biến.
    byLanguage(f) {
      const w = usageWhere(f);
      return db
        .prepare(`SELECT u.language_code AS language, COUNT(*) AS plays FROM usage_log u ${w.sql} GROUP BY u.language_code ORDER BY plays DESC`)
        .all(...w.params);
    },
    // Thống kê chi tiết từng POI (kèm toạ độ để vẽ bản đồ nhiệt).
    perPoi(f) {
      const w = usageWhere(f);
      return db
        .prepare(
          `SELECT p.id AS poi_id, p.name, p.latitude, p.longitude, COUNT(*) AS plays,
                  ROUND(AVG(u.listen_seconds), 1) AS avg_listen_seconds,
                  COUNT(DISTINCT u.session_id) AS sessions
           FROM usage_log u JOIN poi p ON p.id = u.poi_id ${w.sql}
           GROUP BY p.id ORDER BY plays DESC`,
        )
        .all(...w.params);
    },
    // Chuỗi lượt nghe theo từng ngày (10 ký tự đầu của ISO timestamp).
    daily(f) {
      const w = usageWhere(f);
      return db
        .prepare(`SELECT substr(u.played_at, 1, 10) AS date, COUNT(*) AS plays FROM usage_log u ${w.sql} GROUP BY date ORDER BY date`)
        .all(...w.params);
    },
    // Phân bố lượt nghe theo giờ trong ngày (ký tự 12-13 của ISO timestamp).
    hourly(f) {
      const w = usageWhere(f);
      return db
        .prepare(`SELECT CAST(substr(u.played_at, 12, 2) AS INTEGER) AS hour, COUNT(*) AS plays FROM usage_log u ${w.sql} GROUP BY hour ORDER BY hour`)
        .all(...w.params);
    },
    // Bản đồ nhiệt từ location_log; lọc thêm theo khung bao (bbox) nếu có.
    heatmap({ from, to, bbox }) {
      const clauses = [];
      const params = [];
      if (from) { clauses.push('recorded_at >= ?'); params.push(from); }
      if (to) { clauses.push('recorded_at < ?'); params.push(to); }
      if (bbox) {
        clauses.push('latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?');
        params.push(bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      // Gộp theo ô ~11 m (4 chữ số thập phân) để giảm điểm và không lộ đường đi chính xác.
      return db
        .prepare(
          `SELECT ROUND(latitude, 4) AS lat, ROUND(longitude, 4) AS lng, COUNT(*) AS weight
           FROM location_log ${where} GROUP BY lat, lng ORDER BY weight DESC LIMIT 5000`,
        )
        .all(...params);
    },
    // Lấy tối đa `limit` phiên có >= 2 điểm, mỗi phiên trả chuỗi toạ độ theo thời gian.
    routes({ from, to, bbox, limit = 30 }) {
      const clauses = [];
      const params = [];
      if (from) { clauses.push('recorded_at >= ?'); params.push(from); }
      if (to) { clauses.push('recorded_at < ?'); params.push(to); }
      if (bbox) {
        clauses.push('latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?');
        params.push(bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      // Chọn các phiên gần nhất có ít nhất 2 điểm để vẽ thành tuyến.
      const sessions = db
        .prepare(`SELECT session_id FROM location_log ${where} GROUP BY session_id HAVING COUNT(*) >= 2 ORDER BY MAX(recorded_at) DESC LIMIT ?`)
        .all(...params, limit)
        .map((r) => r.session_id);
      const pts = db.prepare(
        `SELECT ROUND(latitude, 4) AS lat, ROUND(longitude, 4) AS lng FROM location_log ${where ? `${where} AND` : 'WHERE'} session_id = ? ORDER BY recorded_at`,
      );
      // Trả về tuyến đường theo số thứ tự, không trả session_id ra ngoài.
      return sessions.map((s, i) => ({ route: i + 1, points: pts.all(...params, s).map((p) => [p.lat, p.lng]) }));
    },
  };
}
