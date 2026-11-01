/**
 * Đồng bộ nội dung (UC1 bước 2): GET /api/sync/version → nếu khác phiên bản trên máy thì tải /api/sync
 * và thay bảng nội dung trong một transaction. Sau lần đầu app chạy hoàn toàn từ SQLite.
 */
import { api, NetworkError } from './api';
import { countPois, kvGet, loadContent, replaceContent } from './db';
import { diffBundles, planSync, validateBundle } from './syncLogic';
import { collectAudioUrls, downloadAll, pruneAudio } from './audioCache';
import { store } from '../state/store';

/** Kết quả đồng bộ: cập nhật (kèm thống kê thay đổi), đã mới nhất, ngoại tuyến hoặc lỗi. */
export type SyncOutcome =
  | { status: 'updated'; version: number; added: number; updated: number; removed: number }
  | { status: 'up-to-date'; version: number }
  | { status: 'offline' }
  | { status: 'error'; message: string };

// Promise của lần đồng bộ đang chạy — gọi lặp sẽ dùng chung thay vì tải nhiều lần.
let running: Promise<SyncOutcome> | null = null;

/** Nạp nội dung từ SQLite vào store (dùng khi khởi động và sau đồng bộ). */
export async function loadLocalContent(): Promise<void> {
  const { pois, tours } = await loadContent();
  const v = await kvGet('content_version');
  const last = await kvGet('last_sync_at');
  store.set({ pois, tours, contentVersion: v != null ? Number(v) : null, lastSyncAt: last });
}

/** Đồng bộ nội dung ngay; `force` bỏ qua kiểm tra phiên bản và luôn tải gói mới. */
export function syncNow(opts: { force?: boolean } = {}): Promise<SyncOutcome> {
  if (running) return running;
  running = doSync(opts.force ?? false).finally(() => {
    running = null;
  });
  return running;
}

/** Luồng đồng bộ thực tế: so phiên bản → tải gói → kiểm tra → ghi transaction → tải audio nền. */
async function doSync(force: boolean): Promise<SyncOutcome> {
  const base = store.get().apiBase;
  store.set({ syncing: true, syncError: null });
  try {
    const localVersionRaw = await kvGet('content_version');
    const localVersion = localVersionRaw != null ? Number(localVersionRaw) : null;
    const hasData = (await countPois()) > 0;
    const localFormat = Number((await kvGet('sync_format')) ?? 1);
    const { version } = await api.syncVersion(base);
    // Máy đã có dữ liệu, đúng phiên bản và đúng định dạng → không cần tải.
    if (!force && planSync(localVersion, version, hasData, localFormat) === 'skip') {
      store.set({ syncing: false, online: true });
      return { status: 'up-to-date', version };
    }
    const bundle = validateBundle(await api.sync(base));
    // Tính diff trước khi ghi đè để báo cho UI biết thêm/sửa/xoá bao nhiêu mục.
    const { pois: oldPois, tours: oldTours } = store.get();
    const diff = diffBundles(oldPois, oldTours, bundle);
    await replaceContent(bundle);
    await loadLocalContent();
    store.set({ syncing: false, online: true });
    // Dọn audio không còn dùng; tải sẵn audio của ngôn ngữ đang chọn (nhẹ, chạy nền).
    pruneAudio(new Set(collectAudioUrls(bundle.pois))).catch(() => {});
    const lang = store.get().settings.language;
    downloadAll(collectAudioUrls(bundle.pois, lang), base).catch(() => {});
    return {
      status: 'updated',
      version: bundle.version,
      added: diff.added.length,
      updated: diff.updated.length,
      removed: diff.removed.length,
    };
  } catch (e: any) {
    const offline = e instanceof NetworkError;
    store.set({ syncing: false, syncError: e?.message ?? String(e), ...(offline ? { online: false } : {}) });
    return offline ? { status: 'offline' } : { status: 'error', message: e?.message ?? String(e) };
  }
}
