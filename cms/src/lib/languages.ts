import type { LanguageCode } from './types';

export const DEFAULT_LANGUAGE: LanguageCode = 'vi';

export const LANGUAGES: { code: LanguageCode; name: string; label: string }[] = [
  { code: 'vi', name: 'Tiếng Việt', label: 'Tiếng Việt' },
  { code: 'en', name: 'English', label: 'Tiếng Anh' },
  { code: 'zh', name: '中文', label: 'Tiếng Trung' },
  { code: 'ko', name: '한국어', label: 'Tiếng Hàn' },
  { code: 'ja', name: '日本語', label: 'Tiếng Nhật' },
  { code: 'fr', name: 'Français', label: 'Tiếng Pháp' },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

export const TRIGGER_LABELS: Record<string, string> = {
  geofence: 'GPS (geofence)',
  qr: 'Quét mã QR',
  manual: 'Chọn thủ công',
};

export function triggerLabel(method: string): string {
  return TRIGGER_LABELS[method] ?? method;
}
