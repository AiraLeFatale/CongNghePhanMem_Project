/** Chọn bản dịch theo ngôn ngữ, fallback về tiếng Việt (mặc định) rồi bản bất kỳ có nội dung. */
import { DEFAULT_LANGUAGE, Translation } from '../types';

/** Kết quả chọn bản dịch, kèm cờ cho biết đã phải fallback hay chưa. */
export interface ResolvedTranslation {
  translation: Translation;
  /** Ngôn ngữ thực sự được dùng. */
  language: string;
  /** true nếu không có bản dịch cho ngôn ngữ đã chọn. */
  isFallback: boolean;
}

// Một bản dịch chỉ được coi là dùng được khi có nội dung chữ hoặc có file audio.
const hasContent = (t: Translation | undefined): t is Translation =>
  !!t && (!!(t.narration_text && t.narration_text.trim()) || !!t.audio_url);

/**
 * Chọn bản dịch theo thứ tự ưu tiên: ngôn ngữ đang chọn → ngôn ngữ mặc định → bản đầu tiên có nội dung.
 * Trả null nếu không có bản dịch nào dùng được.
 */
export function resolveTranslation(
  translations: Translation[] | null | undefined,
  preferred: string,
  fallback: string = DEFAULT_LANGUAGE,
): ResolvedTranslation | null {
  const list = translations ?? [];
  const find = (code: string) => list.find((t) => t.language_code === code);
  // 1) Đúng ngôn ngữ người dùng chọn.
  const p = find(preferred);
  if (hasContent(p)) return { translation: p, language: preferred, isFallback: false };
  // 2) Ngôn ngữ mặc định (tiếng Việt).
  const f = find(fallback);
  if (hasContent(f)) return { translation: f, language: fallback, isFallback: preferred !== fallback };
  // 3) Chấp nhận bất kỳ bản dịch nào có nội dung, miễn là còn nghe được.
  const any = list.find(hasContent);
  if (any) return { translation: any, language: any.language_code, isFallback: true };
  return null;
}

/** Tiêu đề hiển thị theo ngôn ngữ (fallback như trên, cuối cùng là tên POI). */
export function displayTitle(poi: { name: string; translations: Translation[] }, lang: string): string {
  const r = resolveTranslation(poi.translations, lang);
  return r?.translation.title?.trim() || poi.name;
}

/** Mã locale cho TTS trên máy. */
export const TTS_LOCALE: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  zh: 'zh-CN',
  ko: 'ko-KR',
  ja: 'ja-JP',
  fr: 'fr-FR',
};
