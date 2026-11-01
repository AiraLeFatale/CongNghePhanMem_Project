/**
 * Điểm khởi động (entrypoint) của backend.
 * Kiểm tra cấu hình an toàn, mở kết nối SQLite, chuẩn bị thư mục upload rồi lắng nghe HTTP.
 */
import { config } from './config.js';
import { openDatabase } from './db/database.js';
import { createApp } from './app.js';
import { ensureUploadDir } from './middleware/upload.js';

// Chặn khởi động ở production nếu vẫn dùng JWT_SECRET mặc định của môi trường dev.
if (config.jwtSecret === 'dev-only-secret-change-me' && process.env.NODE_ENV === 'production') {
  console.error('Thiếu JWT_SECRET khi chạy production');
  process.exit(1);
}

// Mở DB (tự tạo file + schema nếu chưa có) và đảm bảo thư mục uploads tồn tại.
const db = openDatabase();
ensureUploadDir();
const { app } = createApp(db);
app.listen(config.port, '0.0.0.0', () => {
  console.log(`Narration API chạy tại http://localhost:${config.port}/api (DB: ${config.dbFile})`);
});
