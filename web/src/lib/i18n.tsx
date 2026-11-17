import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LanguageCode, Poi, Translation } from './types';

export const LANGS: { code: LanguageCode; label: string; short: string; speech: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', short: 'VI', speech: 'vi-VN' },
  { code: 'en', label: 'English', short: 'EN', speech: 'en-US' },
  { code: 'zh', label: '中文', short: '中', speech: 'zh-CN' },
  { code: 'ko', label: '한국어', short: '한', speech: 'ko-KR' },
  { code: 'ja', label: '日本語', short: '日', speech: 'ja-JP' },
  { code: 'fr', label: 'Français', short: 'FR', speech: 'fr-FR' },
];

const KEY = 'narr_lang';

function initialLang(): LanguageCode {
  try {
    const saved = localStorage.getItem(KEY) as LanguageCode | null;
    if (saved && LANGS.some((l) => l.code === saved)) return saved;
  } catch {
    /* bỏ qua */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'vi').slice(0, 2) as LanguageCode;
  return LANGS.some((l) => l.code === nav) ? nav : 'vi';
}

interface LangCtx {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
  /** Giao diện chỉ có tiếng Việt và tiếng Anh; ngôn ngữ khác dùng giao diện tiếng Anh. */
  ui: 'vi' | 'en';
}

const Ctx = createContext<LangCtx>({ lang: 'vi', setLang: () => {}, ui: 'vi' });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(initialLang);
  const ui = lang === 'vi' ? 'vi' : 'en';
  useEffect(() => {
    document.documentElement.lang = ui;
  }, [ui]);
  const setLang = (l: LanguageCode) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* bỏ qua */
    }
  };
  return <Ctx.Provider value={{ lang, setLang, ui }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}

/** Chọn chữ theo ngôn ngữ giao diện: t({ vi: '...', en: '...' }). */
export function useT() {
  const { ui } = useLang();
  return (s: { vi: string; en: string }) => s[ui];
}

/** Bản dịch phù hợp nhất cho khách: đúng ngôn ngữ chọn → tiếng Anh → tiếng Việt. */
export function pickTranslation(poi: Poi, lang: LanguageCode): Translation | undefined {
  const by = (c: LanguageCode) => poi.translations.find((t) => t.language_code === c && t.narration_text.trim());
  return by(lang) ?? by('en') ?? by('vi') ?? poi.translations[0];
}

export function poiTitle(poi: Poi, lang: LanguageCode): string {
  const t = poi.translations.find((x) => x.language_code === lang);
  return t?.title?.trim() || poi.name;
}
