import crypto from 'node:crypto';
import { config } from '../config.js';
import { badRequest, notFound, AppError } from '../utils/errors.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I, O, 0, 1 dễ nhầm khi gõ nội dung chuyển khoản

function newCode() {
  const bytes = crypto.randomBytes(6);
  return 'TM' + [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

/** Đoạn nghe thử cho điểm có phí: câu đầu tiên, tối đa ~180 ký tự. */
export function previewText(text) {
  const t = String(text ?? '').trim();
  // Câu đầu: dấu . ! ? theo sau là khoảng trắng/hết bài, hoặc dấu câu Trung/Nhật (viết liền, không có khoảng trắng)
  const first = t.match(/^[\s\S]*?(?:[.!?](?=\s|$)|[。！？])/)?.[0] ?? t;
  const cut = first.length > 180 ? `${first.slice(0, 177).trimEnd()}…` : first;
  return cut.length < t.length ? cut : t;
}

/** Ẩn nội dung đầy đủ + audio của điểm có phí, chỉ để lại đoạn nghe thử. */
export function lockPoi(poi, unlocked = false) {
  const price = poi.price ?? 0;
  if (!price || unlocked) return { ...poi, price, locked: false };
  return {
    ...poi,
    price,
    locked: true,
    translations: poi.translations.map((t) => ({ ...t, narration_text: previewText(t.narration_text), audio_url: null, audio_source: null })),
  };
}

export function parseTokens(header) {
  return String(header ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9_-]{20,64}$/.test(s))
    .slice(0, 50);
}

export function createPaymentService(repos) {
  const { payments, pois } = repos;
  const bank = () => {
    const p = config.payment;
    if (!p.account) throw new AppError(503, 'PAYMENT_DISABLED', 'Hệ thống chưa bật thanh toán');
    return { bin: p.bankBin, name: p.bankName, account: p.account, account_name: p.accountName };
  };
  const view = (o) => ({ code: o.code, poi_id: o.poi_id, amount: o.amount, status: o.status, claimed: !!o.claimed_at, created_at: o.created_at, paid_at: o.paid_at });
  const own = (code, token) => {
    const o = payments.findByCode(String(code ?? '').toUpperCase());
    if (!o || o.token !== token) throw notFound('Không tìm thấy đơn thanh toán');
    return o;
  };

  return {
    enabled: () => !!config.payment.account,
    create(body) {
      const poiId = Number(body?.poi_id);
      const poi = Number.isInteger(poiId) ? pois.findById(poiId) : null;
      if (!poi) throw notFound('Không tìm thấy điểm thuyết minh');
      if (!poi.price) throw badRequest('Điểm này miễn phí, không cần thanh toán');
      const info = bank();
      const token = crypto.randomBytes(24).toString('base64url');
      let code = newCode();
      while (payments.findByCode(code)) code = newCode();
      payments.create({ code, token, poiId, amount: poi.price });
      return { ...view(payments.findByCode(code)), token, bank: info, transfer_note: code };
    },
    status: (code, token) => view(own(code, token)),
    /** Khách báo đã chuyển khoản: mở khoá ngay; đơn chờ quản trị viên đối chiếu sao kê. */
    claim(code, token) {
      const o = own(code, token);
      if (o.status === 'cancelled') throw badRequest('Đơn đã bị huỷ, vui lòng tạo đơn mới');
      payments.claim(o.id);
      return view(payments.findByCode(o.code));
    },
    /** Nội dung đầy đủ của một điểm nếu miễn phí hoặc khách đã trả tiền. */
    fullPoi(id, tokens) {
      const poi = pois.findById(id);
      if (!poi) throw notFound('Không tìm thấy điểm thuyết minh');
      if (poi.price && !payments.paidPoiIds(tokens).includes(id)) {
        throw new AppError(402, 'PAYMENT_REQUIRED', `Điểm này cần thanh toán ${poi.price.toLocaleString('vi-VN')}đ để nghe toàn bộ`);
      }
      return lockPoi(poi, true);
    },
    /**
     * Webhook báo tiền về tài khoản. Nhận cả định dạng SePay (một giao dịch) và Casso ({ data: [...] }).
     * Nội dung chuyển khoản chứa mã đơn TMxxxxxx và số tiền đủ thì đơn chuyển sang đã thanh toán ngay.
     */
    webhook(headers, body) {
      const key = config.payment.webhookKey;
      const auth = String(headers.authorization ?? '').replace(/^Apikey\s+/i, '').trim();
      const casso = String(headers['secure-token'] ?? '').trim();
      if (!key || (auth !== key && casso !== key)) throw new AppError(401, 'UNAUTHORIZED', 'Sai khoá webhook');
      const items = Array.isArray(body?.data) ? body.data.map((d) => ({ provider: 'casso', ...d })) : [{ provider: 'sepay', ...body }];
      const results = [];
      for (const it of items) {
        const amount = Math.round(Number(it.transferAmount ?? it.amount ?? 0));
        const content = String(it.content ?? it.description ?? '');
        const txnId = String(it.id ?? it.tid ?? it.referenceCode ?? '');
        if (!txnId) continue;
        if (it.transferType && it.transferType !== 'in') continue;
        const code = content.toUpperCase().replace(/\s+/g, '').match(/TM[A-HJ-NP-Z2-9]{6}/)?.[0];
        const order = code ? payments.findByCode(code) : null;
        let note = 'không tìm thấy mã đơn';
        if (order && order.status === 'paid') note = 'đơn đã thanh toán trước đó';
        else if (order && amount < order.amount) note = `thiếu tiền (cần ${order.amount})`;
        else if (order) note = 'khớp';
        const fresh = payments.recordTxn({ provider: it.provider, txnId, amount, content, orderId: order?.id, note });
        if (fresh && note === 'khớp') payments.setStatus(order.id, 'paid', null);
        results.push({ txn: txnId, code: code ?? null, result: fresh ? note : 'đã nhận trước đó' });
      }
      return { success: true, results };
    },
    transactions: () => payments.recentTxns(),
    list(status) {
      if (status && !['pending', 'paid', 'cancelled', 'claimed'].includes(status)) throw badRequest('Trạng thái không hợp lệ');
      const totals = Object.fromEntries(payments.totals().map((t) => [t.status, { count: t.n, amount: t.amount }]));
      const c = payments.claimedCount();
      totals.claimed = { count: c.n, amount: c.amount };
      return { items: payments.list(status), totals, enabled: !!config.payment.account };
    },
    setStatus(id, status, adminId) {
      const o = payments.findById(id);
      if (!o) throw notFound('Không tìm thấy đơn thanh toán');
      if (o.status === status) return o;
      payments.setStatus(id, status, adminId);
      return payments.findById(id);
    },
  };
}
