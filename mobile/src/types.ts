/** Kiểu dữ liệu dùng chung giữa Content layer, Geofence engine, Narration engine và UI. */

export const LANGUAGES = ['vi', 'en', 'zh', 'ko', 'ja', 'fr'] as const;
export type LanguageCode = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: LanguageCode = 'vi';

export function isLanguageCode(v: unknown): v is LanguageCode {
  return typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v);
}

export interface Translation {
  language_code: string;
  title: string | null;
  narration_text: string | null;
  audio_url: string | null;
  audio_source?: string | null;
}

export interface Poi {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_m: number;
  priority: number;
  image_url: string | null;
  updated_at: string | null;
  translations: Translation[];
}

export interface Tour {
  id: number;
  name: string;
  description: string | null;
  updated_at: string | null;
  poi_ids: number[];
}

/** Ánh xạ mã QR → POI (payload KHÔNG có tiền tố "NARR:"). */
export interface QrMapping {
  payload: string;
  poi_id: number;
  label: string | null;
}

/** Gói dữ liệu GET /api/sync */
export interface SyncBundle {
  version: number;
  generated_at?: string;
  default_language?: string;
  languages?: { code: string; name: string }[];
  pois: Poi[];
  tours: Tour[];
  /** Có từ backend bản cập nhật QR offline; bản cũ không có trường này. */
  qrcodes?: QrMapping[];
}

export type TriggerMethod = 'geofence' | 'qr' | 'manual';

export interface LocationFix {
  latitude: number;
  longitude: number;
  /** Độ chính xác (m); null nếu không rõ. */
  accuracy: number | null;
  timestamp: number;
  source: 'gps' | 'background' | 'simulation';
}

export interface UsageLog {
  poi_id: number;
  session_id: string;
  trigger_method: TriggerMethod;
  language_code: string;
  played_at: string;
  listen_seconds: number;
}

export interface LocationLog {
  session_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
}
