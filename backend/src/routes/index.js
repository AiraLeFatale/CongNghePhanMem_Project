import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin } from '../middleware/auth.js';
import { audioUpload, imageUpload } from '../middleware/upload.js';
import { createPublicController } from '../controllers/publicController.js';
import { createAuthController } from '../controllers/authController.js';
import { createPoiController } from '../controllers/poiController.js';
import { createTourController } from '../controllers/tourController.js';
import { createAnalyticsController } from '../controllers/analyticsController.js';
import { createPaymentController } from '../controllers/paymentController.js';
import { createLiveController } from '../controllers/liveController.js';

export function createRouter(services, { rateLimits = true } = {}) {
  const r = Router();
  const pub = createPublicController(services);
  const auth = createAuthController(services);
  const poi = createPoiController(services);
  const tour = createTourController(services);
  const analytics = createAnalyticsController(services);
  const pay = createPaymentController(services);
  const live = createLiveController(services);
  const pass = (_req, _res, next) => next();
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
  // Nhịp tim "đang dùng" khoảng 15 giây/lần; giới hạn rộng vì nhiều máy có thể chung một IP (4G, Wi-Fi công cộng)
  const liveLimiter = rateLimits ? rateLimit({ windowMs: 60 * 1000, limit: 600 }) : pass;
  r.post('/live/ping', liveLimiter, live.ping);

  // Điểm có phí: tạo đơn VietQR, hỏi trạng thái, lấy nội dung đầy đủ; webhook ngân hàng tự xác nhận
  const orderLimiter = rateLimits ? rateLimit({ windowMs: 10 * 60 * 1000, limit: 30 }) : pass;
  r.post('/orders', orderLimiter, pay.create);
  r.get('/orders/:code', pay.status);
  r.post('/orders/:code/claim', orderLimiter, pay.claim);
  r.get('/pois/:id/full', pay.fullPoi);
  r.post('/payments/webhook', pay.webhook);

  // Đăng nhập CMS
  r.post('/auth/login', loginLimiter, auth.login);

  // CMS (cần đăng nhập)
  const admin = Router();
  admin.use(requireAdmin(services.auth));
  admin.get('/orders', pay.list);
  admin.get('/payments/transactions', pay.transactions);
  admin.post('/orders/:id/confirm', pay.confirm);
  admin.post('/orders/:id/cancel', pay.cancel);
  admin.get('/me', auth.me);
  admin.post('/me/password', auth.changePassword);

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
  admin.get('/live', live.snapshot);
  admin.get('/live/stream', live.stream);

  r.use('/admin', admin);
  return r;
}
