import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { badRequest } from '../utils/errors.js';

const AUDIO_EXT = { 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/aac': '.aac', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/ogg': '.ogg', 'audio/webm': '.webm' };
const IMAGE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export function ensureUploadDir() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

function make(allowed, kind) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => { ensureUploadDir(); cb(null, config.uploadDir); },
      filename: (_req, file, cb) => cb(null, `${kind}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${allowed[file.mimetype]}`),
    }),
    limits: { fileSize: config.maxAudioBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (allowed[file.mimetype]) cb(null, true);
      else cb(badRequest(`Định dạng file không được hỗ trợ (${file.mimetype})`));
    },
  });
}

export const audioUpload = make(AUDIO_EXT, 'audio').single('audio');
export const imageUpload = make(IMAGE_EXT, 'image').single('image');

export function saveBuffer(buffer, ext, kind) {
  ensureUploadDir();
  const name = `${kind}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(config.uploadDir, name), buffer);
  return name;
}
