import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';
import { createLiveService } from '../src/services/liveService.js';

let s;
before(async () => { s = await startServer(); await s.login(); });
after(() => s.close());

const ping = (body) => s.call('POST', '/live/ping', body, { auth: false });

test('nhịp tim "đang dùng": đếm người xem và người đang nghe theo điểm', async () => {
  assert.equal((await ping({ session_id: 'web_aaaaaaaa1', state: 'browsing', language_code: 'vi' })).status, 204);
  assert.equal((await ping({ session_id: 'web_aaaaaaaa2', state: 'listening', poi_id: 1, language_code: 'en', trigger_method: 'qr' })).status, 204);
  assert.equal((await ping({ session_id: 'web_aaaaaaaa3', state: 'listening', poi_id: 1, language_code: 'vi', trigger_method: 'manual' })).status, 204);
  const r = await s.call('GET', '/admin/live');
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 3);
  assert.equal(r.body.listening, 2);
  assert.equal(r.body.browsing, 1);
  assert.equal(r.body.by_poi[0].poi_id, 1);
  assert.equal(r.body.by_poi[0].listening, 2);
  assert.ok(r.body.by_poi[0].name.length > 0);
  assert.deepEqual(r.body.by_method, { qr: 1, manual: 1 });
  assert.equal(r.body.by_language.en, 1);
});

test('rời trang (state left) thì bớt ngay; dữ liệu sai bị từ chối', async () => {
  await ping({ session_id: 'web_aaaaaaaa3', state: 'left' });
  const r = await s.call('GET', '/admin/live');
  assert.equal(r.body.total, 2);
  assert.equal((await ping({ session_id: 'x', state: 'browsing' })).status, 400);
  assert.equal((await ping({ session_id: 'web_bbbbbbbb1', state: 'dancing' })).status, 400);
  assert.equal((await ping({ session_id: 'web_bbbbbbbb1', state: 'listening', poi_id: -3 })).status, 400);
});

test('xem số đang dùng cần đăng nhập', async () => {
  const r = await s.call('GET', '/admin/live', undefined, { auth: false });
  assert.equal(r.status, 401);
});

test('luồng trực tiếp đẩy số mới ngay sau nhịp tim', async () => {
  const login = await s.call('POST', '/auth/login', { username: 'admin', password: 'admin123' }, { auth: false });
  const ctrl = new AbortController();
  const res = await fetch(`${s.base}/admin/live/stream`, { headers: { Authorization: `Bearer ${login.body.token}` }, signal: ctrl.signal });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const events = [];
  const readUntil = async (n) => {
    while (events.length < n) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const data = block.split('\n').find((l) => l.startsWith('data: '));
        if (data) events.push(JSON.parse(data.slice(6)));
      }
    }
  };
  await readUntil(1);
  const before = events[0].total;
  await ping({ session_id: 'web_cccccccc1', state: 'listening', poi_id: 2, language_code: 'ko', trigger_method: 'qr' });
  await readUntil(2);
  assert.equal(events[1].total, before + 1);
  assert.ok(events[1].by_poi.some((p) => p.poi_id === 2));
  ctrl.abort();
});

test('quá thời hạn không có nhịp tim thì coi như đã rời đi', () => {
  let t = 1_000_000;
  const live = createLiveService({ pois: { findById: () => ({ name: 'Điểm A' }) } }, { ttlMs: 45_000, now: () => t });
  live.ping({ session_id: 'app_dddddddd1', state: 'listening', poi_id: 5, source: 'app' });
  assert.equal(live.snapshot().listening, 1);
  assert.equal(live.snapshot().by_source.app, 1);
  t += 46_000;
  assert.equal(live.snapshot().total, 0);
  live.close();
});
