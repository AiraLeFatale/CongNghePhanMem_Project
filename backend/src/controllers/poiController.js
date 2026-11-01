/**
 * Tầng controller cho quản trị POI trong CMS.
 * Bao gồm CRUD POI, upload/xoá audio, sinh TTS, upload ảnh, dịch văn bản và quản lý mã QR.
 * Mọi handler dùng idParam() để đảm bảo :id là số nguyên dương.
 */
import { idParam } from '../utils/validate.js';
import { badRequest } from '../utils/errors.js';
import { saveBuffer } from '../middleware/upload.js';

// Tạo nhóm handler POI; service tương ứng nằm trong s.pois, s.qr, s.tts, s.translator.
// Lỗi validate/không tìm thấy do service ném ra được chuyển tiếp cho errorHandler.
export function createPoiController(s) {
  return {
    list: (req, res) => res.json({ items: s.pois.list(req.query.q) }),
    get: (req, res) => res.json(s.pois.get(idParam(req.params.id))),
    create: (req, res) => res.status(201).json(s.pois.create(req.body, req.admin.id)),
    update: (req, res) => res.json(s.pois.update(idParam(req.params.id), req.body)),
    remove: (req, res) => { s.pois.delete(idParam(req.params.id)); res.status(204).end(); },
    // Nhận file audio do admin tải lên (multer đã ghi vào uploads) và gắn vào bản dịch.
    uploadAudio: (req, res) => {
      if (!req.file) throw badRequest('Chưa chọn file âm thanh (trường "audio")');
      res.json(s.pois.attachAudio(idParam(req.params.id), req.params.lang, req.file.filename, 'upload'));
    },
    removeAudio: (req, res) => res.json(s.pois.removeAudio(idParam(req.params.id), req.params.lang)),
    generateTts: async (req, res) => {
      const id = idParam(req.params.id);
      const poi = s.pois.get(id);
      // Ưu tiên text trong body; nếu không có thì lấy bản thuyết minh của ngôn ngữ đích.
      const t = poi.translations.find((x) => x.language_code === req.params.lang);
      const text = req.body?.text ?? t?.narration_text;
      // Tổng hợp giọng nói → ghi file mp3 → cập nhật audio_url/audio_source cho bản dịch.
      const mp3 = await s.tts.synthesize(text, req.params.lang);
      const file = saveBuffer(mp3, '.mp3', 'tts');
      res.json(s.pois.attachAudio(id, req.params.lang, file, 'tts'));
    },
    uploadImage: (req, res) => {
      if (!req.file) throw badRequest('Chưa chọn ảnh (trường "image")');
      // Trả URL tương đối để CMS lưu vào poi.image_url.
      res.status(201).json({ url: `/uploads/${req.file.filename}` });
    },
    translate: async (req, res) => {
      // Dịch văn bản tự do qua provider đang cấu hình (google-free/libretranslate/none).
      const { text, source, target } = req.body ?? {};
      res.json({ text: await s.translator.translate(text, source, target), provider: s.translator.provider });
    },
    listQr: (req, res) => res.json({ items: s.qr.listForPoi(idParam(req.params.id)) }),
    // Tạo mã QR mới cho POI với payload ngẫu nhiên (label là ghi chú tuỳ chọn).
    createQr: (req, res) => res.status(201).json(s.qr.create(idParam(req.params.id), req.body?.label)),
    listAllQr: (_req, res) => res.json({ items: s.qr.listAll() }),
    deleteQr: (req, res) => { s.qr.delete(idParam(req.params.id)); res.status(204).end(); },
    // Trạng thái tự dịch/TTS của điểm; chạy lại bằng POST cùng đường dẫn.
    autoStatus: (req, res) => {
      const id = idParam(req.params.id);
      s.pois.get(id); // 404 nếu điểm không tồn tại
      res.json(s.auto.status(id));
    },
    autoRun: (req, res) => {
      const id = idParam(req.params.id);
      s.pois.get(id);
      res.json(s.auto.schedule(id, { immediate: true }));
    },
  };
}
