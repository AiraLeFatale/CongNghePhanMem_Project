import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, validPoi } from './helpers.js';

let s;
before(async () => { s = await startServer(); await s.login(); });
after(() => s.close());

test('UC3: danh sách POI mẫu', async () => {
  const r = await s.call('GET', '/admin/pois');
  assert.equal(r.status, 200);
  assert.equal(r.body.items.length, 8);
  assert.ok(r.body.items[0].languages.includes('vi'));
});

test('UC3: tìm kiếm theo tên', async () => {
  const r = await s.call('GET', '/admin/pois?q=Vĩnh%20Khánh');
  assert.equal(r.body.items.length, 1);
});

test('UC3: tạo POI hợp lệ và tăng phiên bản đồng bộ', async () => {
  const v1 = (await s.call('GET', '/sync/version')).body.version;
  const r = await s.call('POST', '/admin/pois', validPoi());
  assert.equal(r.status, 201);
  assert.equal(r.body.translations.length, 1);
  const v2 = (await s.call('GET', '/sync/version')).body.version;
  assert.ok(v2 > v1);
});

test('UC3 E1: bán kính ≤ 0, thiếu toạ độ, không có nội dung → 400 kèm chi tiết', async () => {
  const r = await s.call('POST', '/admin/pois', validPoi({ radius_m: 0, latitude: '', translations: [] }));
  assert.equal(r.status, 400);
  assert.ok(r.body.error.details.radius_m);
  assert.ok(r.body.error.details.latitude);
  assert.ok(r.body.error.details.translations);
});

test('UC3: toạ độ ngoài phạm vi → 400', async () => {
  const r = await s.call('POST', '/admin/pois', validPoi({ latitude: 91, longitude: 200 }));
  assert.equal(r.status, 400);
  assert.ok(r.body.error.details.latitude && r.body.error.details.longitude);
});

test('UC3: chỉ có tiếng Anh, thiếu ngôn ngữ mặc định → 400', async () => {
  const r = await s.call('POST', '/admin/pois', validPoi({ translations: [{ language_code: 'en', narration_text: 'Hi' }] }));
  assert.equal(r.status, 400);
});

test('UC3: ngôn ngữ không hỗ trợ / trùng → 400', async () => {
  const r1 = await s.call('POST', '/admin/pois', validPoi({ translations: [{ language_code: 'vi', narration_text: 'a' }, { language_code: 'xx', narration_text: 'b' }] }));
  assert.equal(r1.status, 400);
  const r2 = await s.call('POST', '/admin/pois', validPoi({ translations: [{ language_code: 'vi', narration_text: 'a' }, { language_code: 'vi', narration_text: 'b' }] }));
  assert.equal(r2.status, 400);
});

test('UC3: sửa POI, bỏ một ngôn ngữ', async () => {
  const created = (await s.call('POST', '/admin/pois', validPoi({ translations: [{ language_code: 'vi', narration_text: 'A' }, { language_code: 'en', narration_text: 'B' }] }))).body;
  const r = await s.call('PUT', `/admin/pois/${created.id}`, validPoi({ name: 'Tên mới', radius_m: 75 }));
  assert.equal(r.status, 200);
  assert.equal(r.body.name, 'Tên mới');
  assert.equal(r.body.radius_m, 75);
  assert.deepEqual(r.body.translations.map((t) => t.language_code), ['vi']);
});

test('UC3 A1: xoá POI', async () => {
  const created = (await s.call('POST', '/admin/pois', validPoi())).body;
  assert.equal((await s.call('DELETE', `/admin/pois/${created.id}`)).status, 204);
  assert.equal((await s.call('GET', `/admin/pois/${created.id}`)).status, 404);
  assert.equal((await s.call('DELETE', `/admin/pois/${created.id}`)).status, 404);
});

test('id không hợp lệ → 400', async () => {
  assert.equal((await s.call('GET', '/admin/pois/abc')).status, 400);
});

test('UC3: tải file audio, phát được qua /uploads, rồi xoá', async () => {
  const fd = new FormData();
  fd.append('audio', new Blob([Buffer.from('ID3fake')], { type: 'audio/mpeg' }), 'a.mp3');
  const r = await s.call('POST', '/admin/pois/1/audio/vi', fd);
  assert.equal(r.status, 200);
  const vi = r.body.translations.find((t) => t.language_code === 'vi');
  assert.match(vi.audio_url, /^\/uploads\/audio-.*\.mp3$/);
  assert.equal(vi.audio_source, 'upload');
  const file = await fetch(s.base.replace('/api', '') + vi.audio_url);
  assert.equal(file.status, 200);
  const del = await s.call('DELETE', '/admin/pois/1/audio/vi');
  assert.equal(del.body.translations.find((t) => t.language_code === 'vi').audio_url, null);
});

test('UC3: từ chối file không phải âm thanh', async () => {
  const fd = new FormData();
  fd.append('audio', new Blob(['<?php'], { type: 'application/x-php' }), 'x.php');
  const r = await s.call('POST', '/admin/pois/1/audio/vi', fd);
  assert.equal(r.status, 400);
});

test('UC3: tạo giọng đọc TTS từ nội dung', async () => {
  const r = await s.call('POST', '/admin/pois/2/tts/en', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.translations.find((t) => t.language_code === 'en').audio_source, 'tts');
});

test('UC3: dịch tự động', async () => {
  const r = await s.call('POST', '/admin/translate', { text: 'Xin chào', source: 'vi', target: 'en' });
  assert.equal(r.status, 200);
  assert.equal(r.body.text, '[vi->en] Xin chào');
  assert.equal((await s.call('POST', '/admin/translate', { text: '', source: 'vi', target: 'en' })).status, 400);
});
