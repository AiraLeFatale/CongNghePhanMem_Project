/**
 * Tầng repository: đơn thanh toán cho điểm thuyết minh có phí.
 * Mỗi đơn có code ngắn (nội dung chuyển khoản) và token bí mật để khách tra cứu đơn.
 */
export function createPaymentRepository(db) {
  const adminSelect = `
    SELECT o.id, o.code, o.poi_id, o.amount, o.status, o.created_at, o.paid_at,
           o.claimed_at, o.confirmed_by, p.name AS poi_name
    FROM payment_order o JOIN poi p ON p.id = o.poi_id`;

  return {
    // Ghi đơn mới ở trạng thái 'pending'; trả id để service đọc lại đơn vừa tạo.
    create({ code, token, poi_id, amount, transfer_note, bank }) {
      const r = db
        .prepare(
          `INSERT INTO payment_order
             (code, token, poi_id, amount, status, transfer_note, bank_bin, bank_name, bank_account, bank_account_name)
           VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        )
        .run(code, token, poi_id, amount, transfer_note, bank?.bin ?? null, bank?.name ?? null, bank?.account ?? null, bank?.account_name ?? null);
      return Number(r.lastInsertRowid);
    },
    // Tra đơn theo mã khách đọc trên màn thanh toán (kèm token để service so khớp).
    findByCode(code) {
      return db.prepare('SELECT * FROM payment_order WHERE code = ?').get(code);
    },
    // Tra đơn theo id nội bộ, dùng cho thao tác xác nhận/huỷ của CMS.
    findById(id) {
      return db.prepare('SELECT * FROM payment_order WHERE id = ?').get(id);
    },
    /** Khách bấm "Tôi đã chuyển khoản": chỉ ghi nhận lần đầu, không đổi trạng thái. */
    markClaimed(code) {
      db.prepare("UPDATE payment_order SET claimed_at = COALESCE(claimed_at, datetime('now')) WHERE code = ? AND status = 'pending'").run(code);
      return this.findByCode(code);
    },
    // CMS xác nhận đã nhận tiền: chỉ đơn 'pending' mới chuyển được sang 'paid'.
    markPaid(id, confirmedBy) {
      db.prepare(
        "UPDATE payment_order SET status = 'paid', paid_at = COALESCE(paid_at, datetime('now')), confirmed_by = ? WHERE id = ? AND status = 'pending'",
      ).run(confirmedBy ?? null, id);
      return this.findById(id);
    },
    // Huỷ đơn pending: token của đơn 'cancelled' không còn quyền nghe (xem hasAccess).
    markCancelled(id) {
      db.prepare("UPDATE payment_order SET status = 'cancelled' WHERE id = ? AND status = 'pending'").run(id);
      return this.findById(id);
    },
    /** Token có quyền nghe đầy đủ POI này không (đã thanh toán hoặc đã báo chuyển khoản). */
    hasAccess(poiId, tokens) {
      const list = [...new Set(tokens.filter(Boolean))];
      if (!list.length) return false;
      const marks = list.map(() => '?').join(',');
      const row = db
        .prepare(
          `SELECT 1 AS ok FROM payment_order
           WHERE poi_id = ? AND token IN (${marks})
             AND (status = 'paid' OR (status = 'pending' AND claimed_at IS NOT NULL))
           LIMIT 1`,
        )
        .get(poiId, ...list);
      return Boolean(row);
    },
    /** Danh sách đơn cho CMS, lọc theo tab trạng thái. */
    list({ status } = {}) {
      const where =
        status === 'claimed'
          ? "WHERE o.status = 'pending' AND o.claimed_at IS NOT NULL"
          : status === 'pending' || status === 'paid' || status === 'cancelled'
            ? 'WHERE o.status = ?'
            : '';
      const sql = `${adminSelect} ${where} ORDER BY o.created_at DESC, o.id DESC`;
      return status === 'pending' || status === 'paid' || status === 'cancelled' ? db.prepare(sql).all(status) : db.prepare(sql).all();
    },
    // Một đơn kèm tên POI để CMS trả về ngay sau khi xác nhận hoặc huỷ.
    adminById(id) {
      return db.prepare(`${adminSelect} WHERE o.id = ?`).get(id);
    },
    /** Số liệu KPI trên đầu trang Thanh toán. */
    totals() {
      const rows = db.prepare('SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM payment_order GROUP BY status').all();
      const claimed = db
        .prepare(
          "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM payment_order WHERE status = 'pending' AND claimed_at IS NOT NULL",
        )
        .get();
      const of = (status) => {
        const row = rows.find((r) => r.status === status);
        return { count: row?.count ?? 0, amount: row?.amount ?? 0 };
      };
      return {
        paid: of('paid'),
        pending: of('pending'),
        claimed: { count: claimed.count, amount: claimed.amount },
      };
    },
  };
}
