/**
 * Tầng controller cho API công khai của app di động (không cần đăng nhập).
 * Gồm health-check, danh sách ngôn ngữ, đồng bộ nội dung, giải mã QR và ghi log sử dụng/vị trí.
 */
import { config } from '../config.js';
import { idParam } from '../utils/validate.js';

// Tạo nhóm handler public; mọi handler đều trả JSON trực tiếp từ service tương ứng.
// Ghi log (usage/locations) trả 201 vì tạo bản ghi mới.
export function createPublicController(s) {
  return {
    health: (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }),
    languages: (_req, res) => res.json({ default: config.defaultLanguage, languages: config.languages }),
    syncVersion: (_req, res) => res.json(s.sync.version()),
    // snapshot() trả toàn bộ POI/tour/bản dịch để app cache offline.
    sync: (_req, res) => res.json(s.sync.snapshot()),
    // payload QR trên URL được tra ra POI tương ứng (ném 404 nếu không có).
    resolveQr: (req, res) => res.json(s.qr.resolve(req.params.payload)),
    usage: (req, res) => res.status(201).json(s.logs.recordUsage(req.body)),
    locations: (req, res) => res.status(201).json(s.logs.recordLocations(req.body)),

    // Heartbeat đếm người đang dùng; web gửi mỗi 15 giây và không cần đọc phản hồi.
    ping: (req, res) => {
      s.live.ping(req.body);
      res.status(204).end();
    },
    // Nội dung đầy đủ của POI: 402 nếu có phí mà chưa thanh toán/chưa báo chuyển khoản.
    poiFull: (req, res) => res.json(s.orders.full(idParam(req.params.id), req.get('x-access-token'))),
    // Thanh toán VietQR: tạo đơn, hỏi trạng thái và báo đã chuyển khoản.
    createOrder: (req, res) => res.status(201).json(s.orders.create(idParam(req.body?.poi_id))),
    orderStatus: (req, res) => res.json(s.orders.status(req.params.code, req.get('x-order-token'))),
    claimOrder: (req, res) => res.json(s.orders.claim(req.params.code, req.get('x-order-token'))),
  };
}
