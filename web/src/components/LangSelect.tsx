import { Globe } from '@phosphor-icons/react';
import { LANGS, useLang } from '../lib/i18n';
import type { LanguageCode } from '../lib/types';

export function LangSelect({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, ui } = useLang();
  return (
    <label className={`lang-select${compact ? ' compact' : ''}`}>
      <Globe size={16} aria-hidden="true" />
      <span className="sr-only">{ui === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as LanguageCode)}>
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
