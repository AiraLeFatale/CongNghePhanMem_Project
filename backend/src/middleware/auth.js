/**
 * Middleware xác thực: chặn các route CMS nếu request không kèm Bearer token hợp lệ.
 * Token do authService phát hành/kiểm tra; kết quả giải mã được gắn vào req.admin.
 */
import { unauthorized } from '../utils/errors.js';

// Factory nhận authService, trả về middleware Express dùng cho router /admin.
// Lỗi: ném 401 (qua next) khi thiếu token, sai scheme hoặc token hết hạn/không hợp lệ.
export const requireAdmin = (authService) => (req, _res, next) => {
  // Đọc header Authorization dạng "Bearer <token>".
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());
  req.admin = authService.verify(token);
  next();
};
