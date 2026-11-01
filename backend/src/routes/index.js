/**
 * Tầng route: khai báo toàn bộ endpoint REST dưới tiền tố /api.
 * Chia hai nhóm: API công khai cho app di động (không đăng nhập) và API CMS (bắt buộc Bearer token),
 * kèm rate-limit cho đăng nhập và ghi log.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin } from '../middleware/auth.js';
import { audioUpload, imageUpload } from '../middleware/upload.js';
import { createPublicController } from '../controllers/publicController.js';
import { createAuthController } from '../controllers/authController.js';
import { createPoiController } from '../controllers/poiController.js';
import { createTourController } from '../controllers/tourController.js';
import { createAnalyticsController } from '../controllers/analyticsController.js';
import { createOrderController } from '../controllers/orderController.js';
import { createLiveController } from '../controllers/liveController.js';

// Khởi tạo router, gắn controller với service và cấu hình rate-limit (tắt được khi test).
// Trả về Router đã mount sẵn các route public + /admin.
export function createRouter(services, { rateLimits = true } = {}) {
  const r = Router();
  // Mỗi controller nhận cùng bộ services; đây là điểm nối route → nghiệp vụ.
  const pub = createPublicController(services);
  const auth = createAuthController(services);
  const poi = createPoiController(services);
  const tour = createTourController(services);
  const analytics = createAnalyticsController(services);
  const order = createOrderController(services);
  const live = createLiveController(services);
  const pass = (_req, _res, next) => next();
  // Chống brute-force đăng nhập (20 lần / 15 phút) và chống spam ghi log (120 lần/phút).
  const loginLimiter = rateLimits
    ? rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { error: { code: 'RATE_LIMIT', message: 'Đăng nhập sai quá nhiều lần, thử lại sau 15 phút' } } })
    : pass;
  const logLimiter = rateLimits ? rateLimit({ windowMs: 60 * 1000, limit: 120 }) : pass;

  // App di động (công khai, ẩn danh)
  r.get('/health', pub.health);
  r.get('/languages', pub.languages);
  r.get('/sync/version', pub.syncVersion);
  r.get('/sync', pub.sync);
  r.get('/qr/:payload', pub.resolveQr);
  r.post('/logs/usage', logLimiter, pub.usage);
  r.post('/logs/location', logLimiter, pub.locations);
  // Đếm người đang dùng + tải bài đầy đủ + thanh toán VietQR của website công khai.
  r.post('/live/ping', logLimiter, pub.ping);
  r.get('/pois/:id/full', pub.poiFull);
  r.post('/orders', logLimiter, pub.createOrder);
  r.get('/orders/:code', pub.orderStatus);
  r.post('/orders/:code/claim', logLimiter, pub.claimOrder);

  // Đăng nhập CMS
  r.post('/auth/login', loginLimiter, auth.login);

  // CMS (cần đăng nhập)
  const admin = Router();
  // Một lần gắn middleware auth cho toàn bộ router con /admin.
  admin.use(requireAdmin(services.auth));
  admin.get('/me', auth.me);
  admin.post('/me/password', auth.changePassword);

  // Live counter: JSON cho polling dự phòng và SSE cho panel thời gian thực.
  admin.get('/live', live.snapshot);
  admin.get('/live/stream', live.stream);

  // Đơn thanh toán: lọc theo tab và xác nhận/huỷ.
  admin.get('/orders', order.list);
  admin.post('/orders/:id/confirm', order.confirm);
  admin.post('/orders/:id/cancel', order.cancel);

  admin.get('/pois', poi.list);
  admin.post('/pois', poi.create);
  admin.get('/pois/:id', poi.get);
  admin.put('/pois/:id', poi.update);
  admin.delete('/pois/:id', poi.remove);
  admin.post('/pois/:id/audio/:lang', audioUpload, poi.uploadAudio);
  admin.delete('/pois/:id/audio/:lang', poi.removeAudio);
  admin.post('/pois/:id/tts/:lang', poi.generateTts);
  admin.get('/pois/:id/auto', poi.autoStatus);
  admin.post('/pois/:id/auto', poi.autoRun);
  admin.get('/pois/:id/qrcodes', poi.listQr);
  admin.post('/pois/:id/qrcodes', poi.createQr);
  admin.get('/qrcodes', poi.listAllQr);
  admin.delete('/qrcodes/:id', poi.deleteQr);
  admin.post('/images', imageUpload, poi.uploadImage);
  admin.post('/translate', poi.translate);

  admin.get('/tours', tour.list);
  admin.post('/tours', tour.create);
  admin.get('/tours/:id', tour.get);
  admin.put('/tours/:id', tour.update);
  admin.delete('/tours/:id', tour.remove);

  admin.get('/analytics', analytics.report);

  r.use('/admin', admin);
  return r;
}
