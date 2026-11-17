import { config, languageCodes } from '../config.js';
import { badRequest, upstream } from '../utils/errors.js';

const GOOGLE_CODES = { zh: 'zh-CN' };
const CHUNK = 180; // Google TTS giới hạn ~200 ký tự mỗi lần

/** Cắt văn bản theo câu/dấu phẩy để mỗi đoạn ≤ CHUNK ký tự. */
export function splitText(text, max = CHUNK) {
  const parts = [];
  for (const sentence of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?。！？;])\s*/)) {
    if (!sentence) continue;
    if (sentence.length <= max) { parts.push(sentence); continue; }
    let buf = '';
    for (const word of sentence.split(/(?<=[,，、])\s*|\s+/)) {
      if ((buf + ' ' + word).trim().length > max) {
        if (buf) parts.push(buf.trim());
        buf = word.length > max ? '' : word;
        if (word.length > max) for (let i = 0; i < word.length; i += max) parts.push(word.slice(i, i + max));
      } else buf = `${buf} ${word}`;
    }
    if (buf.trim()) parts.push(buf.trim());
  }
  // gộp đoạn ngắn liền kề
  const merged = [];
  for (const p of parts) {
    if (merged.length && (merged.at(-1) + ' ' + p).length <= max) merged[merged.length - 1] += ' ' + p;
    else merged.push(p);
  }
  return merged;
}

/** Giọng đọc tự nhiên của ElevenLabs. Mỗi lần gọi tối đa vài nghìn ký tự nên cắt theo câu. */
async function elevenLabs(text, lang, { fetchImpl, settings = config.elevenLabs }) {
  const voice = settings.voices[lang];
  const buffers = [];
  for (const chunk of splitText(text, 2500)) {
    const res = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': settings.apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: chunk,
        model_id: settings.model,
        language_code: lang,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw upstream(`ElevenLabs trả lỗi ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`);
    }
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }
  return Buffer.concat(buffers);
}

/** Sinh file MP3 từ văn bản. Trả về Buffer. */
export function createTts({ provider = config.ttsProvider, fetchImpl = fetch } = {}) {
  return {
    provider,
    async synthesize(text, lang) {
      if (!languageCodes.includes(lang)) throw badRequest('Ngôn ngữ không được hỗ trợ');
      const t = String(text ?? '').trim();
      if (!t) throw badRequest('Chưa có nội dung thuyết minh để chuyển thành giọng đọc');
      if (provider === 'none') throw badRequest('Máy chủ chưa bật TTS (TTS_PROVIDER=none). App vẫn đọc bằng giọng của máy.');
      if (provider === 'elevenlabs') {
        if (!config.elevenLabs.apiKey) throw badRequest('Thiếu ELEVENLABS_API_KEY trên máy chủ');
        try {
          return await elevenLabs(t, lang, { fetchImpl });
        } catch (err) {
          if (err.status) throw err;
          throw upstream('Không kết nối được ElevenLabs, thử lại sau');
        }
      }
      const chunks = splitText(t);
      if (chunks.length > 60) throw badRequest('Nội dung quá dài để tạo giọng đọc (tối đa ~10.000 ký tự)');
      const buffers = [];
      try {
        for (const [i, chunk] of chunks.entries()) {
          const url = new URL('https://translate.google.com/translate_tts');
          url.search = new URLSearchParams({ ie: 'UTF-8', client: 'tw-ob', tl: GOOGLE_CODES[lang] ?? lang, q: chunk, total: String(chunks.length), idx: String(i), textlen: String(chunk.length) });
          const res = await fetchImpl(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) });
          if (!res.ok) throw upstream(`Dịch vụ TTS trả lỗi ${res.status}`);
          buffers.push(Buffer.from(await res.arrayBuffer()));
        }
      } catch (err) {
        if (err.status) throw err;
        throw upstream('Không kết nối được dịch vụ TTS, thử lại sau');
      }
      // Ghép nối các khung MP3 liên tiếp: trình phát đọc được như một file.
      return Buffer.concat(buffers);
    },
  };
}
