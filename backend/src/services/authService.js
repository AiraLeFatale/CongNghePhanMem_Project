import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { badRequest, unauthorized } from '../utils/errors.js';

export function createAuthService({ admins }) {
  return {
    async login(username, password) {
      if (!username || !password) throw badRequest('Vui lòng nhập tên đăng nhập và mật khẩu');
      const user = admins.findByUsername(String(username).trim());
      // So sánh cả khi không có user để thời gian phản hồi tương đương.
      const ok = await bcrypt.compare(String(password), user?.password_hash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
      if (!user || !ok) throw unauthorized('Tên đăng nhập hoặc mật khẩu không đúng');
      const token = jwt.sign({ sub: user.id, username: user.username }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
      return { token, user: { id: user.id, username: user.username, full_name: user.full_name } };
    },
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
    async changePassword(userId, currentPassword, newPassword) {
      const user = admins.findByUsername(admins.findById(userId).username);
      if (!(await bcrypt.compare(String(currentPassword ?? ''), user.password_hash))) throw badRequest('Mật khẩu hiện tại không đúng', { current_password: 'Mật khẩu hiện tại không đúng' });
      if (!newPassword || String(newPassword).length < 8) throw badRequest('Mật khẩu mới phải có ít nhất 8 ký tự', { new_password: 'Ít nhất 8 ký tự' });
      admins.updatePassword(userId, await bcrypt.hash(String(newPassword), 10));
    },
    hashPassword: (pw) => bcrypt.hash(pw, 10),
  };
}
