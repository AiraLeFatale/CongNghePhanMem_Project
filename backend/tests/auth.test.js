import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

let s;
before(async () => { s = await startServer(); });
after(() => s.close());

test('đăng nhập đúng trả token', async () => {
  const r = await s.login();
  assert.equal(r.status, 200);
  assert.ok(r.body.token);
  assert.equal(r.body.user.username, 'admin');
  assert.equal(r.body.user.password_hash, undefined);
});

test('sai mật khẩu → 401', async () => {
  const r = await s.call('POST', '/auth/login', { username: 'admin', password: 'sai' }, { auth: false });
  assert.equal(r.status, 401);
});

test('thiếu thông tin → 400', async () => {
  const r = await s.call('POST', '/auth/login', {}, { auth: false });
  assert.equal(r.status, 400);
});

test('API admin chặn khi không có token', async () => {
  const r = await s.call('GET', '/admin/pois', undefined, { auth: false });
  assert.equal(r.status, 401);
});

test('token giả → 401', async () => {
  const res = await fetch(`${s.base}/admin/pois`, { headers: { Authorization: 'Bearer abc.def.ghi' } });
  assert.equal(res.status, 401);
});

test('đổi mật khẩu', async () => {
  await s.login();
  assert.equal((await s.call('POST', '/admin/me/password', { current_password: 'sai', new_password: 'matkhaumoi1' })).status, 400);
  assert.equal((await s.call('POST', '/admin/me/password', { current_password: 'admin123', new_password: 'ngan' })).status, 400);
  assert.equal((await s.call('POST', '/admin/me/password', { current_password: 'admin123', new_password: 'matkhaumoi1' })).status, 204);
  assert.equal((await s.login('admin', 'matkhaumoi1')).status, 200);
});
