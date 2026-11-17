import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';
import { config } from '../src/config.js';
import { previewText } from '../src/services/paymentService.js';
import { test as t2 } from 'node:test';

let s;
before(async () => {
  Object.assign(config.payment, { account: '0000000001', accountName: 'TEST', webhookKey: 'khoa-webhook-thu' });
  s = await startServer();
  await s.login();
  s.db.prepare('UPDATE poi SET price = 5000 WHERE id = 3').run();
});
after(() => s.close());

async function webhook(body, key = 'khoa-webhook-thu') {
  const res = await fetch(`${s.base}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Apikey ${key}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test('điểm có phí: nội dung công khai chỉ còn đoạn nghe thử, không có audio', async () => {
  const sync = (await s.call('GET', '/sync', undefined, { auth: false })).body;
  const poi = sync.pois.find((p) => p.id === 3);
  assert.equal(poi.locked, true);
  assert.equal(poi.price, 5000);
  assert.ok(poi.translations.every((t) => t.audio_url === null));
  const free = sync.pois.find((p) => p.id === 1);
  assert.equal(free.locked, false);
  const full = await s.call('GET', '/pois/3/full', undefined, { auth: false });
  assert.equal(full.status, 402);
});

test('thanh toán tự động: webhook SePay khớp mã đơn → mở khoá ngay', async () => {
  const order = (await s.call('POST', '/orders', { poi_id: 3 }, { auth: false })).body;
  assert.match(order.code, /^TM[A-Z2-9]{6}$/);
  assert.equal(order.amount, 5000);
  assert.equal(order.bank.account, '0000000001');

  const st = async () => (await fetch(`${s.base}/orders/${order.code}`, { headers: { 'x-order-token': order.token } })).json();
  assert.equal((await st()).status, 'pending');

  // thiếu tiền: không mở
  let r = await webhook({ id: 1, transferType: 'in', transferAmount: 2000, content: `MBVCB.123 ${order.code} chuyen tien` });
  assert.equal(r.body.results[0].result, 'thiếu tiền (cần 5000)');
  assert.equal((await st()).status, 'pending');

  r = await webhook({ id: 2, transferType: 'in', transferAmount: 5000, content: `IBFT ${order.code.toLowerCase()}` });
  assert.equal(r.body.results[0].result, 'khớp');
  assert.equal((await st()).status, 'paid');

  // gửi lại cùng giao dịch: không xử lý lần hai
  r = await webhook({ id: 2, transferType: 'in', transferAmount: 5000, content: order.code });
  assert.equal(r.body.results[0].result, 'đã nhận trước đó');

  const full = await fetch(`${s.base}/pois/3/full`, { headers: { 'x-access-token': order.token } });
  assert.equal(full.status, 200);
  const poi = await full.json();
  assert.equal(poi.locked, false);
  assert.ok(poi.translations.find((t) => t.language_code === 'vi').narration_text.length > previewText('a. b.').length);
});

test('webhook Casso và sai khoá', async () => {
  const order = (await s.call('POST', '/orders', { poi_id: 3 }, { auth: false })).body;
  assert.equal((await webhook({ id: 9, transferAmount: 5000, content: order.code }, 'sai')).status, 401);
  const res = await fetch(`${s.base}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'secure-token': 'khoa-webhook-thu' },
    body: JSON.stringify({ error: 0, data: [{ id: 77, amount: 5000, description: `CT ${order.code}` }] }),
  });
  assert.equal((await res.json()).results[0].result, 'khớp');
});

test('quản trị: danh sách đơn, xác nhận tay, điểm miễn phí không tạo đơn', async () => {
  const order = (await s.call('POST', '/orders', { poi_id: 3 }, { auth: false })).body;
  const list = (await s.call('GET', '/admin/orders?status=pending')).body;
  const row = list.items.find((o) => o.code === order.code);
  assert.ok(row);
  assert.equal((await s.call('POST', `/admin/orders/${row.id}/confirm`)).body.status, 'paid');
  assert.ok((await s.call('GET', '/admin/orders')).body.totals.paid.amount >= 10000);
  assert.equal((await s.call('POST', '/orders', { poi_id: 1 }, { auth: false })).status, 400);
});

test('khách bấm "đã chuyển khoản" → nghe ngay; quản trị viên huỷ (không thấy tiền) → thu hồi', async () => {
  const order = (await s.call('POST', '/orders', { poi_id: 3 }, { auth: false })).body;
  const h = { 'Content-Type': 'application/json', 'x-order-token': order.token };
  const full = () => fetch(`${s.base}/pois/3/full`, { headers: { 'x-access-token': order.token } });
  assert.equal((await full()).status, 402);
  const claimed = await (await fetch(`${s.base}/orders/${order.code}/claim`, { method: 'POST', headers: h })).json();
  assert.equal(claimed.claimed, true);
  assert.equal((await full()).status, 200);
  const list = (await s.call('GET', '/admin/orders?status=claimed')).body;
  const row = list.items.find((o) => o.code === order.code);
  assert.ok(row && list.totals.claimed.count >= 1);
  await s.call('POST', `/admin/orders/${row.id}/cancel`);
  assert.equal((await full()).status, 402);
});

t2('đoạn nghe thử chỉ lấy câu đầu, kể cả tiếng Trung/Nhật viết liền', () => {
  assert.equal(previewText('Bạn đang đến Bến Nhà Rồng. Toà nhà được xây năm 1863.'), 'Bạn đang đến Bến Nhà Rồng.');
  assert.equal(previewText('您即将抵达芽龙码头。该建筑由法国人于1863年建造。'), '您即将抵达芽龙码头。');
  assert.equal(previewText('ナロン埠頭に到着です。この建物は1863年に建てられました。'), 'ナロン埠頭に到着です。');
  assert.equal(previewText('Số 1.5 không cắt giữa số. Câu hai.'), 'Số 1.5 không cắt giữa số.');
});
