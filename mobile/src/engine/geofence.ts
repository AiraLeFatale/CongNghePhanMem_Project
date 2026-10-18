/**
 * Geofence engine (UC1 bước 5–6) — thuần TypeScript, không phụ thuộc Expo để kiểm thử được.
 *
 * Quy tắc:
 *  - Bỏ qua bản ghi GPS có độ chính xác kém hơn `maxAccuracyM` (mặc định 60 m).
 *  - VÀO vùng khi khoảng cách ≤ radius.
 *  - RA vùng khi khoảng cách > radius × hysteresis (mặc định 1,2) — tránh bật/tắt liên tục ở mép vùng.
 *  - Trong các POI đang ở bên trong, chọn priority cao nhất, hoà thì gần nhất.
 *  - Mỗi "lượt ghé" một POI chỉ phát sự kiện kích hoạt một lần; ra khỏi vùng rồi vào lại mới tính lượt mới.
 *    (Chống lặp theo thời gian — cooldown — do Narration engine đảm nhận.)
 */
import { haversineMeters, LatLng } from './geo';

export interface GeofenceRegion {
  id: number;
  latitude: number;
  longitude: number;
  radius_m: number;
  priority: number;
}

export interface GeofenceOptions {
  maxAccuracyM: number;
  hysteresis: number;
}

export const DEFAULT_GEOFENCE_OPTIONS: GeofenceOptions = { maxAccuracyM: 60, hysteresis: 1.2 };

export interface GeofenceFix extends LatLng {
  accuracy: number | null;
}

export interface GeofenceTrigger {
  poiId: number;
  distanceM: number;
  priority: number;
}

export interface GeofenceResult {
  /** true nếu bản ghi bị loại vì độ chính xác kém. */
  ignored: boolean;
  entered: number[];
  exited: number[];
  /** Danh sách POI đang ở bên trong (sau cập nhật). */
  inside: number[];
  /** POI được chọn để thuyết minh ở lần cập nhật này (nếu có). */
  trigger: GeofenceTrigger | null;
  /** Khoảng cách tới từng POI (m) — UI dùng để hiển thị. */
  distances: Record<number, number>;
}

/** Chọn POI tốt nhất: priority cao nhất, sau đó gần nhất, sau đó id nhỏ hơn (ổn định). */
export function pickBest<T extends { priority: number; distanceM: number; id: number }>(items: T[]): T | null {
  let best: T | null = null;
  for (const it of items) {
    if (
      !best ||
      it.priority > best.priority ||
      (it.priority === best.priority && it.distanceM < best.distanceM) ||
      (it.priority === best.priority && it.distanceM === best.distanceM && it.id < best.id)
    ) {
      best = it;
    }
  }
  return best;
}

export class GeofenceEngine {
  private regions: GeofenceRegion[] = [];
  private inside = new Set<number>();
  private triggeredThisVisit = new Set<number>();
  private opts: GeofenceOptions;

  constructor(regions: GeofenceRegion[] = [], opts: Partial<GeofenceOptions> = {}) {
    this.opts = { ...DEFAULT_GEOFENCE_OPTIONS, ...opts };
    this.setRegions(regions);
  }

  /** Cập nhật danh sách POI (sau đồng bộ). Giữ trạng thái của POI còn tồn tại. */
  setRegions(regions: GeofenceRegion[]): void {
    this.regions = regions.filter(
      (r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && r.radius_m > 0,
    );
    const ids = new Set(this.regions.map((r) => r.id));
    for (const id of [...this.inside]) if (!ids.has(id)) this.inside.delete(id);
    for (const id of [...this.triggeredThisVisit]) if (!ids.has(id)) this.triggeredThisVisit.delete(id);
  }

  setOptions(opts: Partial<GeofenceOptions>): void {
    this.opts = { ...this.opts, ...opts };
  }

  getInside(): number[] {
    return [...this.inside];
  }

  /** Xoá toàn bộ trạng thái (ví dụ khi bật/tắt chế độ mô phỏng). */
  reset(): void {
    this.inside.clear();
    this.triggeredThisVisit.clear();
  }

  update(fix: GeofenceFix): GeofenceResult {
    const empty: GeofenceResult = {
      ignored: true,
      entered: [],
      exited: [],
      inside: this.getInside(),
      trigger: null,
      distances: {},
    };
    if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return empty;
    if (fix.accuracy != null && fix.accuracy > this.opts.maxAccuracyM) return empty;

    const entered: number[] = [];
    const exited: number[] = [];
    const distances: Record<number, number> = {};

    for (const r of this.regions) {
      const d = haversineMeters(fix, r);
      distances[r.id] = d;
      const wasInside = this.inside.has(r.id);
      if (!wasInside && d <= r.radius_m) {
        this.inside.add(r.id);
        entered.push(r.id);
      } else if (wasInside && d > r.radius_m * this.opts.hysteresis) {
        this.inside.delete(r.id);
        this.triggeredThisVisit.delete(r.id);
        exited.push(r.id);
      }
    }

    const candidates = this.regions
      .filter((r) => this.inside.has(r.id))
      .map((r) => ({ id: r.id, priority: r.priority, distanceM: distances[r.id] }));
    const best = pickBest(candidates);

    let trigger: GeofenceTrigger | null = null;
    if (best && !this.triggeredThisVisit.has(best.id)) {
      this.triggeredThisVisit.add(best.id);
      trigger = { poiId: best.id, distanceM: best.distanceM, priority: best.priority };
    }

    return { ignored: false, entered, exited, inside: this.getInside(), trigger, distances };
  }
}
