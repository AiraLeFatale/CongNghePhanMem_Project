import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';

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

-- Phiên bản nội dung: tăng mỗi khi admin đổi POI/tour/bản dịch, app dùng để biết khi nào cần đồng bộ lại.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO meta (key, value) VALUES ('content_version', '1');
`;

export function openDatabase(file = config.dbFile) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

export function transaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
