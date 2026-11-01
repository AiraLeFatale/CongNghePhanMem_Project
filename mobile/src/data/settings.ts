/** Đọc/ghi cài đặt người dùng vào SQLite (bảng kv). */
import { getLocales } from 'expo-localization';
import { isLanguageCode } from '../types';
import { kvGet, kvSet } from './db';
import type { Settings } from '../state/store';

// Khoá lưu toàn bộ cài đặt dưới dạng JSON trong bảng kv.
const KEY = 'settings';

/** Lấy ngôn ngữ từ locale hệ thống; nếu không được hỗ trợ hoặc lỗi thì mặc định "vi". */
export function initialLanguage(): Settings['language'] {
  try {
    const code = getLocales()[0]?.languageCode ?? 'vi';
    return isLanguageCode(code) ? code : 'vi';
  } catch {
    return 'vi';
  }
}

/**
 * Chuẩn hoá cài đặt đọc từ bộ nhớ: sai kiểu/rác thì dùng `base`,
 * riêng các giá trị số bị kẹp trong khoảng cho phép.
 */
export function sanitizeSettings(raw: unknown, base: Settings): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings>;
  // Ép về số và kẹp trong [min, max]; không phải số hữu hạn thì dùng mặc định.
  const num = (v: unknown, d: number, min: number, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
  };
  return {
    language: isLanguageCode(r.language) ? r.language : base.language,
    autoNarration: typeof r.autoNarration === 'boolean' ? r.autoNarration : base.autoNarration,
    cooldownMinutes: num(r.cooldownMinutes, base.cooldownMinutes, 0, 240),
    serverUrl: typeof r.serverUrl === 'string' ? r.serverUrl : base.serverUrl,
    shareAnonymousData: typeof r.shareAnonymousData === 'boolean' ? r.shareAnonymousData : base.shareAnonymousData,
    backgroundLocation: typeof r.backgroundLocation === 'boolean' ? r.backgroundLocation : base.backgroundLocation,
    simulation: typeof r.simulation === 'boolean' ? r.simulation : base.simulation,
    simSpeed: num(r.simSpeed, base.simSpeed, 1, 30),
  };
}

/** Đọc cài đặt đã lưu; lần đầu chạy hoặc JSON hỏng thì dùng giá trị mặc định. */
export async function loadSettings(defaults: Settings): Promise<Settings> {
  const raw = await kvGet(KEY);
  if (!raw) return { ...defaults, language: initialLanguage() };
  try {
    return sanitizeSettings(JSON.parse(raw), defaults);
  } catch {
    return defaults;
  }
}

/** Ghi cài đặt hiện tại vào SQLite (một dòng kv dạng JSON). */
export async function saveSettings(s: Settings): Promise<void> {
  await kvSet(KEY, JSON.stringify(s));
}
