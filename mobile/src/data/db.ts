/**
 * Content layer — SQLite trên máy (expo-sqlite). App hoạt động hoàn toàn offline từ đây sau lần đồng bộ đầu.
 * Bảng nội dung (poi, poi_translation, tour, tour_poi) được thay toàn bộ trong một transaction mỗi lần đồng bộ.
 */
import * as SQLite from 'expo-sqlite';
import type { Poi, SyncBundle, Tour, Translation } from '../types';
import { SYNC_FORMAT } from './syncLogic';

const DB_NAME = 'narration.db';
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Mở database một lần duy nhất (singleton) và chạy migrate; lỗi thì reset để lần sau thử lại. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/** Tạo bảng nếu chưa có và nâng `user_version`; bỏ qua khi schema đã mới nhất. */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  // WAL cho ghi nhanh hơn, bật khoá ngoại để ON DELETE CASCADE hoạt động.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT);
    CREATE TABLE IF NOT EXISTS poi (
      id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, address TEXT,
      latitude REAL NOT NULL, longitude REAL NOT NULL, radius_m REAL NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1, image_url TEXT, updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS poi_translation (
      poi_id INTEGER NOT NULL REFERENCES poi(id) ON DELETE CASCADE,
      language_code TEXT NOT NULL, title TEXT, narration_text TEXT, audio_url TEXT, audio_source TEXT,
      PRIMARY KEY (poi_id, language_code)
    );
    CREATE TABLE IF NOT EXISTS tour (id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, updated_at TEXT);
    CREATE TABLE IF NOT EXISTS tour_poi (
      tour_id INTEGER NOT NULL REFERENCES tour(id) ON DELETE CASCADE,
      poi_id INTEGER NOT NULL, visit_order INTEGER NOT NULL,
      PRIMARY KEY (tour_id, visit_order)
    );
    CREATE TABLE IF NOT EXISTS qr_code (payload TEXT PRIMARY KEY NOT NULL, poi_id INTEGER NOT NULL, label TEXT);
    CREATE TABLE IF NOT EXISTS qr_cache (code TEXT PRIMARY KEY NOT NULL, poi_id INTEGER NOT NULL, label TEXT, resolved_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audio_file (url TEXT PRIMARY KEY NOT NULL, local_uri TEXT NOT NULL, bytes INTEGER, downloaded_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS usage_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS location_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, created_at TEXT NOT NULL);
    PRAGMA user_version = ${SCHEMA_VERSION};
  `);
}

/* ---------------- key/value (cài đặt, phiên bản nội dung) ---------------- */

/** Đọc một giá trị trong bảng key/value; trả null nếu chưa có. */
export async function kvGet(key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM kv WHERE key = ?', key);
  return r?.value ?? null;
}

/** Ghi/ghi đè một giá trị key/value; truyền null để xoá khoá. */
export async function kvSet(key: string, value: string | null): Promise<void> {
  const db = await getDb();
  if (value == null) await db.runAsync('DELETE FROM kv WHERE key = ?', key);
  else await db.runAsync('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

/* ---------------- nội dung ---------------- */

/** Nạp toàn bộ POI kèm bản dịch và tour kèm thứ tự điểm dừng từ SQLite. */
export async function loadContent(): Promise<{ pois: Poi[]; tours: Tour[] }> {
  const db = await getDb();
  const poiRows = await db.getAllAsync<Omit<Poi, 'translations'>>('SELECT * FROM poi ORDER BY priority DESC, id');
  const trRows = await db.getAllAsync<Translation & { poi_id: number }>('SELECT * FROM poi_translation');
  const byPoi = new Map<number, Translation[]>();
  // Gom bản dịch theo poi_id để ghép vào từng POI chỉ với một lượt truy vấn.
  for (const t of trRows) {
    const list = byPoi.get(t.poi_id) ?? [];
    list.push({
      language_code: t.language_code,
      title: t.title,
      narration_text: t.narration_text,
      audio_url: t.audio_url,
      audio_source: t.audio_source,
    });
    byPoi.set(t.poi_id, list);
  }
  const pois = poiRows.map((p) => ({ ...p, translations: byPoi.get(p.id) ?? [] }));
  const tourRows = await db.getAllAsync<Omit<Tour, 'poi_ids'>>('SELECT * FROM tour ORDER BY id');
  const tpRows = await db.getAllAsync<{ tour_id: number; poi_id: number }>(
    'SELECT tour_id, poi_id FROM tour_poi ORDER BY tour_id, visit_order',
  );
  const tours = tourRows.map((t) => ({ ...t, poi_ids: tpRows.filter((r) => r.tour_id === t.id).map((r) => r.poi_id) }));
  return { pois, tours };
}

/** Đếm số POI đang lưu trên máy (dùng để biết đã có dữ liệu offline chưa). */
export async function countPois(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM poi');
  return r?.n ?? 0;
}

/** Thay toàn bộ nội dung bằng gói mới trong MỘT transaction (lỗi giữa chừng → giữ nguyên dữ liệu cũ). */
export async function replaceContent(bundle: SyncBundle): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    // Xoá sạch nội dung cũ trước khi ghi gói mới (thứ tự tôn trọng khoá ngoại).
    await txn.execAsync('DELETE FROM tour_poi; DELETE FROM tour; DELETE FROM poi_translation; DELETE FROM poi; DELETE FROM qr_code;');
    for (const p of bundle.pois) {
      await txn.runAsync(
        'INSERT INTO poi (id, name, address, latitude, longitude, radius_m, priority, image_url, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        p.id, p.name, p.address, p.latitude, p.longitude, p.radius_m, p.priority, p.image_url, p.updated_at,
      );
      for (const t of p.translations) {
        await txn.runAsync(
          'INSERT OR REPLACE INTO poi_translation (poi_id, language_code, title, narration_text, audio_url, audio_source) VALUES (?,?,?,?,?,?)',
          p.id, t.language_code, t.title, t.narration_text, t.audio_url, t.audio_source ?? null,
        );
      }
    }
    for (const t of bundle.tours) {
      await txn.runAsync('INSERT INTO tour (id, name, description, updated_at) VALUES (?,?,?,?)', t.id, t.name, t.description, t.updated_at);
      // visit_order bắt đầu từ 1 theo đúng thứ tự poi_ids trong gói.
      for (let i = 0; i < t.poi_ids.length; i++) {
        await txn.runAsync('INSERT INTO tour_poi (tour_id, poi_id, visit_order) VALUES (?,?,?)', t.id, t.poi_ids[i], i + 1);
      }
    }
    // QR phát hành trên máy chủ — dùng để tra cứu offline.
    for (const q of bundle.qrcodes ?? []) {
      await txn.runAsync('INSERT OR REPLACE INTO qr_code (payload, poi_id, label) VALUES (?,?,?)', q.payload, q.poi_id, q.label);
    }
    await txn.runAsync(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      'sync_format', String(SYNC_FORMAT),
    );
    // QR đã giải trước đó trỏ tới POI bị xoá → bỏ.
    await txn.execAsync('DELETE FROM qr_cache WHERE poi_id NOT IN (SELECT id FROM poi);');
    await txn.runAsync(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      'content_version', String(bundle.version),
    );
    await txn.runAsync(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      'last_sync_at', new Date().toISOString(),
    );
  });
}

/** Lưu tạm một POI nhận từ /api/qr khi dữ liệu máy chưa có (dữ liệu đồng bộ lần sau sẽ ghi đè). */
export async function upsertPoi(p: Poi): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      'INSERT OR REPLACE INTO poi (id, name, address, latitude, longitude, radius_m, priority, image_url, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      p.id, p.name, p.address, p.latitude, p.longitude, p.radius_m, p.priority, p.image_url, p.updated_at,
    );
    await txn.runAsync('DELETE FROM poi_translation WHERE poi_id = ?', p.id);
    for (const t of p.translations) {
      await txn.runAsync(
        'INSERT OR REPLACE INTO poi_translation (poi_id, language_code, title, narration_text, audio_url, audio_source) VALUES (?,?,?,?,?,?)',
        p.id, t.language_code, t.title, t.narration_text, t.audio_url, t.audio_source ?? null,
      );
    }
  });
}

/* ---------------- QR ---------------- */

/** Mã QR đồng bộ từ máy chủ (bảng qr_code) — tra offline. */
export async function qrLocalGet(code: string): Promise<{ poi_id: number; label: string | null } | null> {
  const db = await getDb();
  return db.getFirstAsync<{ poi_id: number; label: string | null }>('SELECT poi_id, label FROM qr_code WHERE payload = ?', code);
}

/** Đếm số mã QR đồng bộ được (dùng cho màn hình cài đặt/chẩn đoán). */
export async function qrLocalCount(): Promise<number> {
  const db = await getDb();
  return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM qr_code'))?.n ?? 0;
}

/** Tra mã QR đã giải thành công trước đó (bộ đệm để dùng lại khi offline). */
export async function qrCacheGet(code: string): Promise<{ poi_id: number; label: string | null } | null> {
  const db = await getDb();
  return db.getFirstAsync<{ poi_id: number; label: string | null }>('SELECT poi_id, label FROM qr_cache WHERE code = ?', code);
}

/** Lưu kết quả giải mã QR vào bộ đệm kèm thời điểm, phục vụ tra cứu offline. */
export async function qrCachePut(code: string, poiId: number, label: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO qr_cache (code, poi_id, label, resolved_at) VALUES (?,?,?,?)',
    code, poiId, label, new Date().toISOString(),
  );
}

/** Xoá một mục trong bộ đệm QR (ví dụ khi mã không còn hợp lệ). */
export async function qrCacheDelete(code: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM qr_cache WHERE code = ?', code);
}

/** Đếm số mã QR đã lưu trong bộ đệm. */
export async function qrCacheCount(): Promise<number> {
  const db = await getDb();
  return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM qr_cache'))?.n ?? 0;
}

/* ---------------- audio đã tải ---------------- */

/** URI file audio cục bộ đã tải cho URL gốc; null nếu chưa tải. */
export async function audioFileGet(url: string): Promise<string | null> {
  const db = await getDb();
  return (await db.getFirstAsync<{ local_uri: string }>('SELECT local_uri FROM audio_file WHERE url = ?', url))?.local_uri ?? null;
}

/** Liệt kê mọi audio đã tải (để dọn file không còn dùng hoặc tính dung lượng). */
export async function audioFileList(): Promise<{ url: string; local_uri: string; bytes: number | null }[]> {
  const db = await getDb();
  return db.getAllAsync('SELECT url, local_uri, bytes FROM audio_file');
}

/** Ghi nhận (hoặc cập nhật) một file audio đã tải: URL gốc → URI cục bộ. */
export async function audioFilePut(url: string, localUri: string, bytes: number | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO audio_file (url, local_uri, bytes, downloaded_at) VALUES (?,?,?,?)',
    url, localUri, bytes, new Date().toISOString(),
  );
}

/** Xoá bản ghi audio đã tải theo URL gốc. */
export async function audioFileDelete(url: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM audio_file WHERE url = ?', url);
}

/* ---------------- hàng đợi log ẩn danh ---------------- */

/** Hai bảng hàng đợi log ẩn danh: lượt nghe và mẫu vị trí. */
export type QueueTable = 'usage_queue' | 'location_queue';

/** Đẩy một bản ghi log vào cuối hàng đợi (chờ gửi khi có mạng). */
export async function queuePush(table: QueueTable, payload: object): Promise<void> {
  const db = await getDb();
  await db.runAsync(`INSERT INTO ${table} (payload, created_at) VALUES (?, ?)`, JSON.stringify(payload), new Date().toISOString());
}

/** Lấy tối đa `limit` bản ghi cũ nhất trong hàng đợi, kèm id để xoá sau khi gửi thành công. */
export async function queuePeek<T>(table: QueueTable, limit: number): Promise<{ id: number; payload: T }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: number; payload: string }>(`SELECT id, payload FROM ${table} ORDER BY id LIMIT ?`, limit);
  return rows.map((r) => ({ id: r.id, payload: JSON.parse(r.payload) as T }));
}

/** Xoá các bản ghi đã gửi thành công theo danh sách id (dựng placeholder cho IN). */
export async function queueDelete(table: QueueTable, ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${table} WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
}

/** Đếm số bản ghi đang chờ gửi (hiển thị trên màn hình Cài đặt). */
export async function queueCount(table: QueueTable): Promise<number> {
  const db = await getDb();
  return (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n ?? 0;
}

/** Xoá sạch hàng đợi (dùng khi người dùng tắt chia sẻ dữ liệu). */
export async function queueClear(table: QueueTable): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${table}`);
}

/** Xoá bộ nhớ đệm: nội dung, QR, audio đã tải (giữ cài đặt). */
export async function clearCache(): Promise<void> {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      DELETE FROM tour_poi; DELETE FROM tour; DELETE FROM poi_translation; DELETE FROM poi;
      DELETE FROM qr_code; DELETE FROM qr_cache; DELETE FROM audio_file;
      DELETE FROM kv WHERE key IN ('content_version', 'last_sync_at', 'sync_format');
    `);
  });
}
