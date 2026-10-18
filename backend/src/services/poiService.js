import fs from 'node:fs';
import path from 'node:path';
import { config, languageCodes } from '../config.js';
import { transaction } from '../db/database.js';
import { badRequest, notFound } from '../utils/errors.js';
import { trimOrNull } from '../utils/validate.js';
import { QR_PREFIX } from './qrService.js';

/**
 * Quy tắc nghiệp vụ UC3: toạ độ hợp lệ, bán kính > 0, có nội dung ở ngôn ngữ mặc định.
 * Trả về dữ liệu đã chuẩn hoá hoặc ném lỗi 400 kèm chi tiết từng trường.
 */
export function validatePoiInput(body) {
  const errors = {};
  const name = trimOrNull(body?.name, 200);
  if (!name) errors.name = 'Tên điểm không được để trống';

  const lat = Number(body?.latitude);
  const lng = Number(body?.longitude);
  if (body?.latitude === undefined || body?.latitude === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = 'Vĩ độ phải trong khoảng -90 đến 90';
  if (body?.longitude === undefined || body?.longitude === '' || !Number.isFinite(lng) || lng < -180 || lng > 180) errors.longitude = 'Kinh độ phải trong khoảng -180 đến 180';

  const radius = Number(body?.radius_m);
  if (!Number.isFinite(radius) || radius <= 0) errors.radius_m = 'Bán kính kích hoạt phải lớn hơn 0';
  else if (radius > 5000) errors.radius_m = 'Bán kính tối đa 5000 m';

  const priority = body?.priority === undefined || body?.priority === '' ? 1 : Number(body.priority);
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) errors.priority = 'Mức ưu tiên là số nguyên từ 0 đến 100';

  const translations = Array.isArray(body?.translations) ? body.translations : [];
  const seen = new Set();
  const cleaned = [];
  translations.forEach((t, i) => {
    const code = String(t?.language_code ?? '').trim();
    if (!languageCodes.includes(code)) {
      errors[`translations.${i}.language_code`] = `Ngôn ngữ "${code}" không được hỗ trợ`;
      return;
    }
    if (seen.has(code)) {
      errors[`translations.${i}.language_code`] = `Ngôn ngữ "${code}" bị trùng`;
      return;
    }
    seen.add(code);
    const text = String(t?.narration_text ?? '').trim();
    const title = trimOrNull(t?.title, 200);
    if (!text && !title) return; // dòng trống: bỏ qua
    cleaned.push({ language_code: code, title, narration_text: text.slice(0, 10000) });
  });
  const def = cleaned.find((t) => t.language_code === config.defaultLanguage);
  if (!def || !def.narration_text) {
    errors.translations = `Cần ít nhất nội dung thuyết minh bằng ngôn ngữ mặc định (${config.defaultLanguage})`;
  }

  if (Object.keys(errors).length) throw badRequest('Dữ liệu điểm thuyết minh không hợp lệ', errors);
  return {
    name,
    address: trimOrNull(body.address, 300),
    latitude: lat,
    longitude: lng,
    radius_m: Math.round(radius),
    priority,
    image_url: trimOrNull(body.image_url, 1000),
    translations: cleaned,
  };
}

export function createPoiService(repos) {
  const { pois, translations, meta } = repos;

  // Xoá file trong uploads/ (audio hoặc ảnh)
  function removeUploadedFile(url) {
    if (!url || !url.startsWith('/uploads/')) return;
    const file = path.join(config.uploadDir, path.basename(url));
    fs.rm(file, { force: true }, () => {});
  }

  return {
    list: (q) => pois.list({ q: trimOrNull(q, 100) }),
    get(id) {
      const poi = pois.findById(id);
      if (!poi) throw notFound('Không tìm thấy điểm thuyết minh');
      return { ...poi, qrcodes: repos.qrcodes.listForPoi(id).map((q) => ({ ...q, content: QR_PREFIX + q.payload })) };
    },
    create(body, adminId) {
      const data = validatePoiInput(body);
      const id = transaction(repos.db, () => {
        const newId = pois.create(data, adminId);
        for (const t of data.translations) translations.upsertText(newId, t);
        meta.bumpContentVersion();
        return newId;
      });
      return this.get(id);
    },
    update(id, body) {
      const before = pois.findById(id);
      if (!before) throw notFound('Không tìm thấy điểm thuyết minh');
      const data = validatePoiInput(body);
      const removed = transaction(repos.db, () => {
        pois.update(id, data);
        for (const t of data.translations) translations.upsertText(id, t);
        const gone = translations.deleteExcept(id, data.translations.map((t) => t.language_code));
        meta.bumpContentVersion();
        return gone;
      });
      removed.forEach((t) => removeUploadedFile(t.audio_url));
      if (before.image_url && before.image_url !== data.image_url) removeUploadedFile(before.image_url);
      return this.get(id);
    },
    delete(id) {
      const poi = pois.findById(id);
      if (!poi) throw notFound('Không tìm thấy điểm thuyết minh');
      transaction(repos.db, () => {
        pois.delete(id);
        meta.bumpContentVersion();
      });
      poi.translations.forEach((t) => removeUploadedFile(t.audio_url));
      removeUploadedFile(poi.image_url);
    },
    attachAudio(id, lang, file, source) {
      if (!languageCodes.includes(lang)) throw badRequest(`Ngôn ngữ "${lang}" không được hỗ trợ`);
      if (!pois.findById(id)) throw notFound('Không tìm thấy điểm thuyết minh');
      const old = translations.find(id, lang);
      const url = `/uploads/${file}`;
      transaction(repos.db, () => {
        translations.setAudio(id, lang, url, source);
        pois.touch(id);
        meta.bumpContentVersion();
      });
      if (old?.audio_url && old.audio_url !== url) removeUploadedFile(old.audio_url);
      return this.get(id);
    },
    removeAudio(id, lang) {
      const t = translations.find(id, lang);
      if (!t) throw notFound('Không có nội dung cho ngôn ngữ này');
      transaction(repos.db, () => {
        translations.clearAudio(id, lang);
        pois.touch(id);
        meta.bumpContentVersion();
      });
      removeUploadedFile(t.audio_url);
      return this.get(id);
    },
  };
}
