import multer from 'multer';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Không có đường dẫn ${req.method} ${req.path}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File quá lớn (tối đa 15 MB)' : 'Lỗi tải file lên';
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Dữ liệu JSON không hợp lệ' } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Dữ liệu gửi lên quá lớn' } });
  }
  if (err?.status === 404) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy file' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Lỗi máy chủ' } });
}
