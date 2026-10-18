import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from './languages';
import type { LanguageCode, Poi, PoiInput, TourInput } from './types';

export type FieldErrors = Record<string, string>;

export const POI_LIMITS = {
  latMin: -90,
  latMax: 90,
  lngMin: -180,
  lngMax: 180,
  radiusMax: 5000,
  priorityMin: 0,
  priorityMax: 100,
  nameMax: 200,
  narrationMax: 10000,
} as const;

export interface TranslationDraft {
  title: string;
  narration_text: string;
}

/** Trạng thái form POI: số giữ ở dạng chuỗi để người dùng gõ tự do. */
export interface PoiForm {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radius_m: string;
  priority: string;
  image_url: string | null;
  translations: Record<LanguageCode, TranslationDraft>;
}

export function emptyTranslations(): Record<LanguageCode, TranslationDraft> {
  return Object.fromEntries(LANGUAGE_CODES.map((c) => [c, { title: '', narration_text: '' }])) as Record<
    LanguageCode,
    TranslationDraft
  >;
}

export function emptyPoiForm(): PoiForm {
  return {
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius_m: '80',
    priority: '1',
    image_url: null,
    translations: emptyTranslations(),
  };
}

export function poiToForm(p: Poi): PoiForm {
  const translations = emptyTranslations();
  for (const t of p.translations) {
    if (translations[t.language_code]) {
      translations[t.language_code] = { title: t.title ?? '', narration_text: t.narration_text ?? '' };
    }
  }
  return {
    name: p.name,
    address: p.address ?? '',
    latitude: String(p.latitude),
    longitude: String(p.longitude),
    radius_m: String(p.radius_m),
    priority: String(p.priority),
    image_url: p.image_url,
    translations,
  };
}

/** Đọc số người dùng nhập, chấp nhận dấu phẩy thập phân kiểu Việt Nam ("10,7681"). */
export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = value.trim().replace(',', '.');
  if (s === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function isValidLatitude(v: number | null): v is number {
  return v !== null && v >= POI_LIMITS.latMin && v <= POI_LIMITS.latMax;
}

export function isValidLongitude(v: number | null): v is number {
  return v !== null && v >= POI_LIMITS.lngMin && v <= POI_LIMITS.lngMax;
}

export const translationKey = (code: LanguageCode) => `translations.${code}`;

function hasContent(t: TranslationDraft | undefined): boolean {
  return !!t && (t.title.trim() !== '' || t.narration_text.trim() !== '');
}

/** Ngôn ngữ sẽ được gửi lên (có tiêu đề hoặc nội dung), theo thứ tự cố định. */
export function filledLanguages(form: PoiForm): LanguageCode[] {
  return LANGUAGE_CODES.filter((c) => hasContent(form.translations[c]));
}

/**
 * Kiểm tra phía client, cùng quy tắc với máy chủ (UC3 E1):
 * vĩ độ −90..90, kinh độ −180..180, 0 < bán kính ≤ 5000, ưu tiên nguyên 0..100,
 * bắt buộc nội dung thuyết minh tiếng Việt.
 */
export function validatePoiForm(form: PoiForm): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Tên điểm không được để trống';
  else if (name.length > POI_LIMITS.nameMax) errors.name = `Tên điểm tối đa ${POI_LIMITS.nameMax} ký tự`;

  const lat = parseNumber(form.latitude);
  if (!isValidLatitude(lat)) errors.latitude = 'Vĩ độ phải trong khoảng -90 đến 90';
  const lng = parseNumber(form.longitude);
  if (!isValidLongitude(lng)) errors.longitude = 'Kinh độ phải trong khoảng -180 đến 180';

  const radius = parseNumber(form.radius_m);
  if (radius === null || radius <= 0) errors.radius_m = 'Bán kính kích hoạt phải lớn hơn 0';
  else if (radius > POI_LIMITS.radiusMax) errors.radius_m = `Bán kính tối đa ${POI_LIMITS.radiusMax} m`;

  const priorityRaw = form.priority.trim();
  const priority = priorityRaw === '' ? 1 : parseNumber(priorityRaw);
  if (priority === null || !Number.isInteger(priority) || priority < POI_LIMITS.priorityMin || priority > POI_LIMITS.priorityMax) {
    errors.priority = 'Mức ưu tiên là số nguyên từ 0 đến 100';
  }

  for (const code of LANGUAGE_CODES) {
    const t = form.translations[code];
    const text = t?.narration_text.trim() ?? '';
    if (code === DEFAULT_LANGUAGE && !text) {
      errors[translationKey(code)] = 'Bắt buộc nhập nội dung thuyết minh tiếng Việt';
    } else if (t && t.title.trim() && !text) {
      errors[translationKey(code)] = 'Đã có tiêu đề nhưng chưa có nội dung thuyết minh';
    } else if (text.length > POI_LIMITS.narrationMax) {
      errors[translationKey(code)] = `Nội dung tối đa ${POI_LIMITS.narrationMax} ký tự`;
    }
  }
  return errors;
}

/** Chuyển form sang body API. Gọi sau khi `validatePoiForm` không còn lỗi. */
export function toPoiInput(form: PoiForm): PoiInput {
  const priority = form.priority.trim() === '' ? 1 : (parseNumber(form.priority) as number);
  return {
    name: form.name.trim(),
    address: form.address.trim() || null,
    latitude: parseNumber(form.latitude) as number,
    longitude: parseNumber(form.longitude) as number,
    radius_m: Math.round(parseNumber(form.radius_m) as number),
    priority,
    image_url: form.image_url || null,
    translations: filledLanguages(form).map((code) => ({
      language_code: code,
      title: form.translations[code].title.trim() || null,
      narration_text: form.translations[code].narration_text.trim(),
    })),
  };
}

/**
 * Ánh xạ `error.details` của máy chủ về tên trường trên form.
 * `translations` → ô tiếng Việt; `translations.<i>.language_code` → ngôn ngữ thứ i đã gửi.
 */
export function mapServerErrors(details: Record<string, string> | undefined, sent: LanguageCode[] = []): FieldErrors {
  const out: FieldErrors = {};
  if (!details) return out;
  for (const [key, msg] of Object.entries(details)) {
    if (key === 'translations') {
      out[translationKey(DEFAULT_LANGUAGE)] = msg;
      continue;
    }
    const m = key.match(/^translations\.(\d+)\./);
    if (m) {
      const code = sent[Number(m[1])];
      out[code ? translationKey(code) : translationKey(DEFAULT_LANGUAGE)] = msg;
      continue;
    }
    out[key] = msg;
  }
  return out;
}

export function sameForm(a: PoiForm, b: PoiForm): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---- Tour (UC4) ----

export function validateTour(input: TourInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name.trim()) errors.name = 'Tên tour không được để trống';
  else if (input.name.trim().length > 200) errors.name = 'Tên tour tối đa 200 ký tự';
  if (input.poi_ids.length === 0) errors.poi_ids = 'Tour phải có ít nhất một điểm thuyết minh';
  else if (new Set(input.poi_ids).size !== input.poi_ids.length) errors.poi_ids = 'Một điểm không được lặp lại trong cùng tour';
  return errors;
}

/** Đổi chỗ phần tử trong mảng, trả mảng mới (dùng cho nút lên/xuống và kéo thả). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ---- Tài khoản ----

export function validatePasswordChange(current: string, next: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!current) errors.current_password = 'Nhập mật khẩu hiện tại';
  if (next.length < 8) errors.new_password = 'Mật khẩu mới phải có ít nhất 8 ký tự';
  else if (next === current) errors.new_password = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  if (confirm !== next) errors.confirm_password = 'Mật khẩu nhập lại không khớp';
  return errors;
}

// ---- Thống kê ----

export function validateDateRange(from: string, to: string): string | null {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(from) || !re.test(to)) return 'Chọn đầy đủ ngày bắt đầu và ngày kết thúc';
  if (from > to) return 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc';
  return null;
}
