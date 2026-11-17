// Nạp trước mọi test (node --import): file upload của test ghi vào thư mục tạm, không đụng uploads/ thật.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'narration-test-'));

// Tự động dịch/tạo giọng chạy nền: tắt mặc định để các test khác không bị đổi dữ liệu giữa chừng.
process.env.AUTO_PROCESS = '0';
