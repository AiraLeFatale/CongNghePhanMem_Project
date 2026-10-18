import type { Poi } from '../types';

/** Toạ độ thật của seed backend (Quận 4). */
export const NHA_RONG: Poi = {
  id: 1, name: 'Bến Nhà Rồng', address: null, latitude: 10.7681, longitude: 106.7068, radius_m: 80, priority: 10,
  image_url: null, updated_at: null,
  translations: [
    { language_code: 'vi', title: 'Bến Nhà Rồng', narration_text: 'Bạn đang đến Bến Nhà Rồng.', audio_url: null },
    { language_code: 'en', title: 'Nha Rong Wharf', narration_text: 'You are approaching Nha Rong Wharf.', audio_url: '/uploads/en.mp3' },
  ],
};

export const CAU_MONG: Poi = {
  id: 5, name: 'Cầu Mống', address: null, latitude: 10.7699, longitude: 106.7049, radius_m: 60, priority: 7,
  image_url: null, updated_at: null,
  translations: [{ language_code: 'vi', title: 'Cầu Mống', narration_text: 'Đây là cầu Mống.', audio_url: null }],
};

/** Dịch toạ độ về phía bắc `m` mét. */
export const north = (p: { latitude: number; longitude: number }, m: number) => ({
  latitude: p.latitude + m / 111_195,
  longitude: p.longitude,
});
