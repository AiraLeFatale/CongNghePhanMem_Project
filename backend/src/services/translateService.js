/**
 * Tầng nghiệp vụ: dịch văn bản qua provider bên ngoài (google-free / libretranslate / none).
 * Kiểm tra đầu vào (độ dài, ngôn ngữ) trước khi gọi mạng; lỗi mạng được quy về AppError 502.
 */
import { config, languageCodes } from '../config.js';
import { badRequest, upstream } from '../utils/errors.js';

// Mã ngôn ngữ của hệ thống → mã của dịch vụ dịch
const GOOGLE_CODES = { zh: 'zh-CN' };

// Validate chung cho mọi provider: text không rỗng, <= 5000 ký tự, ngôn ngữ phải được hỗ trợ.
// Trả về text đã trim hoặc ném 400.
export function checkTranslateInput(text, source, target) {
  const t = String(text ?? '').trim();
  if (!t) throw badRequest('Không có nội dung để dịch');
  if (t.length > 5000) throw badRequest('Nội dung dịch tối đa 5000 ký tự');
  if (!languageCodes.includes(source) || !languageCodes.includes(target)) throw badRequest('Ngôn ngữ không được hỗ trợ');
  return t;
}

/** Tạo bộ dịch theo cấu hình. fetchImpl tiêm vào để kiểm thử không cần mạng. */
export function createTranslator({ provider = config.translateProvider, fetchImpl = fetch } = {}) {
  // Provider google-free: gọi endpoint không chính thức, timeout 15s, ghép các đoạn trả về.
  async function googleFree(text, source, target) {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.search = new URLSearchParams({ client: 'gtx', sl: GOOGLE_CODES[source] ?? source, tl: GOOGLE_CODES[target] ?? target, dt: 't', q: text });
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw upstream(`Dịch vụ dịch trả lỗi ${res.status}`);
    const data = await res.json();
    return (data?.[0] ?? []).map((seg) => seg?.[0] ?? '').join('');
  }

  async function libre(text, source, target) {
    // Provider libre: POST JSON tới instance LibreTranslate đã cấu hình (có thể kèm api_key).
    const res = await fetchImpl(`${config.libreTranslateUrl.replace(/\/$/, '')}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text', api_key: config.libreTranslateKey || undefined }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw upstream(`LibreTranslate trả lỗi ${res.status}`);
    return (await res.json()).translatedText;
  }

  return {
    provider,
    // Dịch text từ source sang target; cùng ngôn ngữ thì trả nguyên văn.
    // Ném 400 khi chưa bật dịch/input sai, 502 khi provider lỗi hoặc không kết nối được.
    async translate(text, source, target) {
      const t = checkTranslateInput(text, source, target);
      if (source === target) return t;
      if (provider === 'none') throw badRequest('Máy chủ chưa bật dịch tự động (TRANSLATE_PROVIDER=none)');
      try {
        return provider === 'libretranslate' ? await libre(t, source, target) : await googleFree(t, source, target);
      } catch (err) {
        // Giữ nguyên AppError đã có status; lỗi mạng khác thì bọc thành 502.
        if (err.status) throw err;
        throw upstream('Không kết nối được dịch vụ dịch, thử lại sau');
      }
    },
  };
}
