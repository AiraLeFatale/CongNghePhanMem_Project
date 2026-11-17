import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';
import { createRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

/** Ghép 3 lớp: Repository (dữ liệu) → Service (nghiệp vụ) → Controller/Route (REST). */
export function createApp(db, { translator, tts, autopilot, rateLimits = true } = {}) {
  const repos = { ...createRepositories(db), db };
  const services = createServices(repos, { translator, tts, autopilot });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Máy chủ bản đồ cần biết trang gọi tới (header Referer); no-referrer mặc định của helmet làm bị chặn 403
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: {
        directives: {
          // Website công khai hiển thị nền bản đồ OpenStreetMap
          'img-src': ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org', 'https://cdn.vietqr.io'],
          'media-src': ["'self'", 'blob:'],
          // Chạy thử qua http trong mạng LAN: không ép trình duyệt đổi request sang https
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d', fallthrough: false }));
  app.use('/api', createRouter(services, { rateLimits }));
  serveWebsite(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, services, repos };
}

/**
 * Website công khai (web/dist): trang chủ, điểm thuyết minh, tour, hướng dẫn và trang /q/<mã>
 * mà mã QR trỏ tới. Là ứng dụng một trang nên mọi đường dẫn GET còn lại trả về index.html.
 */
function serveWebsite(app) {
  const cmsIndex = path.join(config.cmsDir, 'index.html');
  if (fs.existsSync(cmsIndex) && fs.readFileSync(cmsIndex, 'utf8').includes('/admin/assets/')) {
    app.use('/admin', express.static(config.cmsDir, { index: false, maxAge: '1h' }));
    app.get(/^\/admin(\/.*)?$/, (_req, res) => res.sendFile(cmsIndex));
  }
  const index = path.join(config.webDir, 'index.html');
  if (!fs.existsSync(index)) return;
  app.use(express.static(config.webDir, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/|uploads\/|admin(\/|$)).*/, (_req, res) => res.sendFile(index));
}
