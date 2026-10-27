import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTranslateInput, createTranslator } from '../src/services/translateService.js';

test('checkTranslateInput cắt khoảng trắng thừa và từ chối nội dung rỗng', () => {
  assert.equal(checkTranslateInput('  Xin chào  ', 'vi', 'en'), 'Xin chào');
  assert.throws(
    () => checkTranslateInput('   ', 'vi', 'en'),
    (e) => e.status === 400 && /Không có nội dung/.test(e.message),
  );
  assert.throws(
    () => checkTranslateInput(null, 'vi', 'en'),
    (e) => e.status === 400 && /Không có nội dung/.test(e.message),
  );
});

test('checkTranslateInput giới hạn 5000 ký tự', () => {
  assert.equal(checkTranslateInput('a'.repeat(5000), 'vi', 'en').length, 5000);
  assert.throws(
    () => checkTranslateInput('a'.repeat(5001), 'vi', 'en'),
    (e) => e.status === 400 && /5000/.test(e.message),
  );
});

test('checkTranslateInput từ chối ngôn ngữ không được hỗ trợ', () => {
  assert.throws(
    () => checkTranslateInput('Xin chào', 'xx', 'en'),
    (e) => e.status === 400 && /không được hỗ trợ/.test(e.message),
  );
  assert.throws(
    () => checkTranslateInput('Xin chào', 'vi', 'xx'),
    (e) => e.status === 400 && /không được hỗ trợ/.test(e.message),
  );
});

test('translate trả nguyên văn khi nguồn trùng đích và không gọi dịch vụ ngoài', async () => {
  let called = false;
  const t = createTranslator({
    provider: 'google-free',
    fetchImpl: async () => {
      called = true;
      return { ok: true, json: async () => [[['x']]] };
    },
  });
  assert.equal(await t.translate('  Xin chào  ', 'vi', 'vi'), 'Xin chào');
  assert.equal(called, false);
});

test('translate báo lỗi 400 khi TRANSLATE_PROVIDER=none', async () => {
  const t = createTranslator({
    provider: 'none',
    fetchImpl: async () => {
      throw new Error('không được gọi khi provider=none');
    },
  });
  await assert.rejects(
    t.translate('Xin chào', 'vi', 'en'),
    (e) => e.status === 400 && /TRANSLATE_PROVIDER=none/.test(e.message),
  );
});

test('libretranslate gửi POST JSON đúng định dạng và đọc translatedText', async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url: String(url), options };
    return { ok: true, json: async () => ({ translatedText: 'Hello' }) };
  };
  const t = createTranslator({ provider: 'libretranslate', fetchImpl });

  assert.equal(await t.translate('  Xin chào  ', 'vi', 'en'), 'Hello');
  assert.match(captured.url, /\/translate$/);
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers['Content-Type'], 'application/json');
  const body = JSON.parse(captured.options.body);
  assert.deepEqual(
    { q: body.q, source: body.source, target: body.target, format: body.format },
    { q: 'Xin chào', source: 'vi', target: 'en', format: 'text' },
  );
});

test('libretranslate không gửi api_key khi cấu hình để trống', async () => {
  let body;
  const fetchImpl = async (_url, options) => {
    body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ translatedText: 'Hello' }) };
  };
  const t = createTranslator({ provider: 'libretranslate', fetchImpl });
  await t.translate('Xin chào', 'vi', 'en');
  assert.equal('api_key' in body, false);
});

test('google-free báo lỗi 502 kèm mã HTTP khi dịch vụ trả lỗi', async () => {
  const t = createTranslator({ provider: 'google-free', fetchImpl: async () => ({ ok: false, status: 429 }) });
  await assert.rejects(
    t.translate('Xin chào', 'vi', 'en'),
    (e) => e.status === 502 && /429/.test(e.message),
  );
});

test('libretranslate báo lỗi 502 kèm mã HTTP khi dịch vụ trả lỗi', async () => {
  const t = createTranslator({ provider: 'libretranslate', fetchImpl: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(
    t.translate('Xin chào', 'vi', 'en'),
    (e) => e.status === 502 && /503/.test(e.message),
  );
});

test('translate giữ nguyên lỗi 400 của bước kiểm tra đầu vào', async () => {
  const t = createTranslator({ provider: 'google-free', fetchImpl: async () => ({ ok: true, json: async () => [[['x']]] }) });
  await assert.rejects(
    t.translate('', 'vi', 'en'),
    (e) => e.status === 400 && e.code === 'VALIDATION_ERROR',
  );
});
