/** Kiểu dữ liệu dùng chung giữa Content layer, Geofence engine, Narration engine và UI. */

// Danh sách ngôn ngữ thuyết minh được hỗ trợ, dùng chung cho UI, dữ liệu và API.
export const LANGUAGES = ['vi', 'en', 'zh', 'ko', 'ja', 'fr'] as const;
export type LanguageCode = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: LanguageCode = 'vi';

// Type guard kiểm tra một giá trị bất kỳ có phải mã ngôn ngữ hợp lệ.
export function isLanguageCode(v: unknown): v is LanguageCode {
  return typeof v === 'string' && (LANGUAGES as readonly string[]).includes(v);
}

// Một bản dịch của POI: tiêu đề, văn bản thuyết minh và audio (nếu có).
export interface Translation {
  language_code: string;
  title: string | null;
  narration_text: string | null;
  audio_url: string | null;
  audio_source?: string | null;
}

// Điểm thuyết minh (POI): toạ độ, bán kính geofence, độ ưu tiên và các bản dịch.
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

// Tour tham quan: danh sách id POI theo thứ tự đi.
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

// Cách bài thuyết minh được kích hoạt: tự động theo vùng, quét QR hoặc người dùng bấm nghe.
export type TriggerMethod = 'geofence' | 'qr' | 'manual';

// Một lần định vị đã qua lọc, kèm nguồn dữ liệu (GPS, nền, mô phỏng).
export interface LocationFix {
  latitude: number;
  longitude: number;
  /** Độ chính xác (m); null nếu không rõ. */
  accuracy: number | null;
  timestamp: number;
  source: 'gps' | 'background' | 'simulation';
}

// Bản ghi lượt nghe gửi lên server để thống kê mức độ sử dụng.
export interface UsageLog {
  poi_id: number;
  session_id: string;
  trigger_method: TriggerMethod;
  language_code: string;
  played_at: string;
  listen_seconds: number;
}

// Bản ghi vị trí ẩn danh theo phiên, phục vụ phân tích hành trình.
export interface LocationLog {
  session_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
}
