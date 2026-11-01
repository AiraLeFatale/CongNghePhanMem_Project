/**
 * Thu thập dữ liệu ẩn danh (UC1 bước 8, phục vụ UC5):
 *  - session_id ngẫu nhiên sinh mới mỗi lần mở app, không gắn với thiết bị/danh tính.
 *  - Lượt nghe và mẫu vị trí được xếp hàng trong SQLite, gửi theo lô khi có mạng.
 *  - Tôn trọng cài đặt "Gửi dữ liệu ẩn danh" (tắt → không ghi, xoá hàng đợi).
 */
import * as Crypto from 'expo-crypto';
import { api, ApiError, NetworkError } from '../data/api';
import { queueClear, queueCount, queueDelete, queuePeek, queuePush, QueueTable } from '../data/db';
import { store } from '../state/store';
import type { LocationFix, LocationLog, UsageLog } from '../types';
import { Sample, shouldSampleLocation } from './analyticsPolicy';

// Số bản ghi tối đa gửi trong một lần (khớp giới hạn nhận của API).
const BATCH = 200;

/** Sinh session_id ngẫu nhiên; dự phòng bằng timestamp nếu crypto không khả dụng. */
function newSessionId(): string {
  try {
    return Crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Sinh một lần cho mỗi lần chạy app (module scope). */
export const SESSION_ID = newSessionId();

// Mẫu vị trí gần nhất (để áp chính sách lấy mẫu) và cờ chống flush chồng nhau.
let lastSample: Sample | null = null;
let flushing = false;

// Đọc từ store mỗi lần để luôn phản ánh cài đặt chia sẻ mới nhất.
const enabled = () => store.get().settings.shareAnonymousData;

/** Cập nhật số bản ghi đang chờ gửi để UI hiển thị. */
async function refreshPending(): Promise<void> {
  try {
    const n = (await queueCount('usage_queue')) + (await queueCount('location_queue'));
    store.set({ pendingUploads: n });
  } catch {
    /* bỏ qua */
  }
}

/** Ghi một lượt nghe vào hàng đợi (kèm session_id) rồi thử gửi ngay. */
export async function logPlayback(entry: Omit<UsageLog, 'session_id'>): Promise<void> {
  // Người dùng tắt chia sẻ dữ liệu → không ghi gì.
  if (!enabled()) return;
  await queuePush('usage_queue', { ...entry, session_id: SESSION_ID });
  await refreshPending();
  flush().catch(() => {});
}

/** Lấy mẫu vị trí ẩn danh nếu thoả chính sách (đủ 30 s hoặc đủ 25 m) rồi xếp hàng gửi. */
export async function sampleLocation(fix: LocationFix): Promise<void> {
  if (!enabled()) return;
  const s: Sample = { latitude: fix.latitude, longitude: fix.longitude, t: fix.timestamp };
  // Bỏ qua mẫu quá dày hoặc chưa đủ khoảng cách so với mẫu trước.
  if (!shouldSampleLocation(lastSample, s)) return;
  lastSample = s;
  const log: LocationLog = {
    session_id: SESSION_ID,
    latitude: fix.latitude,
    longitude: fix.longitude,
    recorded_at: new Date(fix.timestamp).toISOString(),
  };
  await queuePush('location_queue', log);
  await refreshPending();
}

/**
 * Gửi toàn bộ một bảng hàng đợi theo từng lô BATCH.
 * Trả về số bản ghi đã gửi; ném lỗi mạng để lần flush sau thử lại.
 */
async function flushTable<T extends object>(
  table: QueueTable,
  send: (base: string, rows: T[]) => Promise<unknown>,
): Promise<number> {
  const base = store.get().apiBase;
  let sent = 0;
  // Lặp đến khi bảng rỗng hoặc lô cuối chưa đầy (đã hết dữ liệu).
  for (;;) {
    const rows = await queuePeek<T>(table, BATCH);
    if (!rows.length) return sent;
    try {
      await send(base, rows.map((r) => r.payload));
      await queueDelete(table, rows.map((r) => r.id));
      sent += rows.length;
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        // Máy chủ từ chối cả lô nếu một bản ghi hỏng (ví dụ POI đã bị xoá) → gửi lẻ, bỏ bản ghi lỗi.
        for (const r of rows) {
          try {
            await send(base, [r.payload]);
          } catch (inner) {
            if (!(inner instanceof ApiError && inner.status === 400)) throw inner;
          }
          await queueDelete(table, [r.id]);
        }
        continue;
      }
      throw e;
    }
    if (rows.length < BATCH) return sent;
  }
}

/** Gửi hàng đợi lên máy chủ. Lỗi mạng → giữ lại, thử lần sau. */
export async function flush(): Promise<void> {
  if (flushing || !enabled()) return;
  flushing = true;
  try {
    const n =
      (await flushTable<UsageLog>('usage_queue', api.postUsage)) +
      (await flushTable<LocationLog>('location_queue', api.postLocations));
    if (n > 0) store.set({ online: true });
  } catch (e) {
    // Mất mạng: đánh dấu offline, hàng đợi vẫn còn nguyên cho lần sau.
    if (e instanceof NetworkError) store.set({ online: false });
  } finally {
    flushing = false;
    await refreshPending();
  }
}

/** Khi người dùng đổi cài đặt chia sẻ: tắt thì xoá toàn bộ dữ liệu đã xếp hàng. */
export async function onSharingChanged(on: boolean): Promise<void> {
  if (!on) {
    await queueClear('usage_queue');
    await queueClear('location_queue');
    lastSample = null;
  }
  await refreshPending();
}

export { refreshPending };
