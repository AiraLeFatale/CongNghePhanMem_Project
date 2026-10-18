import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin } from '../middleware/auth.js';
import { audioUpload, imageUpload } from '../middleware/upload.js';
import { createPublicController } from '../controllers/publicController.js';
import { createAuthController } from '../controllers/authController.js';
import { createPoiController } from '../controllers/poiController.js';
import { createTourController } from '../controllers/tourController.js';
import { createAnalyticsController } from '../controllers/analyticsController.js';

export function createRouter(services, { rateLimits = true } = {}) {
  const r = Router();
  const pub = createPublicController(services);
  const auth = createAuthController(services);
  const poi = createPoiController(services);
  const tour = createTourController(services);
  const analytics = createAnalyticsController(services);
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

  // Đăng nhập CMS
  r.post('/auth/login', loginLimiter, auth.login);

  // CMS (cần đăng nhập)
  const admin = Router();
  admin.use(requireAdmin(services.auth));
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
