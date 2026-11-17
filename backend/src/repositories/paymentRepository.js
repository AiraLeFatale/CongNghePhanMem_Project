export function createPaymentRepository(db) {
  const SELECT = `SELECT o.id, o.code, o.poi_id, o.amount, o.status, o.created_at, o.paid_at, o.claimed_at, p.name AS poi_name, a.username AS confirmed_by
    FROM payment_order o JOIN poi p ON p.id = o.poi_id LEFT JOIN admin_user a ON a.id = o.confirmed_by`;
  return {
    create({ code, token, poiId, amount }) {
      const r = db.prepare('INSERT INTO payment_order (code, token, poi_id, amount) VALUES (?, ?, ?, ?)').run(code, token, poiId, amount);
      return Number(r.lastInsertRowid);
    },
    findById(id) {
      return db.prepare(`${SELECT} WHERE o.id = ?`).get(id);
    },
    findByCode(code) {
      return db.prepare('SELECT * FROM payment_order WHERE code = ?').get(code);
    },
    list(status) {
      if (status === 'claimed') return db.prepare(`${SELECT} WHERE o.status = 'pending' AND o.claimed_at IS NOT NULL ORDER BY o.id DESC LIMIT 500`).all();
      return status ? db.prepare(`${SELECT} WHERE o.status = ? ORDER BY o.id DESC LIMIT 500`).all(status) : db.prepare(`${SELECT} ORDER BY o.id DESC LIMIT 500`).all();
    },
    claim(id) {
      db.prepare("UPDATE payment_order SET claimed_at = COALESCE(claimed_at, datetime('now')) WHERE id = ? AND status = 'pending'").run(id);
    },
    claimedCount() {
      return db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS amount FROM payment_order WHERE status = 'pending' AND claimed_at IS NOT NULL").get();
    },
    totals() {
      return db.prepare("SELECT status, COUNT(*) AS n, COALESCE(SUM(amount), 0) AS amount FROM payment_order GROUP BY status").all();
    },
    setStatus(id, status, adminId) {
      return (
        db
          .prepare(`UPDATE payment_order SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END, confirmed_by = ? WHERE id = ?`)
          .run(status, status, adminId ?? null, id).changes > 0
      );
    },
    findPendingByCode(code) {
      return db.prepare("SELECT * FROM payment_order WHERE code = ?").get(code);
    },
    /** Ghi giao dịch; trả false nếu giao dịch này đã nhận trước đó. */
    recordTxn({ provider, txnId, amount, content, orderId, note }) {
      const r = db
        .prepare('INSERT OR IGNORE INTO payment_txn (provider, txn_id, amount, content, order_id, note) VALUES (?, ?, ?, ?, ?, ?)')
        .run(provider, txnId, amount, content ?? null, orderId ?? null, note ?? null);
      return r.changes > 0;
    },
    recentTxns() {
      return db.prepare('SELECT t.*, o.code FROM payment_txn t LEFT JOIN payment_order o ON o.id = t.order_id ORDER BY t.id DESC LIMIT 100').all();
    },
    /** POI mà các token này đã trả tiền. */
    paidPoiIds(tokens) {
      if (!tokens.length) return [];
      const marks = tokens.map(() => '?').join(',');
      // Đã nhận tiền, hoặc khách đã báo chuyển khoản và quản trị viên chưa huỷ
      return db
        .prepare(`SELECT DISTINCT poi_id FROM payment_order WHERE (status = 'paid' OR (status = 'pending' AND claimed_at IS NOT NULL)) AND token IN (${marks})`)
        .all(...tokens)
        .map((r) => r.poi_id);
    },
  };
}
