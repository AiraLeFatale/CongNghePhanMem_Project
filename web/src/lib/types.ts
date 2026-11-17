export type LanguageCode = 'vi' | 'en' | 'zh' | 'ko' | 'ja' | 'fr';

export interface Translation {
  language_code: LanguageCode;
  title: string | null;
  narration_text: string;
  audio_url: string | null;
  audio_source: 'tts' | 'upload' | null;
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
  updated_at?: string;
  /** Phí nghe (đồng); 0 là miễn phí. */
  price?: number;
  /** true: chỉ có đoạn nghe thử, cần thanh toán để nghe toàn bộ. */
  locked?: boolean;
  translations: Translation[];
}

export interface Tour {
  id: number;
  name: string;
  description: string | null;
  updated_at?: string;
  poi_ids: number[];
}

export interface SyncData {
  version: number;
  generated_at: string;
  default_language: LanguageCode;
  languages: { code: LanguageCode; name: string }[];
  pois: Poi[];
  tours: Tour[];
  qrcodes: { payload: string; poi_id: number; label: string | null }[];
  payment_enabled?: boolean;
}

export interface Order {
  code: string;
  poi_id: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  claimed?: boolean;
  token?: string;
  bank?: { bin: string; name: string; account: string; account_name: string };
  transfer_note?: string;
}

export interface QrResolution {
  qr: { id: number; label: string | null };
  poi: Poi;
}
