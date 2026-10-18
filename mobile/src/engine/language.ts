/** Chọn bản dịch theo ngôn ngữ, fallback về tiếng Việt (mặc định) rồi bản bất kỳ có nội dung. */
import { DEFAULT_LANGUAGE, Translation } from '../types';

export interface ResolvedTranslation {
  translation: Translation;
  /** Ngôn ngữ thực sự được dùng. */
  language: string;
  /** true nếu không có bản dịch cho ngôn ngữ đã chọn. */
  isFallback: boolean;
}

const hasContent = (t: Translation | undefined): t is Translation =>
  !!t && (!!(t.narration_text && t.narration_text.trim()) || !!t.audio_url);

export function resolveTranslation(
  translations: Translation[] | null | undefined,
  preferred: string,
  fallback: string = DEFAULT_LANGUAGE,
): ResolvedTranslation | null {
  const list = translations ?? [];
  const find = (code: string) => list.find((t) => t.language_code === code);
  const p = find(preferred);
  if (hasContent(p)) return { translation: p, language: preferred, isFallback: false };
  const f = find(fallback);
  if (hasContent(f)) return { translation: f, language: fallback, isFallback: preferred !== fallback };
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
