/**
 * Tầng khởi tạo ứng dụng Express.
 * Ghép ba lớp Repository (truy cập dữ liệu) → Service (nghiệp vụ) → Controller/Route (REST),
 * đồng thời gắn các middleware bảo mật, parse JSON, phục vụ file tĩnh và xử lý lỗi tập trung.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';
import { createRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

/** Ghép 3 lớp: Repository (dữ liệu) → Service (nghiệp vụ) → Controller/Route (REST). */
// Tham số: db là kết nối SQLite đã mở; translator/tts cho phép inject bản giả lập khi test.
// Trả về { app, services, repos } để server chạy hoặc test tái sử dụng.
export function createApp(db, { translator, tts, rateLimits = true } = {}) {
  // Gắn thêm db vào repos để service nào cần transaction/SQL trực tiếp vẫn dùng được.
  const repos = { ...createRepositories(db), db };
  const services = createServices(repos, { translator, tts });

  const app = express();
  // Tắt header X-Powered-By để không lộ công nghệ; tin 1 lớp proxy để lấy đúng IP client.
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  // Chuyển hướng HTTP → HTTPS cho tên miền công khai (đặt PUBLIC_HOST trong .env).
  // Nhờ vậy khách gõ "cnpm.dpdns.org" vẫn vào bản https, và mã QR in ra luôn là https.
  // Chỉ áp dụng khi request đi qua proxy (Cloudflare gắn header x-forwarded-proto=http),
  // nên chạy localhost bằng http vẫn bình thường.
  app.use((req, res, next) => {
    if (!config.publicHost) return next();
    if (req.get('x-forwarded-proto') !== 'http') return next();
    if (!String(req.headers.host ?? '').toLowerCase().includes(config.publicHost)) return next();
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));
  // File audio/ảnh đã upload được phục vụ công khai, cache 7 ngày; thiếu file thì trả 404.
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d', fallthrough: false }));
  app.use('/api', createRouter(services, { rateLimits }));
  // Bản build website + CMS được phục vụ cùng origin, giống bản deploy thật.
  serveWebsite(app);
  // Hai middleware cuối: bắt route không tồn tại rồi mới tới xử lý lỗi chung.
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, services, repos };
}

// Phục vụ web/ (website) và web/admin/ (CMS). API/uploads đã được xử lý phía trên.
// Mọi đường dẫn không có phần mở rộng được trả index.html để React Router tự điều hướng.
function serveWebsite(app) {
  if (!fs.existsSync(config.webDir)) return;
  app.use(express.static(config.webDir, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const p = req.path;
    // Không nuốt API, file upload, asset tĩnh hoặc file có phần mở rộng.
    if (p === '/api' || p.startsWith('/api/')) return next();
    if (p.startsWith('/uploads/')) return next();
    if (p.startsWith('/assets/') || p.startsWith('/admin/assets/') || p.startsWith('/images/')) return next();
    if (path.extname(p)) return next();
    const admin = p === '/admin' || p.startsWith('/admin/');
    const file = path.join(config.webDir, admin ? 'admin/index.html' : 'index.html');
    if (!fs.existsSync(file)) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(file);
  });
}
