/**
 * Tầng nghiệp vụ: quản lý điểm thuyết minh (POI).
 * Validate dữ liệu, ghi POI + bản dịch + audio trong transaction, tăng content_version
 * và dọn file upload không còn dùng để tránh rác trong thư mục uploads.
 */
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

  // Phí nghe: 0 = miễn phí, hoặc số nguyên từ 1.000 đến 500.000 đồng.
  const rawPrice = body?.price;
  const price = rawPrice === undefined || rawPrice === null || rawPrice === '' ? 0 : Number(String(rawPrice).replace(',', '.'));
  if (!Number.isInteger(price) || price < 0 || price > 500000) errors.price = 'Phí nghe là số nguyên từ 0 đến 500.000 đồng';
  else if (price > 0 && price < 1000) errors.price = 'Tối thiểu 1.000 đồng, hoặc 0 nếu miễn phí';

  const translations = Array.isArray(body?.translations) ? body.translations : [];
  const seen = new Set();
  const cleaned = [];
  // Duyệt bản dịch: bỏ ngôn ngữ không hỗ trợ/trùng, bỏ dòng rỗng, cắt text tối đa 10.000 ký tự.
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
  // Bắt buộc có nội dung thuyết minh bằng ngôn ngữ mặc định (vi).
  if (!def || !def.narration_text) {
    errors.translations = `Cần ít nhất nội dung thuyết minh bằng ngôn ngữ mặc định (${config.defaultLanguage})`;
  }

  if (Object.keys(errors).length) throw badRequest('Dữ liệu điểm thuyết minh không hợp lệ', errors);
  // Trả về object đã chuẩn hoá, sẵn sàng ghi xuống DB.
  return {
    name,
    address: trimOrNull(body.address, 300),
    latitude: lat,
    longitude: lng,
    radius_m: Math.round(radius),
    priority,
    image_url: trimOrNull(body.image_url, 1000),
    price,
    translations: cleaned,
  };
}

// Tạo service POI; expose CRUD, quản lý audio và tra cứu kèm mã QR.
export function createPoiService(repos, { auto, autoOnSave = false } = {}) {
  const { pois, translations, meta } = repos;

  // Xoá file trong uploads/ (audio hoặc ảnh)
  function removeUploadedFile(url) {
    if (!url || !url.startsWith('/uploads/')) return;
    // basename() để chặn path traversal (URL kiểu ../../etc/passwd).
    const file = path.join(config.uploadDir, path.basename(url));
    fs.rm(file, { force: true }, () => {});
  }

  return {
    list: (q) => pois.list({ q: trimOrNull(q, 100) }),
    // Lấy chi tiết một POI, kèm danh sách mã QR đã ghép sẵn nội dung.
    get(id) {
      const poi = pois.findById(id);
      if (!poi) throw notFound('Không tìm thấy điểm thuyết minh');
      return { ...poi, qrcodes: repos.qrcodes.listForPoi(id).map((q) => ({ ...q, content: QR_PREFIX + q.payload })) };
    },
    create(body, adminId) {
      const data = validatePoiInput(body);
      // Tạo POI + bản dịch trong cùng transaction để không lưu nửa chừng.
      const id = transaction(repos.db, () => {
        const newId = pois.create(data, adminId);
        for (const t of data.translations) translations.upsertText(newId, { ...t, is_auto: 0 });
        meta.bumpContentVersion();
        return newId;
      });
      // Giống CMS đang chạy: lưu tiếng Việt xong thì tự dịch + tạo giọng đọc chạy nền.
      if (autoOnSave) auto?.schedule(id);
      return this.get(id);
    },
    update(id, body) {
      const before = pois.findById(id);
      if (!before) throw notFound('Không tìm thấy điểm thuyết minh');
      const data = validatePoiInput(body);
      // Bản dịch máy tạo còn nguyên nội dung thì giữ is_auto=1; admin sửa tay → is_auto=0.
      const previous = new Map(before.translations.map((t) => [t.language_code, t]));
      const rows = data.translations.map((t) => {
        const old = previous.get(t.language_code);
        const untouched = old && old.narration_text === t.narration_text && (old.title ?? '') === (t.title ?? '');
        return { ...t, is_auto: old?.is_auto && untouched ? 1 : 0 };
      });
      const removed = transaction(repos.db, () => {
        // Cập nhật POI, upsert bản dịch mới và xoá bản dịch không còn trong payload.
        pois.update(id, data);
        for (const t of rows) translations.upsertText(id, t);
        const gone = translations.deleteExcept(id, rows.map((t) => t.language_code));
        meta.bumpContentVersion();
        return gone;
      });
      removed.forEach((t) => removeUploadedFile(t.audio_url));
      // Nếu ảnh đại diện bị thay đổi thì xoá file ảnh cũ sau khi DB đã commit.
      if (before.image_url && before.image_url !== data.image_url) removeUploadedFile(before.image_url);
      // Chỉ chạy lại tự dịch khi nội dung tiếng Việt thay đổi (sửa giá/toạ độ thì không).
      if (autoOnSave) {
        const pickVi = (list) => list.find((t) => t.language_code === config.defaultLanguage);
        const oldVi = pickVi(before.translations);
        const newVi = pickVi(rows);
        if (!oldVi || !newVi || oldVi.narration_text !== newVi.narration_text || (oldVi.title ?? '') !== (newVi.title ?? '')) auto?.schedule(id);
      }
      return this.get(id);
    },
    delete(id) {
      const poi = pois.findById(id);
      if (!poi) throw notFound('Không tìm thấy điểm thuyết minh');
      // Xoá bản ghi trước (cascade bản dịch/QR), sau đó mới dọn file vật lý.
      transaction(repos.db, () => {
        pois.delete(id);
        meta.bumpContentVersion();
      });
      poi.translations.forEach((t) => removeUploadedFile(t.audio_url));
      removeUploadedFile(poi.image_url);
    },
    attachAudio(id, lang, file, source) {
      // source là 'upload' (admin tải lên) hoặc 'tts' (máy sinh).
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
    // Gỡ audio của một ngôn ngữ: cập nhật DB rồi xoá file cũ.
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
