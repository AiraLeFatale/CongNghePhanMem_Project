/**
 * Tầng nghiệp vụ: tự dịch 5 ngôn ngữ còn lại từ tiếng Việt và tạo giọng đọc (TTS).
 *
 * CMS hiển thị tiến trình qua GET /api/admin/pois/:id/auto; chạy lại bằng POST cùng URL.
 * Sau khi lưu POI, backend tự xếp hàng chạy nền (không chặn phản hồi lưu).
 * Bản dịch/audio admin tự sửa được giữ nguyên, chỉ nội dung do máy tạo mới bị ghi đè.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config, languageCodes } from '../config.js';
import { saveBuffer } from '../middleware/upload.js';

const AUTO_LANGS = languageCodes.filter((code) => code !== config.defaultLanguage);

// Tạo service tự dịch/TTS. enabled = false khi thiếu provider hoặc provider là 'none'
// (test inject provider giả nên không chạy nền, tránh sửa dữ liệu bất đồng bộ).
export function createAutoService(repos, { translator, tts } = {}) {
  const { pois, translations, meta } = repos;
  const enabled = Boolean(translator && tts && translator.provider !== 'none' && tts.provider !== 'none');
  // poi_id → { state, step, done, total, errors }
  const jobs = new Map();

  const idle = () => ({ enabled, state: 'idle', done: 0, total: 0, errors: [] });

  function status(poiId) {
    const job = jobs.get(poiId);
    if (!job) return idle();
    return { enabled, state: job.state, step: job.step, done: job.done, total: job.total, errors: [...job.errors] };
  }

  function removeOldAudio(url) {
    if (!url?.startsWith('/uploads/')) return;
    fs.rm(path.join(config.uploadDir, path.basename(url)), { force: true }, () => {});
  }

  // Xoá file TTS cũ sau khi đã ghi file mới (không xoá audio admin upload).
  async function synthesizeFor(poiId, lang) {
    const t = translations.find(poiId, lang);
    const text = String(t?.narration_text ?? '').trim();
    if (!text) return { skipped: true };
    if (t.audio_source === 'upload') return { skipped: true };
    const mp3 = await tts.synthesize(text, lang);
    const file = saveBuffer(mp3, '.mp3', 'tts');
    const url = `/uploads/${file}`;
    const old = t.audio_url;
    translations.setAudio(poiId, lang, url, 'tts');
    if (old && old !== url) removeOldAudio(old);
    return { skipped: false };
  }

  async function run(poiId) {
    const job = jobs.get(poiId);
    if (!job) return;
    job.state = 'running';

    const poi = pois.findById(poiId);
    if (!poi) {
      job.state = 'error';
      job.errors.push('Không tìm thấy điểm thuyết minh');
      return;
    }
    const vi = poi.translations.find((t) => t.language_code === config.defaultLanguage);
    if (!vi?.narration_text?.trim()) {
      job.state = 'error';
      job.errors.push('Chưa có nội dung thuyết minh tiếng Việt');
      return;
    }

    // Bước 1: dịch sang 5 ngôn ngữ còn lại (bỏ qua bản admin tự nhập).
    for (const lang of AUTO_LANGS) {
      const existing = poi.translations.find((t) => t.language_code === lang);
      if (existing?.narration_text?.trim() && !existing.is_auto) {
        job.step = `Giữ nguyên bản dịch ${lang}`;
        job.done++;
        continue;
      }
      job.step = `Đang dịch sang ${lang}`;
      try {
        const title = vi.title?.trim() ? await translator.translate(vi.title, config.defaultLanguage, lang) : null;
        const text = await translator.translate(vi.narration_text, config.defaultLanguage, lang);
        translations.upsertAuto(poiId, { language_code: lang, title, narration_text: text });
      } catch (err) {
        job.errors.push(`Dịch ${lang}: ${err.message}`);
      }
      job.done++;
    }

    // Bước 2: tạo lại giọng đọc cho mọi ngôn ngữ (trừ audio admin upload).
    for (const lang of languageCodes) {
      job.step = `Đang tạo giọng đọc ${lang}`;
      try {
        await synthesizeFor(poiId, lang);
      } catch (err) {
        job.errors.push(`TTS ${lang}: ${err.message}`);
      }
      job.done++;
    }

    meta.bumpContentVersion();
    pois.touch(poiId);
    job.step = 'Hoàn tất';
    job.state = job.errors.length ? 'error' : 'done';
  }

  function schedule(poiId, { immediate = false } = {}) {
    if (!enabled) return status(poiId);
    const current = jobs.get(poiId);
    if (current && (current.state === 'queued' || current.state === 'running')) return status(poiId);
    jobs.set(poiId, { state: 'queued', step: 'Đang chờ', done: 0, total: AUTO_LANGS.length + languageCodes.length, errors: [] });
    const timer = setTimeout(() => {
      run(poiId).catch((err) => {
        const job = jobs.get(poiId);
        if (job) {
          job.state = 'error';
          job.errors.push(err.message);
        }
      });
    }, immediate ? 0 : 400);
    timer.unref?.();
    return status(poiId);
  }

  return { enabled, status, schedule };
}
