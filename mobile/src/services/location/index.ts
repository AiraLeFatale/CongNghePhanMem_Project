/**
 * Location service (UC1 bước 1, 3–4).
 *  - Xin quyền vị trí; bị từ chối → UI giải thích và dừng (E1).
 *  - GPS tiền cảnh bằng watchPositionAsync (chạy được trong Expo Go).
 *  - GPS nền bằng startLocationUpdatesAsync + TaskManager (chỉ development build / standalone).
 */
import * as Location from 'expo-location';
import { IS_EXPO_GO } from '../../config';
import { store } from '../../state/store';
import type { LocationFix } from '../../types';
import { handleFix } from '../pipeline';
import { BACKGROUND_LOCATION_TASK, getTaskManager, setBackgroundFixHandler } from './backgroundTask';

let watcher: Location.LocationSubscription | null = null;

/** Chuyển LocationObject của expo-location sang LocationFix nội bộ kèm nguồn dữ liệu. */
const toFix = (l: Location.LocationObject, source: LocationFix['source']): LocationFix => ({
  latitude: l.coords.latitude,
  longitude: l.coords.longitude,
  accuracy: l.coords.accuracy ?? null,
  timestamp: l.timestamp || Date.now(),
  source,
});

// Nối tác vụ vị trí nền vào pipeline ngay khi module được nạp.
setBackgroundFixHandler((loc) => handleFix(toFix(loc, 'background')));

/** Kiểm tra quyền vị trí hiện có (không mở hộp thoại xin quyền). */
export async function checkForegroundPermission(): Promise<boolean> {
  try {
    const p = await Location.getForegroundPermissionsAsync();
    store.set({ locationPermission: p.granted ? 'granted' : p.canAskAgain ? 'unknown' : 'denied' });
    return p.granted;
  } catch {
    store.set({ locationPermission: 'unavailable' });
    return false;
  }
}

/** Mở hộp thoại xin quyền vị trí tiền cảnh; cập nhật trạng thái quyền vào store. */
export async function requestForegroundPermission(): Promise<boolean> {
  try {
    const p = await Location.requestForegroundPermissionsAsync();
    store.set({ locationPermission: p.granted ? 'granted' : 'denied' });
    return p.granted;
  } catch {
    store.set({ locationPermission: 'unavailable' });
    return false;
  }
}

/** Bắt đầu theo dõi GPS khi app mở; trả về false nếu thiếu quyền hoặc lỗi. */
export async function startForegroundTracking(): Promise<boolean> {
  if (watcher) return true;
  if (store.get().locationPermission !== 'granted') return false;
  try {
    // Lấy nhanh vị trí gần nhất để bản đồ có điểm xuất phát.
    Location.getLastKnownPositionAsync({ maxAge: 60_000 })
      .then((l) => l && handleFix(toFix(l, 'gps')))
      .catch(() => {});
    watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
      (l) => handleFix(toFix(l, 'gps')),
      () => {},
    );
    return true;
  } catch {
    return false;
  }
}

/** Huỷ watcher GPS tiền cảnh (an toàn khi chưa từng bật). */
export function stopForegroundTracking(): void {
  watcher?.remove();
  watcher = null;
}

/** Kết quả bật GPS nền: đang chạy, môi trường không hỗ trợ, bị từ chối quyền hoặc lỗi. */
export type BackgroundStartResult = 'running' | 'unsupported' | 'denied' | 'error';

/**
 * Bật GPS nền bằng TaskManager (chỉ development build/standalone).
 * Trả về trạng thái để bootstrap quyết định có hạ cấp về GPS tiền cảnh hay không.
 */
export async function startBackgroundTracking(): Promise<BackgroundStartResult> {
  // Expo Go không có native module vị trí nền.
  if (IS_EXPO_GO) {
    store.set({ backgroundStatus: 'unsupported' });
    return 'unsupported';
  }
  try {
    const TaskManager = getTaskManager();
    // Thiếu TaskManager hoặc chưa defineTask → không thể chạy nền.
    if (!TaskManager || !(await TaskManager.isAvailableAsync()) || !TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
      store.set({ backgroundStatus: 'unsupported' });
      return 'unsupported';
    }
    // Android/iOS yêu cầu quyền tiền cảnh trước khi xin quyền nền.
    if (!(await requestForegroundPermission())) return 'denied';
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (!bg.granted) {
      store.set({ backgroundStatus: 'denied' });
      return 'denied';
    }
    if (!(await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK))) {
      // Đăng ký cập nhật định kỳ; foregroundService giữ tiến trình sống trên Android.
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10,
        timeInterval: 5000,
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.Fitness,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Thuyết minh tự động đang bật',
          notificationBody: 'Ứng dụng dùng vị trí để phát thuyết minh khi bạn tới điểm tham quan.',
          killServiceOnDestroy: true,
        },
      });
    }
    // Nền đã cấp vị trí cho cả lúc app mở → tắt watcher tiền cảnh để không nhận trùng.
    stopForegroundTracking();
    store.set({ backgroundStatus: 'running' });
    return 'running';
  } catch {
    store.set({ backgroundStatus: 'unsupported' });
    return 'error';
  }
}

/** Tắt GPS nền nếu đang chạy và cập nhật trạng thái về 'off'. */
export async function stopBackgroundTracking(): Promise<void> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {
    /* bỏ qua */
  }
  if (store.get().backgroundStatus === 'running') store.set({ backgroundStatus: 'off' });
}

/** Bật theo cài đặt hiện tại: nền nếu được bật và hỗ trợ, ngược lại tiền cảnh. */
export async function startTracking(): Promise<void> {
  if (store.get().locationPermission !== 'granted') return;
  if (store.get().settings.backgroundLocation) {
    const r = await startBackgroundTracking();
    if (r === 'running') return;
  }
  await startForegroundTracking();
}
