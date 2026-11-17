import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

const s = await startServer({ seeded: false });
after(() => s.close());

test('CD: /api/health trả về trạng thái và phiên bản đang chạy', async () => {
  const r = await s.call('GET', '/health', undefined, { auth: false });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
  assert.equal(typeof r.body.version, 'string');
});
