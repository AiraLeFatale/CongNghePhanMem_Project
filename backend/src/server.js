import { config } from './config.js';
import { openDatabase } from './db/database.js';
import { createApp } from './app.js';
import { ensureUploadDir } from './middleware/upload.js';

if (config.jwtSecret === 'dev-only-secret-change-me' && process.env.NODE_ENV === 'production') {
  console.error('Thiếu JWT_SECRET khi chạy production');
  process.exit(1);
}

const db = openDatabase();
ensureUploadDir();
const { app } = createApp(db);
app.listen(config.port, '0.0.0.0', () => {
  console.log(`Narration API chạy tại http://localhost:${config.port}/api (DB: ${config.dbFile})`);
});
