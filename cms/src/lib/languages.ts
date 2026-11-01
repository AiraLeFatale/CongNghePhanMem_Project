/**
 * Danh mục ngôn ngữ thuyết minh và nhãn tiếng Việt cho các phương thức kích hoạt.
 * Dùng chung cho form POI, báo cáo và file Excel.
 */
import type { LanguageCode } from './types';

// Ngôn ngữ mặc định, cũng là ngôn ngữ bắt buộc phải có nội dung.
export const DEFAULT_LANGUAGE: LanguageCode = 'vi';

// Thứ tự hiển thị cố định: mã, tên bản ngữ và nhãn tiếng Việt.
export const LANGUAGES: { code: LanguageCode; name: string; label: string }[] = [
  { code: 'vi', name: 'Tiếng Việt', label: 'Tiếng Việt' },
  { code: 'en', name: 'English', label: 'Tiếng Anh' },
  { code: 'zh', name: '中文', label: 'Tiếng Trung' },
  { code: 'ko', name: '한국어', label: 'Tiếng Hàn' },
  { code: 'ja', name: '日本語', label: 'Tiếng Nhật' },
  { code: 'fr', name: 'Français', label: 'Tiếng Pháp' },
];

// Danh sách mã ngôn ngữ theo đúng thứ tự khai báo ở trên.
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

/** Nhãn tiếng Việt của một mã ngôn ngữ; mã lạ được in hoa nguyên bản. */
export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

// Nhãn hiển thị cho từng phương thức kích hoạt thuyết minh.
export const TRIGGER_LABELS: Record<string, string> = {
  geofence: 'GPS (geofence)',
  qr: 'Quét mã QR',
  manual: 'Chọn thủ công',
};

/** Nhãn tiếng Việt của phương thức kích hoạt; không khớp thì giữ nguyên mã. */
export function triggerLabel(method: string): string {
  return TRIGGER_LABELS[method] ?? method;
}
