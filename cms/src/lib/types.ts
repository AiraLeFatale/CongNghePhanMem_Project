/**
 * Các kiểu dữ liệu dùng chung giữa API, form và trang CMS.
 * Phản ánh cấu trúc JSON mà backend trả về hoặc nhận vào.
 */
// Mã ngôn ngữ thuyết minh được hệ thống hỗ trợ.
export type LanguageCode = 'vi' | 'en' | 'zh' | 'ko' | 'ja' | 'fr';

// Tài khoản quản trị đang đăng nhập.
export interface AdminUser {
  id: number;
  username: string;
  full_name?: string | null;
}

// Dòng trong danh sách POI: kèm số ngôn ngữ, số bản ghi âm và số mã QR.
export interface PoiListItem {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_m: number;
  priority: number;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
  languages: LanguageCode[];
  audio_languages: LanguageCode[];
  qr_count: number;
}

// Bản dịch thuyết minh của một POI theo từng ngôn ngữ.
export interface Translation {
  language_code: LanguageCode;
  title: string | null;
  narration_text: string;
  audio_url: string | null;
  audio_source: 'tts' | 'upload' | null;
}

// Mã QR gắn với một POI; `payload` là mã định danh, `content` là nội dung in thực tế.
export interface QrCode {
  id: number;
  poi_id: number;
  payload: string;
  label: string | null;
  content?: string;
  created_at: string;
  poi_name?: string;
}

// POI đầy đủ dùng ở trang chi tiết/sửa: gồm mọi bản dịch và mã QR.
export interface Poi {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_m: number;
  priority: number;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
  translations: Translation[];
  qrcodes: QrCode[];
}

// Body gửi lên khi tạo/cập nhật POI.
export interface PoiInput {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_m: number;
  priority: number;
  image_url: string | null;
  translations: { language_code: LanguageCode; title: string | null; narration_text: string }[];
}

// Dòng trong danh sách tour: kèm số điểm dừng.
export interface TourListItem {
  id: number;
  name: string;
  description: string | null;
  poi_count: number;
  created_at: string;
  updated_at: string;
}

// Một điểm dừng trong tour, kèm thứ tự tham quan.
export interface TourPoi {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  visit_order: number;
}

// Tour đầy đủ gồm danh sách điểm dừng đã sắp thứ tự.
export interface Tour {
  id: number;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
  pois: TourPoi[];
}

// Body gửi lên khi tạo/cập nhật tour; thứ tự `poi_ids` là thứ tự tham quan.
export interface TourInput {
  name: string;
  description: string | null;
  poi_ids: number[];
}

// Kết quả báo cáo thống kê: tổng hợp, chia theo điểm/ngày/giờ/phương thức/ngôn ngữ,
// dữ liệu bản đồ nhiệt và lộ trình.
export interface AnalyticsReport {
  filters: { from: string | null; to: string | null; tour_id: number | null };
  has_data: boolean;
  summary: { plays: number; sessions: number; avg_listen_seconds: number; total_listen_seconds: number };
  by_method: { method: string; plays: number }[];
  by_language: { language: string; plays: number }[];
  per_poi: { poi_id: number; name: string; latitude: number; longitude: number; plays: number; avg_listen_seconds: number; sessions: number }[];
  daily: { date: string; plays: number }[];
  hourly: { hour: number; plays: number }[];
  heatmap: { lat: number; lng: number; weight: number }[];
  routes: { route: number; points: [number, number][] }[];
}

// Bộ lọc gửi lên API thống kê.
export interface AnalyticsQuery {
  from?: string;
  to?: string;
  tour_id?: number | null;
}
