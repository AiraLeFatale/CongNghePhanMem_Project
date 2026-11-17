import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

let s;
before(async () => {
  s = await startServer({ autopilot: { enabled: true, retryDelays: [] } });
  await s.login();
});
after(() => s.close());

const vi = (text) => ({ language_code: 'vi', title: 'Điểm thử', narration_text: text });
const body = (translations) => ({ name: 'Điểm tự động', latitude: 10.76, longitude: 106.7, radius_m: 50, priority: 1, translations });

test('lưu điểm chỉ có tiếng Việt → tự dịch đủ 6 ngôn ngữ và tạo audio cho tất cả', async () => {
  const created = (await s.call('POST', '/admin/pois', body([vi('Xin chào Quận 4.')]))).body;
  await s.services.autopilot.idle();
  const st = (await s.call('GET', `/admin/pois/${created.id}/auto`)).body;
  assert.equal(st.state, 'done');
  const poi = (await s.call('GET', `/admin/pois/${created.id}`)).body;
  assert.equal(poi.translations.length, 6);
  assert.ok(poi.translations.every((t) => t.audio_url && t.audio_source === 'tts'));
  assert.equal(poi.translations.find((t) => t.language_code === 'en').narration_text, '[vi->en] Xin chào Quận 4.');
  assert.equal(poi.translations.find((t) => t.language_code === 'en').is_auto, 1);
});

test('sửa tiếng Việt → dịch lại bản máy, giữ bản người sửa tay, tạo lại audio đã cũ', async () => {
  const created = (await s.call('POST', '/admin/pois', body([vi('Bản cũ.')]))).body;
  await s.services.autopilot.idle();
  let poi = (await s.call('GET', `/admin/pois/${created.id}`)).body;
  const oldFrAudio = poi.translations.find((t) => t.language_code === 'fr').audio_url;
  // quản trị viên tự sửa bản tiếng Anh, đồng thời sửa bản tiếng Việt
  const tr = poi.translations.map((t) => ({ language_code: t.language_code, title: t.title, narration_text: t.narration_text }));
  tr.find((t) => t.language_code === 'en').narration_text = 'Hand written English.';
  tr.find((t) => t.language_code === 'vi').narration_text = 'Bản mới.';
  await s.call('PUT', `/admin/pois/${created.id}`, body(tr));
  await s.services.autopilot.idle();
  poi = (await s.call('GET', `/admin/pois/${created.id}`)).body;
  const by = (c) => poi.translations.find((t) => t.language_code === c);
  assert.equal(by('en').narration_text, 'Hand written English.');
  assert.equal(by('en').is_auto, 0);
  assert.equal(by('fr').narration_text, '[vi->fr] Bản mới.');
  assert.notEqual(by('fr').audio_url, oldFrAudio);
  assert.ok(poi.translations.every((t) => t.audio_url));
});

test('lỗi tạm thời của dịch vụ dịch (429) thì tự thử lại, cuối cùng vẫn đủ bản dịch', async () => {
  const { openDatabase } = await import('../src/db/database.js');
  const { seed } = await import('../src/db/seed.js');
  const { createRepositories } = await import('../src/repositories/index.js');
  const { createServices } = await import('../src/services/index.js');
  const db = openDatabase(':memory:');
  seed(db, { adminPassword: 'x' });
  let calls = 0;
  const translator = {
    provider: 'flaky',
    translate: async (t, a, b) => {
      calls++;
      if (calls % 3 === 1) throw Object.assign(new Error('Dịch vụ dịch trả lỗi 429'), { status: 502 });
      return `[${a}->${b}] ${t}`;
    },
  };
  const svc = createServices({ ...createRepositories(db), db }, { translator, tts: { provider: 'fake', synthesize: async () => Buffer.from('ID3') }, autopilot: { enabled: true, retryDelays: [1, 1, 1] } });
  const poi = svc.pois.create({ name: 'Thử lại', latitude: 10.7, longitude: 106.7, radius_m: 30, translations: [{ language_code: 'vi', title: null, narration_text: 'Câu thử.' }] }, null);
  svc.autopilot.schedule(poi.id);
  await svc.autopilot.idle();
  assert.equal(svc.autopilot.status(poi.id).state, 'done');
  assert.equal(svc.pois.get(poi.id).translations.length, 6);
});
