/**
 * Tầng repository: truy vấn bảng admin_user.
 * Chỉ chứa SQL thuần, không xử lý nghiệp vụ (băm mật khẩu, phát token... nằm ở authService).
 */

// Tạo repository quản trị viên gắn với connection db.
// Không trả password_hash ra ngoài ở findById để tránh lộ hash.
export function createAdminRepository(db) {
  return {
    // Tìm theo username, dùng khi đăng nhập (cần cả password_hash để so khớp).
    findByUsername(username) {
      return db.prepare('SELECT * FROM admin_user WHERE username = ?').get(username);
    },
    // Chỉ lấy các cột an toàn để trả về cho client.
    findById(id) {
      return db.prepare('SELECT id, username, full_name, created_at FROM admin_user WHERE id = ?').get(id);
    },
    // Tạo tài khoản quản trị; passwordHash do authService băm trước khi gọi.
    create({ username, passwordHash, fullName }) {
      // Repository không bao giờ nhận mật khẩu gốc, chỉ nhận hash.
      const r = db
        .prepare('INSERT INTO admin_user (username, password_hash, full_name) VALUES (?, ?, ?)')
        .run(username, passwordHash, fullName ?? null);
      return Number(r.lastInsertRowid);
    },
    // Ghi đè mật khẩu đã băm (dùng cho đổi mật khẩu trong CMS).
    updatePassword(id, passwordHash) {
      db.prepare('UPDATE admin_user SET password_hash = ? WHERE id = ?').run(passwordHash, id);
    },
  };
}
