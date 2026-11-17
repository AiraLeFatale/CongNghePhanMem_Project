/**
 * Tạo giọng đọc cho mọi bản thuyết minh bằng dịch vụ TTS đang cấu hình (ElevenLabs nếu có key).
 *   npm run tts:all              tạo cho bản chưa có audio và bản đang dùng giọng máy cũ (TTS)
 *   npm run tts:all -- --missing chỉ tạo cho bản chưa có audio
 * Không đụng tới file thu âm do quản trị viên tự tải lên.
 */
import { config } from '../config.js';
import { openDatabase } from './database.js';
import { createRepositories } from '../repositories/index.js';
import { createServices } from '../services/index.js';
import { ensureUploadDir, saveBuffer } from '../middleware/upload.js';
import { hashText } from '../services/autopilotService.js';

const onlyMissing = process.argv.includes('--missing');
const db = openDatabase();
ensureUploadDir();
const repos = { ...createRepositories(db), db };
const s = createServices(repos);
console.log(`TTS: ${s.tts.provider}${config.ttsProvider === 'elevenlabs' ? ` (${config.elevenLabs.model})` : ''}`);

let done = 0;
let failed = 0;
for (const { id } of s.pois.list()) {
  const poi = s.pois.get(id);
  for (const t of poi.translations) {
    if (!t.narration_text?.trim() || t.audio_source === 'upload') continue;
    if (onlyMissing && t.audio_url) continue;
    try {
      const mp3 = await s.tts.synthesize(t.narration_text, t.language_code);
      s.pois.attachAudio(id, t.language_code, saveBuffer(mp3, '.mp3', 'tts'), 'tts');
      repos.translations.setAudioHash(id, t.language_code, hashText(t.narration_text));
      done++;
      console.log(`  ✓ ${poi.name} [${t.language_code}]`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${poi.name} [${t.language_code}]: ${err.message}`);
    }
  }
}
console.log(`Xong: ${done} bản đã tạo, ${failed} bản lỗi.`);
process.exit(failed ? 1 : 0);
