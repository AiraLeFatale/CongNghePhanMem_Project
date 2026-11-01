/**
 * Tầng dữ liệu: mở kết nối SQLite (node:sqlite) và tạo schema.
 * Toàn bộ bảng của hệ thống thuyết minh (admin, poi, bản dịch, QR, tour, log) được khai báo ở đây.
 * Cung cấp thêm helper transaction() để gói nhiều câu lệnh trong một transaction.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

// Câu lệnh DDL tạo toàn bộ bảng/index; CREATE IF NOT EXISTS nên chạy lại nhiều lần vẫn an toàn.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS admin_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  radius_m INTEGER NOT NULL CHECK (radius_m > 0),
  priority INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  -- Phí nghe (đồng). 0 = miễn phí; > 0 thì bài đầy đủ bị khoá cho tới khi thanh toán.
  price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  created_by INTEGER REFERENCES admin_user(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poi_translation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id INTEGER NOT NULL REFERENCES poi(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  title TEXT,
  narration_text TEXT NOT NULL DEFAULT '',
  audio_url TEXT,
  audio_source TEXT CHECK (audio_source IN ('upload', 'tts')),
  -- 1 = bản dịch do máy tạo, 0 = admin tự nhập/sửa.
  is_auto INTEGER NOT NULL DEFAULT 0,
  UNIQUE (poi_id, language_code)
);

CREATE TABLE IF NOT EXISTS qr_code (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id INTEGER NOT NULL REFERENCES poi(id) ON DELETE CASCADE,
  payload TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tour (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES admin_user(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tour_poi (
  tour_id INTEGER NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
  poi_id INTEGER NOT NULL REFERENCES poi(id) ON DELETE CASCADE,
  visit_order INTEGER NOT NULL,
  PRIMARY KEY (tour_id, poi_id)
);

CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poi_id INTEGER REFERENCES poi(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  trigger_method TEXT NOT NULL CHECK (trigger_method IN ('geofence', 'qr', 'manual')),
  language_code TEXT NOT NULL,
  played_at TEXT NOT NULL,
  listen_seconds INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_usage_played ON usage_log(played_at);
CREATE INDEX IF NOT EXISTS idx_usage_poi ON usage_log(poi_id);

CREATE TABLE IF NOT EXISTS location_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_location_recorded ON location_log(recorded_at);

-- Đơn thanh toán cho điểm có phí. token là bí mật tra cứu đơn (không lộ qua URL).
CREATE TABLE IF NOT EXISTS payment_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  poi_id INTEGER NOT NULL REFERENCES poi(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  transfer_note TEXT NOT NULL,
  bank_bin TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_account_name TEXT,
  claimed_at TEXT,
  paid_at TEXT,
  confirmed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_order_poi ON payment_order(poi_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON payment_order(status);
CREATE INDEX IF NOT EXISTS idx_order_created ON payment_order(created_at);

-- Phiên bản nội dung: tăng mỗi khi admin đổi POI/tour/bản dịch, app dùng để biết khi nào cần đồng bộ lại.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO meta (key, value) VALUES ('content_version', '1');
`;

// Nâng cấp DB cũ tại chỗ: CREATE TABLE IF NOT EXISTS không thêm cột mới vào bảng đã có.
function migrate(db) {
  const columns = (table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!columns('poi').includes('price')) db.exec('ALTER TABLE poi ADD COLUMN price INTEGER NOT NULL DEFAULT 0');
  if (!columns('poi_translation').includes('is_auto')) db.exec('ALTER TABLE poi_translation ADD COLUMN is_auto INTEGER NOT NULL DEFAULT 0');
}

// Mở (hoặc tạo mới) file DB tại `file`, bật khoá ngoại + WAL rồi áp schema; trả về connection.
export function openDatabase(file = config.dbFile) {
  // Với DB trên đĩa thì tạo trước thư mục chứa; ':memory:' dùng cho test nên bỏ qua.
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  // WAL chỉ có ý nghĩa với DB trên đĩa, giúp đọc/ghi song song tốt hơn.
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

// Chạy fn() trong một transaction: commit khi thành công, rollback và ném lại lỗi khi thất bại.
export function transaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    // Hoàn tác mọi thay đổi dở dang rồi để tầng trên xử lý lỗi.
    db.exec('ROLLBACK');
    throw err;
  }
}
