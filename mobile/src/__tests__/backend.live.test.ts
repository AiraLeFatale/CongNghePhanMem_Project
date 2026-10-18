/**
 * Kiểm thử tích hợp với backend thật (không ghi dữ liệu). Chạy: LIVE_API=http://localhost:4000 npx jest backend.live
 * Bỏ qua khi không đặt LIVE_API.
 */
import { validateBundle } from '../data/syncLogic';
import { GeofenceEngine } from '../engine/geofence';
import { stepTowards } from '../engine/geo';
import { parseQrPayload, qrApiPath } from '../engine/qr';

const BASE = process.env.LIVE_API;

// jest-expo thay fetch toàn cục bằng bản mock của Expo → dùng node:http trực tiếp.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require('node:http');
function call(path: string, method = 'GET', body?: unknown): Promise<{ status: number; json(): Promise<any> }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(`${BASE}${path}`, { method, headers: data ? { 'Content-Type': 'application/json' } : {} }, (res: any) => {
      let s = '';
      res.on('data', (c: { toString(): string }) => (s += c.toString()));
      res.on('end', () => resolve({ status: res.statusCode, json: async () => JSON.parse(s) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
const d = BASE ? describe : describe.skip;

d('backend thật', () => {
  let bundle: ReturnType<typeof validateBundle>;

  beforeAll(async () => {
    const raw = await (await call('/api/sync')).json();
    bundle = validateBundle(raw);
  });

  it('/api/sync/version khớp version trong gói', async () => {
    const v = await (await call('/api/sync/version')).json();
    expect(v.version).toBe(bundle.version);
    expect(bundle.pois.length).toBeGreaterThan(0);
  });

  it('mọi QR trong gói đồng bộ giải được qua /api/qr và trỏ cùng POI', async () => {
    expect(bundle.qrcodes!.length).toBeGreaterThan(0);
    for (const q of bundle.qrcodes!) {
      const parsed = parseQrPayload(`NARR:${q.payload}`)!;
      expect(parsed.code).toBe(q.payload);
      const res = await call(qrApiPath(parsed));
      expect(res.status).toBe(200);
      expect((await res.json()).poi.id).toBe(q.poi_id);
    }
  });

  it('QR sai → 404 với thông báo tiếng Việt', async () => {
    const res = await call(qrApiPath(parseQrPayload('NARR:khongtontai123')!));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('NOT_FOUND');
  });

  it('đi bộ mô phỏng dọc từng tour kích hoạt đủ các điểm theo đúng thứ tự', () => {
    for (const tour of bundle.tours) {
      const pois = tour.poi_ids.map((id) => bundle.pois.find((p) => p.id === id)!);
      const g = new GeofenceEngine(bundle.pois);
      let pos = { latitude: pois[0].latitude - 0.002, longitude: pois[0].longitude };
      const triggered: number[] = [];
      for (const target of pois) {
        for (let i = 0; i < 2000; i++) {
          const r = stepTowards(pos, target, 7);
          pos = r.point;
          const res = g.update({ ...pos, accuracy: 5 });
          if (res.trigger) triggered.push(res.trigger.poiId);
          if (r.arrived) break;
        }
      }
      // Các điểm trong tour phải xuất hiện theo thứ tự (có thể xen điểm ngoài tour nằm trên đường đi).
      const inTour = triggered.filter((id) => tour.poi_ids.includes(id));
      const firsts = inTour.filter((id, i) => inTour.indexOf(id) === i);
      expect(firsts).toEqual(tour.poi_ids);
    }
  });

  it('POST /api/logs/usage từ chối session_id sai (không ghi dữ liệu)', async () => {
    const res = await call('/api/logs/usage', 'POST', [
      { poi_id: bundle.pois[0].id, session_id: 'x', trigger_method: 'qr', language_code: 'vi', listen_seconds: 1 },
    ]);
    expect(res.status).toBe(400);
  });
});
