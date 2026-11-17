import crypto from 'node:crypto';
import { config, languageCodes } from '../config.js';
import { saveBuffer } from '../middleware/upload.js';
import { splitText } from './ttsService.js';

export const hashText = (...parts) => crypto.createHash('sha1').update(parts.map((p) => p ?? '').join('\n')).digest('hex').slice(0, 16);

/**
 * Tự động hoá nội dung: lưu điểm xong là chạy nền
 *   1. dịch bản tiếng Việt sang các ngôn ngữ còn thiếu hoặc bản dịch máy đã cũ,
 *   2. tạo giọng đọc cho bản nào chưa có audio hoặc chữ đã đổi.
 * Không đụng bản dịch quản trị viên tự sửa và file thu âm tự tải lên.
 * Chạy lần lượt từng điểm để không dồn yêu cầu lên dịch vụ dịch/TTS.
 */
/** Thử lại khi dịch vụ ngoài lỗi tạm thời (quá tải 429, lỗi 5xx, mất mạng). */
async function withRetry(fn, delays) {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const transient = !err.status || err.status >= 500 || /429|quá tải|kết nối/i.test(err.message);
      if (!transient || i >= delays.length) throw err;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
}

export function createAutopilot(repos, services, { enabled = config.autoProcess, retryDelays = [3000, 8000, 20000] } = {}) {
  const { pois, translations, meta } = repos;
  const queue = [];
  const status = new Map(); // poiId → { state, done, total, step, errors, updated_at }
  let running = null;

  const set = (id, patch) => status.set(id, { ...(status.get(id) ?? { done: 0, total: 0, errors: [] }), ...patch, updated_at: new Date().toISOString() });

  async function translateLong(text, target) {
    const parts = [];
    for (const para of text.split(/\n+/)) {
      if (!para.trim()) continue;
      const chunks = [];
      for (const c of splitText(para, 1500)) chunks.push(await withRetry(() => services.translator.translate(c, config.defaultLanguage, target), retryDelays));
      parts.push(chunks.join(' '));
    }
    return parts.join('\n\n');
  }

  async function processPoi(id) {
    const poi = pois.findById(id);
    if (!poi) return status.delete(id);
    const all = () => repos.db.prepare('SELECT * FROM poi_translation WHERE poi_id = ?').all(id);
    const src = all().find((t) => t.language_code === config.defaultLanguage && t.narration_text.trim());
    if (!src) return set(id, { state: 'done', step: 'Chưa có nội dung tiếng Việt' });
    const srcHash = hashText(src.title, src.narration_text);

    const toTranslate = languageCodes.filter((code) => {
      if (code === config.defaultLanguage) return false;
      const t = all().find((x) => x.language_code === code);
      return !t || !t.narration_text.trim() || (t.is_auto && t.source_hash !== srcHash);
    });
    const needsAudio = (t) => {
      if (!t.narration_text.trim() || t.audio_source === 'upload') return false;
      if (!t.audio_url) return true;
      // Audio cũ chưa có mã băm: coi như đang khớp, chỉ ghi lại mã để lần sau so sánh.
      if (!t.audio_hash) {
        translations.setAudioHash(id, t.language_code, hashText(t.narration_text));
        return false;
      }
      return t.audio_hash !== hashText(t.narration_text);
    };
    const audioCount = () => all().filter((t) => t.audio_source !== 'upload' && t.narration_text.trim()).filter(needsAudio).length;
    // Ước lượng trước số bước để hiện tiến độ: dịch xong mới biết chính xác số audio.
    set(id, { state: 'running', done: 0, total: toTranslate.length + Math.max(audioCount(), 1) + toTranslate.length, errors: [], step: 'Bắt đầu' });

    let done = 0;
    const errors = [];
    for (const code of toTranslate) {
      set(id, { step: `Đang dịch sang ${code.toUpperCase()}` });
      try {
        const text = await translateLong(src.narration_text, code);
        const title = src.title ? await withRetry(() => services.translator.translate(src.title, config.defaultLanguage, code), retryDelays) : null;
        translations.upsertText(id, { language_code: code, title, narration_text: text });
        translations.markAuto(id, code, srcHash);
        await new Promise((r) => setTimeout(r, retryDelays.length ? 600 : 0)); // giãn nhịp gọi dịch vụ dịch miễn phí
        pois.touch(id);
        meta.bumpContentVersion();
      } catch (err) {
        errors.push(`Dịch ${code.toUpperCase()}: ${err.message}`);
      }
      set(id, { done: ++done, errors: [...errors] });
    }

    const pending = all().filter(needsAudio);
    set(id, { total: done + pending.length });
    for (const t of pending) {
      set(id, { step: `Đang tạo giọng đọc ${t.language_code.toUpperCase()}` });
      try {
        const mp3 = await withRetry(() => services.tts.synthesize(t.narration_text, t.language_code), retryDelays);
        services.pois.attachAudio(id, t.language_code, saveBuffer(mp3, '.mp3', 'tts'), 'tts');
        translations.setAudioHash(id, t.language_code, hashText(t.narration_text));
      } catch (err) {
        errors.push(`Giọng đọc ${t.language_code.toUpperCase()}: ${err.message}`);
      }
      set(id, { done: ++done, errors: [...errors] });
    }
    set(id, { state: errors.length ? 'error' : 'done', step: errors.length ? 'Có bước bị lỗi' : 'Đã xong' });
  }

  async function drain() {
    while (queue.length) {
      const id = queue.shift();
      try {
        await processPoi(id);
      } catch (err) {
        set(id, { state: 'error', step: 'Lỗi', errors: [err.message] });
      }
    }
    running = null;
  }

  return {
    enabled,
    schedule(id) {
      if (!enabled) return;
      if (!queue.includes(id)) queue.push(id);
      if (status.get(id)?.state !== 'running') set(id, { state: 'queued', step: 'Đang chờ', done: 0, total: 0, errors: [] });
      running ??= drain();
    },
    status: (id) => ({ enabled, ...(status.get(id) ?? { state: 'idle', done: 0, total: 0, errors: [] }) }),
    /** Chờ hàng đợi chạy hết (dùng trong kiểm thử). */
    idle: () => running ?? Promise.resolve(),
  };
}
