import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';
import { extractPayload } from '../src/services/qrService.js';

let s;
before(async () => { s = await startServer(); await s.login(); });
after(() => s.close());

test('UC3 A2: tạo mã QR cho POI và UC2: quét ra đúng nội dung', async () => {
  const qr = await s.call('POST', '/admin/pois/3/qrcodes', { label: 'Trạm thử' });
  assert.equal(qr.status, 201);
  assert.match(qr.body.content, /^NARR:/);
  const r = await s.call('GET', `/qr/${encodeURIComponent(qr.body.content)}`, undefined, { auth: false });
  assert.equal(r.status, 200);
  assert.equal(r.body.poi.id, 3);
  assert.ok(r.body.poi.translations.length >= 1);
});

test('UC2 E1: mã QR không hợp lệ → 404', async () => {
  const r = await s.call('GET', '/qr/NARR:khongtontai', undefined, { auth: false });
  assert.equal(r.status, 404);
});

test('extractPayload nhận cả dạng URL', () => {
  assert.equal(extractPayload('https://example.com/q/abcDEF123'), 'abcDEF123');
  assert.equal(extractPayload('NARR:xyz12345'), 'xyz12345');
});

test('xoá mã QR', async () => {
  const qr = (await s.call('POST', '/admin/pois/3/qrcodes', {})).body;
  assert.equal((await s.call('DELETE', `/admin/qrcodes/${qr.id}`)).status, 204);
  assert.equal((await s.call('GET', `/qr/${qr.payload}`, undefined, { auth: false })).status, 404);
});

test('UC4: tạo tour theo đúng thứ tự', async () => {
  const r = await s.call('POST', '/admin/tours', { name: 'Tour thử', description: 'x', poi_ids: [3, 1, 2] });
  assert.equal(r.status, 201);
  assert.deepEqual(r.body.pois.map((p) => p.id), [3, 1, 2]);
  assert.deepEqual(r.body.pois.map((p) => p.visit_order), [1, 2, 3]);
});

test('UC4 E1: tour rỗng → 400', async () => {
  const r = await s.call('POST', '/admin/tours', { name: 'Rỗng', poi_ids: [] });
  assert.equal(r.status, 400);
  assert.ok(r.body.error.details.poi_ids);
});

test('UC4: POI trùng hoặc không tồn tại → 400', async () => {
  assert.equal((await s.call('POST', '/admin/tours', { name: 'x', poi_ids: [1, 1] })).status, 400);
  assert.equal((await s.call('POST', '/admin/tours', { name: 'x', poi_ids: [999] })).status, 400);
});

test('UC4 A1: sửa và xoá tour', async () => {
  const t = (await s.call('POST', '/admin/tours', { name: 'A', poi_ids: [1] })).body;
  const u = await s.call('PUT', `/admin/tours/${t.id}`, { name: 'B', poi_ids: [2, 1] });
  assert.equal(u.body.name, 'B');
  assert.deepEqual(u.body.pois.map((p) => p.id), [2, 1]);
  assert.equal((await s.call('DELETE', `/admin/tours/${t.id}`)).status, 204);
  assert.equal((await s.call('GET', `/admin/tours/${t.id}`)).status, 404);
});

test('đồng bộ: snapshot có POI, bản dịch, tour', async () => {
  const r = await s.call('GET', '/sync', undefined, { auth: false });
  assert.equal(r.status, 200);
  assert.ok(r.body.version >= 1);
  assert.ok(r.body.pois.length >= 8);
  assert.ok(r.body.pois[0].translations.length >= 1);
  assert.ok(r.body.tours.length >= 2);
  assert.ok(Array.isArray(r.body.tours[0].poi_ids));
  assert.equal(r.body.default_language, 'vi');
  assert.ok(r.body.qrcodes.length >= 5);
  assert.ok(r.body.qrcodes[0].payload && r.body.qrcodes[0].poi_id);
});

test('xoá POI thì gỡ khỏi tour', async () => {
  const p = (await s.call('POST', '/admin/pois', { name: 'Tạm', latitude: 10, longitude: 106, radius_m: 10, translations: [{ language_code: 'vi', narration_text: 'x' }] })).body;
  const t = (await s.call('POST', '/admin/tours', { name: 'T', poi_ids: [1, p.id] })).body;
  await s.call('DELETE', `/admin/pois/${p.id}`);
  const after = (await s.call('GET', `/admin/tours/${t.id}`)).body;
  assert.deepEqual(after.pois.map((x) => x.id), [1]);
});
