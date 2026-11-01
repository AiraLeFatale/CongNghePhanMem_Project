/**
 * Tầng cấu hình dùng chung cho toàn backend.
 * Gom các biến môi trường (PORT, DB_FILE, UPLOAD_DIR, JWT_*, CORS_ORIGIN, TRANSLATE_*, TTS_*)
 * và hằng số nghiệp vụ (giới hạn dung lượng audio, ngôn ngữ hỗ trợ) vào một object duy nhất.
 * Mọi giá trị đều có mặc định để chạy được ngay ở máy local.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Thư mục gốc của backend (backend/), dùng làm gốc cho đường dẫn DB và uploads.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Đọc số từ biến môi trường, trả về mặc định khi giá trị không hợp lệ.
function numberEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

// Tài khoản nhận tiền demo (có thể đổi hoàn toàn bằng biến môi trường).
// Để trống PAYMENT_ACCOUNT='' nếu muốn tắt thanh toán trên bản local.
const paymentAccount = process.env.PAYMENT_ACCOUNT !== undefined ? process.env.PAYMENT_ACCOUNT : '1019518779';

// Cấu hình bất biến của ứng dụng; đọc từ process.env và fallback về giá trị dev.
export const config = {
  port: Number(process.env.PORT || 4000),
  dbFile: process.env.DB_FILE || path.join(root, 'data', 'narration.db'),
  uploadDir: process.env.UPLOAD_DIR || path.join(root, 'uploads'),
  // Bản build của website công khai (web/) và CMS (web/admin/) được phục vụ cùng backend.
  webDir: process.env.WEB_DIR || path.join(root, '..', 'web'),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Tên miền công khai (vd cnpm.dpdns.org). Có giá trị thì request http đi qua proxy
  // sẽ bị chuyển 301 sang https; để trống khi chỉ chạy localhost.
  publicHost: (process.env.PUBLIC_HOST || '').trim().toLowerCase(),
  // google-free | libretranslate | none
  translateProvider: process.env.TRANSLATE_PROVIDER || 'google-free',
  libreTranslateUrl: process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com',
  libreTranslateKey: process.env.LIBRETRANSLATE_KEY || '',
  // google-free | none
  ttsProvider: process.env.TTS_PROVIDER || 'google-free',
  // Thanh toán VietQR: thông tin ngân hàng hiển thị cho khách và dùng để tạo mã QR.
  paymentBankBin: process.env.PAYMENT_BANK_BIN || '970436',
  paymentBankName: process.env.PAYMENT_BANK_NAME || 'Vietcombank',
  paymentAccount,
  paymentAccountName: process.env.PAYMENT_ACCOUNT_NAME || 'PHAM VAN HUNG',
  paymentEnabled: Boolean(paymentAccount),
  // Live counter: hệ số nhân cho mục đích demo (1 = số thật, 2 = gấp đôi).
  liveDemoFactor: Math.max(0, numberEnv('LIVE_DEMO_FACTOR', 2)),
  // Một phiên bị coi là đã rời đi nếu quá TTL không gửi heartbeat (mili-giây).
  liveTtlMs: Math.max(5000, numberEnv('LIVE_TTL_MS', 45000)),
  liveSseIntervalMs: Math.max(1000, numberEnv('LIVE_SSE_INTERVAL_MS', 3000)),
  // Tự dịch + tạo TTS sau khi lưu POI (giống CMS đang chạy); tắt bằng AUTO_TRANSLATE_ON_SAVE=0.
  autoTranslateOnSave: process.env.AUTO_TRANSLATE_ON_SAVE !== '0',
  maxAudioBytes: 15 * 1024 * 1024,
  defaultLanguage: 'vi',
  languages: [
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
    { code: 'fr', name: 'Français' },
  ],
};

// Danh sách mã ngôn ngữ hợp lệ, dùng để validate đầu vào ở service/controller.
export const languageCodes = config.languages.map((l) => l.code);
