/**
 * Tầng nghiệp vụ: xác thực quản trị viên.
 * Kiểm tra mật khẩu bằng bcrypt, phát/kiểm tra JWT và đổi mật khẩu.
 * Lỗi được ném dưới dạng AppError 400/401 để middleware error trả JSON thống nhất.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { badRequest, unauthorized } from '../utils/errors.js';

// Tạo service auth từ repository admin; mọi thao tác DB đều đi qua `admins`.
export function createAuthService({ admins }) {
  return {
    // Đăng nhập: trả { token, user } nếu đúng, ném 400 khi thiếu input và 401 khi sai thông tin.
    async login(username, password) {
      if (!username || !password) throw badRequest('Vui lòng nhập tên đăng nhập và mật khẩu');
      const user = admins.findByUsername(String(username).trim());
      // So sánh cả khi không có user để thời gian phản hồi tương đương.
      const ok = await bcrypt.compare(String(password), user?.password_hash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
      if (!user || !ok) throw unauthorized('Tên đăng nhập hoặc mật khẩu không đúng');
      // Ký JWT chứa id + username, hết hạn theo config.jwtExpiresIn (mặc định 8h).
      const token = jwt.sign({ sub: user.id, username: user.username }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
      return { token, user: { id: user.id, username: user.username, full_name: user.full_name } };
    },
    // Giải mã token và nạp lại admin từ DB; token sai/hết hạn hoặc user đã bị xoá đều thành 401.
    verify(token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret);
        const user = admins.findById(Number(payload.sub));
        if (!user) throw new Error('gone');
        return user;
      } catch {
        throw unauthorized();
      }
    },
    // Đổi mật khẩu: xác minh mật khẩu hiện tại, bắt buộc mật khẩu mới >= 8 ký tự.
    async changePassword(userId, currentPassword, newPassword) {
      const user = admins.findByUsername(admins.findById(userId).username);
      if (!(await bcrypt.compare(String(currentPassword ?? ''), user.password_hash))) throw badRequest('Mật khẩu hiện tại không đúng', { current_password: 'Mật khẩu hiện tại không đúng' });
      if (!newPassword || String(newPassword).length < 8) throw badRequest('Mật khẩu mới phải có ít nhất 8 ký tự', { new_password: 'Ít nhất 8 ký tự' });
      admins.updatePassword(userId, await bcrypt.hash(String(newPassword), 10));
    },
    // Helper băm mật khẩu (dùng cho seed hoặc tạo tài khoản), cùng cost 10 với login.
    hashPassword: (pw) => bcrypt.hash(pw, 10),
  };
}
