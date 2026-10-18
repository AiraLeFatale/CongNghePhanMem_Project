import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  port: Number(process.env.PORT || 4000),
  dbFile: process.env.DB_FILE || path.join(root, 'data', 'narration.db'),
  uploadDir: process.env.UPLOAD_DIR || path.join(root, 'uploads'),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // google-free | libretranslate | none
  translateProvider: process.env.TRANSLATE_PROVIDER || 'google-free',
  libreTranslateUrl: process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com',
  libreTranslateKey: process.env.LIBRETRANSLATE_KEY || '',
  // google-free | none
  ttsProvider: process.env.TTS_PROVIDER || 'google-free',
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

export const languageCodes = config.languages.map((l) => l.code);
