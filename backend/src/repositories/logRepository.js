/**
 * Tầng repository: ghi log sử dụng (usage_log) và log vị trí (location_log).
 * Dùng prepared statement + vòng lặp để chèn nhiều dòng trong một lần gọi.
 */

// Tạo repository log; các hàm trả về số dòng đã chèn để controller/service báo lại.
export function createLogRepository(db) {
  return {
    // Chèn danh sách lượt nghe; mỗi phần tử cần đủ 6 trường theo schema usage_log.
    insertUsage(rows) {
      const st = db.prepare(
        'INSERT INTO usage_log (poi_id, session_id, trigger_method, language_code, played_at, listen_seconds) VALUES (?, ?, ?, ?, ?, ?)',
      );
      for (const r of rows) st.run(r.poi_id, r.session_id, r.trigger_method, r.language_code, r.played_at, r.listen_seconds);
      return rows.length;
    },
    // Chèn danh sách điểm GPS thô do app gửi lên (đã validate ở service).
    insertLocations(rows) {
      const st = db.prepare('INSERT INTO location_log (session_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, ?)');
      for (const r of rows) st.run(r.session_id, r.latitude, r.longitude, r.recorded_at);
      return rows.length;
    },
  };
}
