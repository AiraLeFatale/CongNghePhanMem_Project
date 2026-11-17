import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Địa chỉ IPv4 trong mạng LAN, để điện thoại cùng Wi-Fi mở được link trên mã QR khi chạy thử. */
function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return 'localhost';
}

const port = Number(process.env.PORT || 4000);

export const config = {
  port,
  // Gốc URL in trên mã QR: <publicUrl>/q/<mã>. Production đặt PUBLIC_URL=https://ten-mien.
  publicUrl: (process.env.PUBLIC_URL || `http://${lanAddress()}:${port}`).replace(/\/+$/, ''),
  // Bản build của website công khai (thư mục web/ ở gốc repo). Không có thì bỏ qua.
  webDir: process.env.WEB_DIR || path.join(root, '..', 'web', 'dist'),
  // Bản build CMS (build với CMS_BASE=/admin/), phục vụ ở /admin. Không có thì bỏ qua.
  cmsDir: process.env.CMS_DIR || path.join(root, '..', 'cms', 'dist'),
  dbFile: process.env.DB_FILE || path.join(root, 'data', 'narration.db'),
  uploadDir: process.env.UPLOAD_DIR || path.join(root, 'uploads'),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // google-free | libretranslate | none
  translateProvider: process.env.TRANSLATE_PROVIDER || 'google-free',
  libreTranslateUrl: process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com',
  libreTranslateKey: process.env.LIBRETRANSLATE_KEY || '',
  // Lưu điểm xong thì tự dịch + tạo giọng đọc chạy nền. AUTO_PROCESS=0 để tắt.
  autoProcess: process.env.AUTO_PROCESS !== '0',
  // elevenlabs | google-free | none. Có ELEVENLABS_API_KEY thì mặc định dùng ElevenLabs.
  ttsProvider: process.env.TTS_PROVIDER || (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'google-free'),
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    model: process.env.ELEVENLABS_MODEL || 'eleven_v3',
    // Giọng cho từng ngôn ngữ; đổi bằng ELEVENLABS_VOICES='{"vi":"<voice_id>",...}'
    voices: {
      vi: 'WSNBMAKh6ZaZ1l2XCiCV', // Ngọc Nhiên: nữ miền Nam, giọng kể ấm
      en: 'JBFqnCBsd6RMkjVDRZzb', // George: giọng kể chuyện
      zh: 'EXAVITQu4vr4xnSDxMaL', // Sarah
      ko: 'EXAVITQu4vr4xnSDxMaL', // Sarah
      ja: 'Xb7hH8MSUJpSbSDYk0k2', // Alice
      fr: 'XrExE9yKIg1WjnnlVkGX', // Matilda
      ...JSON.parse(process.env.ELEVENLABS_VOICES || '{}'),
    },
  },
  maxAudioBytes: 15 * 1024 * 1024,
  // Tài khoản nhận tiền cho điểm có phí (VietQR). Không đặt PAYMENT_ACCOUNT thì tắt thanh toán.
  payment: {
    bankBin: process.env.PAYMENT_BANK_BIN || '970436',
    bankName: process.env.PAYMENT_BANK_NAME || 'Vietcombank',
    account: process.env.PAYMENT_ACCOUNT || '',
    accountName: process.env.PAYMENT_ACCOUNT_NAME || '',
    // Khoá bí mật dịch vụ báo biến động số dư (SePay: "Apikey <khoá>", Casso: header secure-token)
    webhookKey: process.env.PAYMENT_WEBHOOK_KEY || '',
  },
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

export const languageCodes = config.languages.map((l) => l.code);
