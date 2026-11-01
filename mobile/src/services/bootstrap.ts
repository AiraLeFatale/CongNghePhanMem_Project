/** Khởi động app: SQLite → cài đặt → nội dung offline → đồng bộ → vị trí; và các vòng lặp định kỳ. */
import NetInfo from '@react-native-community/netinfo';
import { AppState as RNAppState } from 'react-native';
import { defaultApiUrl, FLUSH_INTERVAL_MS, normalizeApiUrl, SYNC_INTERVAL_MS } from '../config';
import { getDb } from '../data/db';
import { loadSettings, saveSettings } from '../data/settings';
import { loadLocalContent, syncNow } from '../data/sync';
import { notify, Settings, store } from '../state/store';
import { flush, onSharingChanged, refreshPending } from './analytics';
import { configureAudioSession } from './audioOutput';
import {
  checkForegroundPermission,
  requestForegroundPermission,
  startForegroundTracking,
  startTracking,
  stopBackgroundTracking,
} from './location';
import { applySettingsToEngines, refreshRegions, resetGeofence } from './pipeline';
import { stopTourWalk } from './simulation';
import { t } from '../i18n';

// Chỉ cho bootstrap chạy một lần dù được gọi từ nhiều nơi.
let started = false;

/** Chọn URL API: ưu tiên cấu hình người dùng, nếu trống thì dùng mặc định. */
export function apiBaseFor(s: Settings): string {
  return s.serverUrl.trim() ? normalizeApiUrl(s.serverUrl) : defaultApiUrl();
}

/**
 * Đồng bộ nội dung từ máy chủ; cập nhật geofence khi có bản mới.
 * force: bỏ qua kiểm tra phiên bản; announce: hiện thông báo kết quả cho người dùng.
 */
export async function runSync(force = false, announce = false) {
  const r = await syncNow({ force });
  if (r.status === 'updated') {
    refreshRegions();
    if (announce) notify(t('sync.updated', { v: r.version }), 'info');
  } else if (announce) {
    if (r.status === 'up-to-date') notify(t('sync.upToDate', { v: r.version }), 'info');
    else if (r.status === 'offline') notify(t('sync.offline'), 'warn');
    else notify(t('sync.error', { msg: r.message }), 'error');
  }
  if (r.status !== 'offline') flush().catch(() => {});
  return r;
}

/**
 * Khởi động ứng dụng theo thứ tự: SQLite → cài đặt → nội dung offline → động cơ
 * → đồng bộ/nền tảng → quyền vị trí. Gọi nhiều lần cũng chỉ chạy một lần.
 */
export async function bootstrap(): Promise<void> {
  if (started) return;
  started = true;
  try {
    await getDb();
    const settings = await loadSettings(store.get().settings);
    store.set({ settings, apiBase: apiBaseFor(settings) });
    // Nạp nội dung đã lưu để app dùng được ngay cả khi chưa có mạng.
    await loadLocalContent();
    refreshRegions();
    applySettingsToEngines();
    await refreshPending();
    await configureAudioSession();
    store.set({ ready: true });
  } catch (e: any) {
    // Lỗi khởi tạo vẫn phải mở UI để hiển thị thông báo cho người dùng.
    store.set({ ready: true, initError: e?.message ?? String(e) });
    return;
  }

  runSync().catch(() => {});

  NetInfo.addEventListener((s) => {
    const connected = s.isConnected !== false && s.isInternetReachable !== false;
    if (!connected) store.set({ online: false });
    else if (store.get().online === false) {
      // Có mạng lại → thử đồng bộ và gửi hàng đợi.
      store.set({ online: null });
      runSync().catch(() => {});
    }
  });
  // Đồng bộ nội dung và gửi analytics định kỳ khi app đang mở.
  setInterval(() => runSync().catch(() => {}), SYNC_INTERVAL_MS);
  setInterval(() => flush().catch(() => {}), FLUSH_INTERVAL_MS);
  RNAppState.addEventListener('change', (st) => {
    // Vào nền: tranh thủ gửi hàng đợi; quay lại: kiểm tra nội dung mới.
    if (st === 'background') flush().catch(() => {});
    if (st === 'active') runSync().catch(() => {});
  });

  // UC1 bước 1: xin quyền vị trí.
  // Chỉ hỏi khi chưa từng quyết định, tránh làm phiền người dùng đã từ chối.
  const granted = (await checkForegroundPermission()) || (store.get().locationPermission === 'unknown' && (await requestForegroundPermission()));
  if (granted) await startTracking();
}

/** Thử xin quyền lại (nút trên màn hình E1). */
export async function retryLocationPermission(): Promise<boolean> {
  const ok = await requestForegroundPermission();
  if (ok) await startTracking();
  return ok;
}

/** Áp cài đặt mới: lưu xuống SQLite và xử lý các thay đổi cần khởi động lại dịch vụ. */
export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const prev = store.get().settings;
  const next = { ...prev, ...patch };
  store.set({ settings: next });
  await saveSettings(next);

  // Cooldown ảnh hưởng trực tiếp tới bộ lọc của Narration engine.
  if (patch.cooldownMinutes != null) applySettingsToEngines();
  if (patch.serverUrl != null && patch.serverUrl !== prev.serverUrl) {
    // Đổi máy chủ → cập nhật base URL và đồng bộ lại ngay.
    store.set({ apiBase: apiBaseFor(next), online: null });
    runSync(true, true).catch(() => {});
  }
  if (patch.shareAnonymousData != null && patch.shareAnonymousData !== prev.shareAnonymousData) {
    // Tắt chia sẻ sẽ xoá toàn bộ dữ liệu đã xếp hàng.
    await onSharingChanged(patch.shareAnonymousData);
  }
  if (patch.simulation != null && patch.simulation !== prev.simulation) {
    // Đổi nguồn vị trí → dừng tour đang đi bộ và xoá trạng thái geofence cũ.
    stopTourWalk();
    resetGeofence();
    if (!patch.simulation) await startTracking();
  }
  if (patch.backgroundLocation != null && patch.backgroundLocation !== prev.backgroundLocation) {
    if (patch.backgroundLocation) {
      await startTracking();
    } else {
      // Tắt GPS nền → quay lại chỉ theo dõi khi app mở.
      await stopBackgroundTracking();
      await startForegroundTracking();
    }
  }
}
