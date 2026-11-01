/**
 * Chế độ "Mô phỏng vị trí" cho buổi demo trên emulator: chạm bản đồ để đặt vị trí giả,
 * hoặc tự đi bộ dọc các điểm của một tour. Vị trí giả đi qua đúng pipeline geofence như GPS thật.
 */
import { haversineMeters, LatLng, stepTowards } from '../engine/geo';
import { notify, store } from '../state/store';
import { handleFix, narration } from './pipeline';
import { t } from '../i18n';

// Nhịp cập nhật vị trí giả, tốc độ đi bộ mặc định và số tick dừng lại ở mỗi điểm.
const TICK_MS = 1000;
const WALK_SPEED_MPS = 1.4;
const DWELL_TICKS = 3;

// Timer của chế độ tự đi bộ (null khi không chạy).
let timer: ReturnType<typeof setInterval> | null = null;

/** Đặt vị trí giả tại một toạ độ và đẩy qua pipeline như một bản ghi GPS thật. */
export function setSimulatedLocation(p: LatLng): void {
  handleFix({ latitude: p.latitude, longitude: p.longitude, accuracy: 5, timestamp: Date.now(), source: 'simulation' });
}

/** Điểm xuất phát cách điểm đầu tiên ~200 m (về phía ngược điểm thứ hai) để thấy rõ lúc "đi vào" vùng. */
function startPoint(points: LatLng[]): LatLng {
  const first = points[0];
  const second = points[1];
  if (!second) return { latitude: first.latitude - 0.0018, longitude: first.longitude };
  const d = haversineMeters(first, second) || 1;
  const k = 200 / d;
  return {
    latitude: first.latitude - (second.latitude - first.latitude) * k,
    longitude: first.longitude - (second.longitude - first.longitude) * k,
  };
}

/**
 * Bắt đầu tự đi bộ dọc các POI của tour; trả về false nếu tour không tồn tại
 * hoặc không có POI nào. Timer 1 giây/lần đẩy vị trí giả qua handleFix.
 */
export function startTourWalk(tourId: number): boolean {
  const s = store.get();
  const tour = s.tours.find((x) => x.id === tourId);
  if (!tour) return false;
  // Lấy toạ độ của các POI theo đúng thứ tự trong tour.
  const points = tour.poi_ids
    .map((id) => s.pois.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  if (!points.length) return false;
  stopTourWalk();

  // Đang có vị trí giả thì đi tiếp từ đó, ngược lại xuất phát cách POI đầu ~200 m.
  let pos = s.fix?.source === 'simulation' ? { latitude: s.fix.latitude, longitude: s.fix.longitude } : startPoint(points);
  let target = 0;
  let dwell = 0;
  setSimulatedLocation(pos);
  store.set({ simWalkingTourId: tourId, follow: { tourId, nextIndex: 0 } });

  timer = setInterval(() => {
    // Dừng bước khi đang thuyết minh để người nghe kịp nghe hết (thuận tiện cho demo).
    if (narration.isPlaying) return;
    if (dwell > 0) {
      dwell--;
      return;
    }
    // Mỗi tick tiến một đoạn ngắn về phía POI mục tiêu (tốc độ theo cài đặt).
    const step = WALK_SPEED_MPS * store.get().settings.simSpeed * (TICK_MS / 1000);
    const r = stepTowards(pos, points[target], step);
    pos = r.point;
    setSimulatedLocation(pos);
    if (r.arrived) {
      // Tới điểm: chuyển mục tiêu, dừng vài tick rồi đi tiếp.
      target++;
      dwell = DWELL_TICKS;
      if (target >= points.length) {
        stopTourWalk();
        notify(t('sim.walkDone'), 'info');
      }
    }
  }, TICK_MS);
  return true;
}

/** Dừng chế độ tự đi bộ và xoá cờ tour đang mô phỏng trong store. */
export function stopTourWalk(): void {
  if (timer) clearInterval(timer);
  timer = null;
  if (store.get().simWalkingTourId != null) store.set({ simWalkingTourId: null });
}
