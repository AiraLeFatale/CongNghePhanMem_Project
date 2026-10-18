import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

let s;
before(async () => { s = await startServer(); await s.login(); });
after(() => s.close());

const sid = 'sess-abcdef12';

test('UC1/UC2: ghi log lượt nghe (một bản ghi và gửi theo lô)', async () => {
  const one = await s.call('POST', '/logs/usage', { poi_id: 1, session_id: sid, trigger_method: 'geofence', language_code: 'vi', listen_seconds: 40 }, { auth: false });
  assert.equal(one.status, 201);
  const batch = await s.call('POST', '/logs/usage', [
    { poi_id: 2, session_id: sid, trigger_method: 'qr', language_code: 'en', listen_seconds: 20, played_at: new Date().toISOString() },
    { poi_id: 2, session_id: sid, trigger_method: 'manual', language_code: 'en', listen_seconds: 30 },
  ], { auth: false });
  assert.equal(batch.body.inserted, 2);
});

test('lô log có POI đã xoá: bỏ qua bản ghi đó', async () => {
  const r = await s.call('POST', '/logs/usage', [
    { poi_id: 999, session_id: sid, trigger_method: 'qr', language_code: 'vi' },
    { poi_id: 3, session_id: 'sess-other123', trigger_method: 'qr', language_code: 'vi', played_at: '2001-01-01T00:00:00Z' },
  ], { auth: false });
  assert.equal(r.status, 201);
  assert.deepEqual(r.body, { inserted: 1, skipped: 1 });
});

test('log sai dữ liệu → 400', async () => {
  assert.equal((await s.call('POST', '/logs/usage', { poi_id: 999, session_id: sid, trigger_method: 'qr', language_code: 'vi' }, { auth: false })).status, 400);
  assert.equal((await s.call('POST', '/logs/usage', { poi_id: 1, session_id: 'x', trigger_method: 'qr', language_code: 'vi' }, { auth: false })).status, 400);
  assert.equal((await s.call('POST', '/logs/usage', { poi_id: 1, session_id: sid, trigger_method: 'bay', language_code: 'vi' }, { auth: false })).status, 400);
});

test('log vị trí được làm tròn (ẩn danh)', async () => {
  const r = await s.call('POST', '/logs/location', [{ session_id: sid, latitude: 10.761234567, longitude: 106.703987654 }, { session_id: sid, latitude: 10.7615, longitude: 106.704 }], { auth: false });
  assert.equal(r.status, 201);
  const row = s.db.prepare('SELECT latitude, longitude FROM location_log LIMIT 1').get();
  assert.equal(row.latitude, 10.7612);
  assert.equal(row.longitude, 106.704);
});

test('UC5: báo cáo thống kê', async () => {
  const r = await s.call('GET', '/admin/analytics?from=2020-01-01');
  assert.equal(r.status, 200);
  assert.equal(r.body.has_data, true);
  assert.equal(r.body.summary.plays, 3);
  assert.equal(r.body.summary.sessions, 1);
  assert.equal(r.body.per_poi[0].poi_id, 2);
  assert.equal(r.body.per_poi[0].plays, 2);
  assert.equal(r.body.per_poi[0].avg_listen_seconds, 25);
  assert.ok(r.body.heatmap.length >= 1);
  assert.equal(r.body.routes.length, 1);
  assert.equal(r.body.routes[0].session_id, undefined, 'không lộ session_id');
});

test('UC5: lọc theo tour', async () => {
  // tour 2 gồm POI 8,7,2,3 → chỉ tính lượt của POI 2
  const r = await s.call('GET', '/admin/analytics?tour_id=2&from=2020-01-01');
  assert.equal(r.body.summary.plays, 2);
});

test('UC5 E1: khoảng ngày không có dữ liệu', async () => {
  const r = await s.call('GET', '/admin/analytics?from=2000-01-01&to=2000-01-31');
  assert.equal(r.status, 200);
  assert.equal(r.body.has_data, false);
  assert.equal(r.body.summary.plays, 0);
});

test('UC5: bộ lọc sai → 400', async () => {
  assert.equal((await s.call('GET', '/admin/analytics?from=abc')).status, 400);
  assert.equal((await s.call('GET', '/admin/analytics?from=2026-02-01&to=2026-01-01')).status, 400);
  assert.equal((await s.call('GET', '/admin/analytics?tour_id=999')).status, 400);
});

test('dữ liệu demo sinh đủ cho biểu đồ', async () => {
  const d = await startServer({ demo: true });
  await d.login();
  const r = await d.call('GET', '/admin/analytics');
  assert.ok(r.body.summary.plays > 300);
  assert.ok(r.body.daily.length > 10);
  await d.close();
});
