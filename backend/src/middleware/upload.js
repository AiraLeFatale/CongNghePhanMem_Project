/**
 * Middleware upload file bằng multer (lưu trên đĩa tại config.uploadDir).
 * Giới hạn dung lượng theo config.maxAudioBytes, chỉ nhận MIME audio/ảnh trong whitelist,
 * và đặt tên file ngẫu nhiên để tránh ghi đè/đoán tên.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { badRequest } from '../utils/errors.js';

// Bảng ánh xạ MIME → phần mở rộng cho file audio được phép tải lên.
const AUDIO_EXT = { 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/aac': '.aac', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/ogg': '.ogg', 'audio/webm': '.webm' };
// Bảng ánh xạ MIME → phần mở rộng cho ảnh đại diện POI.
const IMAGE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// Tạo thư mục upload nếu chưa có (gọi lúc server khởi động và trước mỗi lần ghi file).
export function ensureUploadDir() {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Tạo instance multer dùng chung: kiểm tra MIME theo whitelist và sinh tên file duy nhất.
function make(allowed, kind) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => { ensureUploadDir(); cb(null, config.uploadDir); },
      filename: (_req, file, cb) => cb(null, `${kind}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${allowed[file.mimetype]}`),
    }),
    limits: { fileSize: config.maxAudioBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      // Chỉ chấp nhận MIME có trong whitelist; còn lại trả lỗi 400.
      if (allowed[file.mimetype]) cb(null, true);
      else cb(badRequest(`Định dạng file không được hỗ trợ (${file.mimetype})`));
    },
  });
}

// Middleware sẵn dùng cho route: nhận 1 file audio (field "audio") và 1 file ảnh (field "image").
export const audioUpload = make(AUDIO_EXT, 'audio').single('audio');
export const imageUpload = make(IMAGE_EXT, 'image').single('image');

// Ghi buffer (VD audio trả về từ TTS) xuống uploadDir với tên ngẫu nhiên; trả về tên file.
export function saveBuffer(buffer, ext, kind) {
  ensureUploadDir();
  const name = `${kind}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(config.uploadDir, name), buffer);
  return name;
}
