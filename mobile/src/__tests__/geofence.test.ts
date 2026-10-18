import { haversineMeters, stepTowards } from '../engine/geo';
import { GeofenceEngine, pickBest } from '../engine/geofence';
import { CAU_MONG, NHA_RONG, north } from './fixtures';

const fix = (p: { latitude: number; longitude: number }, accuracy: number | null = 5) => ({ ...p, accuracy });

describe('haversine', () => {
  it('0 m cho cùng một điểm', () => expect(haversineMeters(NHA_RONG, NHA_RONG)).toBe(0));
  it('xấp xỉ đúng khoảng cách 100 m về phía bắc', () => {
    expect(haversineMeters(NHA_RONG, north(NHA_RONG, 100))).toBeCloseTo(100, 0);
  });
  it('Bến Nhà Rồng ↔ Cầu Mống khoảng 290 m', () => {
    const d = haversineMeters(NHA_RONG, CAU_MONG);
    expect(d).toBeGreaterThan(250);
    expect(d).toBeLessThan(320);
  });
  it('stepTowards tiến đúng quãng và báo tới nơi', () => {
    const a = north(NHA_RONG, -100);
    const r = stepTowards(a, NHA_RONG, 30);
    expect(r.arrived).toBe(false);
    expect(haversineMeters(r.point, NHA_RONG)).toBeCloseTo(70, 0);
    expect(stepTowards(r.point, NHA_RONG, 500).arrived).toBe(true);
  });
});

describe('GeofenceEngine', () => {
  it('vào vùng khi khoảng cách ≤ bán kính và phát trigger một lần', () => {
    const g = new GeofenceEngine([NHA_RONG]);
    expect(g.update(fix(north(NHA_RONG, 150))).trigger).toBeNull();
    const r = g.update(fix(north(NHA_RONG, 79)));
    expect(r.entered).toEqual([1]);
    expect(r.trigger?.poiId).toBe(1);
    // vẫn ở trong → không phát lại
    expect(g.update(fix(north(NHA_RONG, 10))).trigger).toBeNull();
  });

  it('đúng bằng bán kính vẫn tính là vào', () => {
    const g = new GeofenceEngine([{ ...NHA_RONG, radius_m: 100 }]);
    expect(g.update(fix(north(NHA_RONG, 99.9))).entered).toEqual([1]);
  });

  it('hysteresis: chỉ ra khi > bán kính × 1,2', () => {
    const g = new GeofenceEngine([NHA_RONG]); // r = 80 → ngưỡng ra 96 m
    g.update(fix(north(NHA_RONG, 50)));
    let r = g.update(fix(north(NHA_RONG, 90)));
    expect(r.exited).toEqual([]);
    expect(r.inside).toEqual([1]);
    r = g.update(fix(north(NHA_RONG, 97)));
    expect(r.exited).toEqual([1]);
    expect(r.inside).toEqual([]);
  });

  it('dao động quanh mép vùng không gây kích hoạt lặp', () => {
    const g = new GeofenceEngine([NHA_RONG]);
    let triggers = 0;
    for (const m of [85, 78, 82, 79, 90, 76, 88, 80]) if (g.update(fix(north(NHA_RONG, m))).trigger) triggers++;
    expect(triggers).toBe(1);
  });

  it('ra hẳn rồi vào lại → lượt ghé mới, phát trigger lần nữa', () => {
    const g = new GeofenceEngine([NHA_RONG]);
    g.update(fix(NHA_RONG));
    g.update(fix(north(NHA_RONG, 200)));
    expect(g.update(fix(NHA_RONG)).trigger?.poiId).toBe(1);
  });

  it('bỏ qua bản ghi có độ chính xác kém hơn 60 m', () => {
    const g = new GeofenceEngine([NHA_RONG]);
    const r = g.update(fix(NHA_RONG, 75));
    expect(r.ignored).toBe(true);
    expect(r.trigger).toBeNull();
    expect(g.getInside()).toEqual([]);
    expect(g.update(fix(NHA_RONG, 60)).trigger?.poiId).toBe(1); // đúng 60 m vẫn nhận
  });

  it('accuracy null (không rõ) vẫn được xử lý', () => {
    const g = new GeofenceEngine([NHA_RONG]);
    expect(g.update(fix(NHA_RONG, null)).ignored).toBe(false);
  });

  it('nhiều vùng chồng nhau: chọn priority cao nhất', () => {
    const low = { ...CAU_MONG, id: 9, latitude: NHA_RONG.latitude, longitude: NHA_RONG.longitude, radius_m: 300, priority: 1 };
    const g = new GeofenceEngine([low, NHA_RONG]);
    const r = g.update(fix(north(NHA_RONG, 40)));
    expect(r.inside.sort()).toEqual([1, 9]);
    expect(r.trigger?.poiId).toBe(1);
  });

  it('cùng priority: chọn điểm gần nhất', () => {
    const a = { ...NHA_RONG, id: 1, priority: 5, radius_m: 500 };
    const b = { ...CAU_MONG, id: 2, priority: 5, radius_m: 500 };
    const g = new GeofenceEngine([a, b]);
    expect(g.update(fix(north(CAU_MONG, 10))).trigger?.poiId).toBe(2);
  });

  it('khi rời điểm ưu tiên cao mà vẫn trong điểm thấp hơn → kích hoạt điểm thấp hơn', () => {
    const big = { ...CAU_MONG, id: 9, latitude: NHA_RONG.latitude, longitude: NHA_RONG.longitude, radius_m: 400, priority: 1 };
    const g = new GeofenceEngine([big, NHA_RONG]);
    expect(g.update(fix(NHA_RONG)).trigger?.poiId).toBe(1);
    const r = g.update(fix(north(NHA_RONG, 200)));
    expect(r.exited).toEqual([1]);
    expect(r.trigger?.poiId).toBe(9);
  });

  it('pickBest ổn định khi hoà hoàn toàn (id nhỏ hơn)', () => {
    expect(pickBest([{ id: 3, priority: 1, distanceM: 5 }, { id: 2, priority: 1, distanceM: 5 }])?.id).toBe(2);
    expect(pickBest([])).toBeNull();
  });

  it('setRegions giữ trạng thái POI còn tồn tại và bỏ POI bị xoá', () => {
    const g = new GeofenceEngine([NHA_RONG, CAU_MONG]);
    g.update(fix(NHA_RONG));
    g.setRegions([NHA_RONG]);
    expect(g.getInside()).toEqual([1]);
    g.setRegions([CAU_MONG]);
    expect(g.getInside()).toEqual([]);
  });

  it('bỏ qua POI có bán kính không hợp lệ', () => {
    const g = new GeofenceEngine([{ ...NHA_RONG, radius_m: 0 }]);
    expect(g.update(fix(NHA_RONG)).trigger).toBeNull();
  });
});
