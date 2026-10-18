import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitText } from '../src/services/ttsService.js';
import { createTranslator } from '../src/services/translateService.js';
import { validatePoiInput } from '../src/services/poiService.js';

test('splitText giữ mỗi đoạn ≤ 180 ký tự và không mất chữ', () => {
  const text = 'Câu một rất dài. '.repeat(40) + 'x'.repeat(400);
  const parts = splitText(text);
  assert.ok(parts.every((p) => p.length <= 180));
  assert.equal(parts.join(' ').replace(/\s+/g, ''), text.replace(/\s+/g, ''));
});

test('translator google-free ghép các đoạn trả về', async () => {
  const fetchImpl = async (url) => {
    assert.match(String(url), /tl=zh-CN/);
    return { ok: true, json: async () => [[['你好', 'Xin'], ['世界', 'chào']]] };
  };
  const t = createTranslator({ provider: 'google-free', fetchImpl });
  assert.equal(await t.translate('Xin chào', 'vi', 'zh'), '你好世界');
});

test('translator báo lỗi 502 khi mất mạng', async () => {
  const t = createTranslator({ provider: 'google-free', fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(t.translate('a', 'vi', 'en'), (e) => e.status === 502);
});

test('validatePoiInput chuẩn hoá dữ liệu', () => {
  const d = validatePoiInput({ name: '  A  ', latitude: '10.5', longitude: '106', radius_m: '30.6', translations: [{ language_code: 'vi', narration_text: ' x ' }, { language_code: 'en', narration_text: '', title: '' }] });
  assert.equal(d.name, 'A');
  assert.equal(d.radius_m, 31);
  assert.equal(d.priority, 1);
  assert.equal(d.translations.length, 1);
});
