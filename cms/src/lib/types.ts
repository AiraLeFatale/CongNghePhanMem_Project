export type LanguageCode = 'vi' | 'en' | 'zh' | 'ko' | 'ja' | 'fr';

export interface AdminUser {
  id: number;
  username: string;
  full_name?: string | null;
}

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

export interface Translation {
  language_code: LanguageCode;
  title: string | null;
  narration_text: string;
  audio_url: string | null;
  audio_source: 'tts' | 'upload' | null;
}

export interface QrCode {
  id: number;
  poi_id: number;
  payload: string;
  label: string | null;
  content?: string;
  created_at: string;
  poi_name?: string;
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
  created_at?: string;
  updated_at?: string;
  translations: Translation[];
  qrcodes: QrCode[];
}

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

export interface TourListItem {
  id: number;
  name: string;
  description: string | null;
  poi_count: number;
  created_at: string;
  updated_at: string;
}

export interface TourPoi {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  visit_order: number;
}

export interface Tour {
  id: number;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
  pois: TourPoi[];
}

export interface TourInput {
  name: string;
  description: string | null;
  poi_ids: number[];
}

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

export interface AnalyticsQuery {
  from?: string;
  to?: string;
  tour_id?: number | null;
}
