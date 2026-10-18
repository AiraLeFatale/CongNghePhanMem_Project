import { idParam } from '../utils/validate.js';
import { badRequest } from '../utils/errors.js';
import { saveBuffer } from '../middleware/upload.js';

export function createPoiController(s) {
  return {
    list: (req, res) => res.json({ items: s.pois.list(req.query.q) }),
    get: (req, res) => res.json(s.pois.get(idParam(req.params.id))),
    create: (req, res) => res.status(201).json(s.pois.create(req.body, req.admin.id)),
    update: (req, res) => res.json(s.pois.update(idParam(req.params.id), req.body)),
    remove: (req, res) => { s.pois.delete(idParam(req.params.id)); res.status(204).end(); },
    uploadAudio: (req, res) => {
      if (!req.file) throw badRequest('Chưa chọn file âm thanh (trường "audio")');
      res.json(s.pois.attachAudio(idParam(req.params.id), req.params.lang, req.file.filename, 'upload'));
    },
    removeAudio: (req, res) => res.json(s.pois.removeAudio(idParam(req.params.id), req.params.lang)),
    generateTts: async (req, res) => {
      const id = idParam(req.params.id);
      const poi = s.pois.get(id);
      const t = poi.translations.find((x) => x.language_code === req.params.lang);
      const text = req.body?.text ?? t?.narration_text;
      const mp3 = await s.tts.synthesize(text, req.params.lang);
      const file = saveBuffer(mp3, '.mp3', 'tts');
      res.json(s.pois.attachAudio(id, req.params.lang, file, 'tts'));
    },
    uploadImage: (req, res) => {
      if (!req.file) throw badRequest('Chưa chọn ảnh (trường "image")');
      res.status(201).json({ url: `/uploads/${req.file.filename}` });
    },
    translate: async (req, res) => {
      const { text, source, target } = req.body ?? {};
      res.json({ text: await s.translator.translate(text, source, target), provider: s.translator.provider });
    },
    listQr: (req, res) => res.json({ items: s.qr.listForPoi(idParam(req.params.id)) }),
    createQr: (req, res) => res.status(201).json(s.qr.create(idParam(req.params.id), req.body?.label)),
    listAllQr: (_req, res) => res.json({ items: s.qr.listAll() }),
    deleteQr: (req, res) => { s.qr.delete(idParam(req.params.id)); res.status(204).end(); },
  };
}
