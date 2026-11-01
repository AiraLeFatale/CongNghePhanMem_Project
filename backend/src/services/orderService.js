/**
 * Tầng nghiệp vụ: đơn thanh toán VietQR cho điểm thuyết minh có phí.
 *
 * Luồng giống website đang chạy:
 *   1. Khách bấm "Nghe toàn bộ" → tạo đơn pending, nhận code + token + thông tin chuyển khoản.
 *   2. Khách chuyển khoản đúng nội dung là code, bấm "Tôi đã chuyển khoản" → claimed.
 *   3. Đơn đã claimed (hoặc đã paid) cho phép tải toàn bộ bài thuyết minh.
 *   4. Admin đối chiếu sao kê rồi xác nhận (paid) hoặc huỷ (cancelled, thu hồi quyền nghe).
 */
import crypto from 'node:crypto';
import { config } from '../config.js';
import { badRequest, conflict, notFound, paymentRequired } from '../utils/errors.js';

// Bỏ các ký tự dễ nhầm (I, O, 0, 1) để khách đọc/gõ nội dung chuyển khoản dễ hơn.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
  return `TM${s}`;
}

// Định dạng tiền theo kiểu Việt Nam: 5000 → "5.000đ".
export function formatVnd(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`;
}

// Bản trả cho khách khi tạo/tra cứu đơn: không bao giờ kèm token.
function publicOrder(o) {
  return {
    code: o.code,
    poi_id: o.poi_id,
    amount: o.amount,
    status: o.status,
    claimed: Boolean(o.claimed_at),
    created_at: o.created_at,
    paid_at: o.paid_at,
  };
}

// Bản trả cho CMS: kèm tên điểm và người xác nhận.
function adminOrder(o) {
  return {
    id: o.id,
    code: o.code,
    poi_id: o.poi_id,
    amount: o.amount,
    status: o.status,
    created_at: o.created_at,
    paid_at: o.paid_at,
    claimed_at: o.claimed_at,
    poi_name: o.poi_name,
    confirmed_by: o.confirmed_by,
  };
}

const sameToken = (a, b) => {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// Tạo service đơn hàng; chỉ cần 2 repository: POI (đọc giá) và payment_order.
export function createOrderService(repos) {
  const { pois, payments } = repos;

  // Thông tin ngân hàng trả cho khách để tạo VietQR; đổi tài khoản bằng biến PAYMENT_* trong .env.
  function bank() {
    return {
      bin: config.paymentBankBin,
      name: config.paymentBankName,
      account: config.paymentAccount,
      account_name: config.paymentAccountName,
    };
  }

  // Sinh code chưa tồn tại trong DB.
  function uniqueCode() {
    for (let i = 0; i < 20; i++) {
      const code = randomCode();
      if (!payments.findByCode(code)) return code;
    }
    throw new Error('Không sinh được mã đơn duy nhất');
  }

  // Đọc token từ header x-order-token; sai/thiếu đều coi như không tìm thấy đơn.
  function orderFor(code, token) {
    const o = payments.findByCode(String(code ?? '').trim());
    if (!o || !sameToken(o.token, token)) throw notFound('Không tìm thấy đơn thanh toán');
    return o;
  }

  return {
    /** POST /api/orders — tạo đơn cho một POI có phí. */
    create(poiId) {
      const poi = pois.findById(poiId);
      if (!poi) throw notFound('Không tìm thấy điểm thuyết minh');
      const price = Number(poi.price) || 0;
      if (price <= 0) throw badRequest('Điểm này miễn phí, không cần thanh toán');
      if (!config.paymentEnabled) throw badRequest('Máy chủ chưa cấu hình tài khoản nhận tiền (PAYMENT_ACCOUNT)');

      const code = uniqueCode();
      const token = crypto.randomBytes(24).toString('base64url');
      payments.create({ code, token, poi_id: poi.id, amount: price, transfer_note: code, bank: bank() });
      const o = payments.findByCode(code);
      // Chỉ lần tạo đơn mới trả token + thông tin chuyển khoản để trình duyệt lưu lại.
      return { ...publicOrder(o), token: o.token, bank: bank(), transfer_note: o.transfer_note };
    },

    /** GET /api/orders/:code — trình duyệt hỏi trạng thái để biết khi nào được mở khoá. */
    status(code, token) {
      return publicOrder(orderFor(code, token));
    },

    /** POST /api/orders/:code/claim — khách báo đã chuyển khoản, mở quyền nghe ngay. */
    claim(code, token) {
      const o = orderFor(code, token);
      if (o.status === 'cancelled') throw conflict('Đơn đã bị huỷ, vui lòng tạo đơn mới');
      return publicOrder(payments.markClaimed(o.code));
    },

    /** GET /api/pois/:id/full — nội dung đầy đủ, chỉ trả khi miễn phí hoặc đã có quyền. */
    full(poiId, rawTokens) {
      const poi = pois.findById(poiId);
      if (!poi) throw notFound('Không tìm thấy điểm thuyết minh');
      const price = Number(poi.price) || 0;
      const tokens = String(rawTokens ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const allowed = price <= 0 || payments.hasAccess(poi.id, tokens);
      if (!allowed) throw paymentRequired(`Điểm này cần thanh toán ${formatVnd(price)} để nghe toàn bộ`);
      // locked=false để trình duyệt bỏ lớp paywall sau khi mở khoá.
      return { ...poi, locked: false };
    },

    /** GET /api/admin/orders?status=... */
    list(status) {
      return {
        enabled: config.paymentEnabled,
        totals: payments.totals(),
        items: payments.list({ status }).map(adminOrder),
      };
    },

    /** POST /api/admin/orders/:id/confirm — xác nhận đã nhận tiền. */
    confirm(id, admin) {
      const o = payments.findById(id);
      if (!o) throw notFound('Không tìm thấy đơn thanh toán');
      if (o.status !== 'pending') throw conflict('Đơn đã được xử lý');
      payments.markPaid(id, admin?.username ?? 'admin');
      return adminOrder(payments.adminById(id));
    },

    /** POST /api/admin/orders/:id/cancel — huỷ đơn và thu hồi quyền nghe. */
    cancel(id) {
      const o = payments.findById(id);
      if (!o) throw notFound('Không tìm thấy đơn thanh toán');
      if (o.status !== 'pending') throw conflict('Đơn đã được xử lý');
      payments.markCancelled(id);
      return adminOrder(payments.adminById(id));
    },
  };
}
