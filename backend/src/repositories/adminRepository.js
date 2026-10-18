export function createAdminRepository(db) {
  return {
    findByUsername(username) {
      return db.prepare('SELECT * FROM admin_user WHERE username = ?').get(username);
    },
    findById(id) {
      return db.prepare('SELECT id, username, full_name, created_at FROM admin_user WHERE id = ?').get(id);
    },
    create({ username, passwordHash, fullName }) {
      const r = db
        .prepare('INSERT INTO admin_user (username, password_hash, full_name) VALUES (?, ?, ?)')
        .run(username, passwordHash, fullName ?? null);
      return Number(r.lastInsertRowid);
    },
    updatePassword(id, passwordHash) {
      db.prepare('UPDATE admin_user SET password_hash = ? WHERE id = ?').run(passwordHash, id);
    },
  };
}
