import type { Poi } from './types';

/**
 * Ảnh thật từ Wikimedia Commons (giấy phép mở), lưu ở public/images.
 * Điểm chưa có ảnh trong CMS thì dùng ảnh ở đây theo tên điểm; điểm không có ảnh phù hợp thì để trống,
 * không dùng ảnh minh hoạ không đúng địa điểm.
 */
export interface Photo {
  src: string;
  caption: { vi: string; en: string };
  author: string;
  license: string;
  source: string;
  /** Ảnh minh hoạ tạo bằng AI (không phải ảnh chụp thật). */
  ai?: boolean;
}

function ai(file: string, vi: string, en: string): Photo {
  return { src: `/images/ai/${file}.jpg`, caption: { vi, en }, author: '', license: '', source: '', ai: true };
}

/** Ảnh minh hoạ AI cùng tông sáng với giao diện, dùng cho các điểm thuyết minh. */
export const AI_PHOTOS = {
  'nha-rong': ai('hero-nha-rong', 'Bến Nhà Rồng – Bảo tàng Hồ Chí Minh (ảnh minh hoạ AI)', 'Nha Rong Wharf – Ho Chi Minh Museum (AI illustration)'),
  'cau-mong': ai('cau-mong', 'Cầu Mống bắc qua kênh Bến Nghé (ảnh minh hoạ AI)', 'Mong Bridge over the Ben Nghe canal (AI illustration)'),
  'cau-khanh-hoi': ai('cau-khanh-hoi', 'Cầu Khánh Hội nối Quận 4 với Quận 1 (ảnh minh hoạ AI)', 'Khanh Hoi Bridge (AI illustration)'),
  'cang-sai-gon': ai('cang-sai-gon', 'Cảng Sài Gòn khu Khánh Hội (ảnh minh hoạ AI)', 'Saigon Port at Khanh Hoi (AI illustration)'),
  'xom-chieu': ai('xom-chieu', 'Nhà thờ Xóm Chiếu, cạnh chợ Xóm Chiếu (ảnh minh hoạ AI)', 'Xom Chieu Church by the market (AI illustration)'),
  'vinh-khanh': ai('pho-am-thuc', 'Phố ẩm thực Vĩnh Khánh lúc lên đèn (ảnh minh hoạ AI)', 'Vinh Khanh food street at dusk (AI illustration)'),
  'tram-xe-buyt': ai('tram-xe-buyt', 'Trạm xe buýt có mã QR (ảnh minh hoạ AI)', 'Bus stop with a QR code (AI illustration)'),
} satisfies Record<string, Photo>;

export const PHOTOS: Record<string, Photo> = {
  'nha-rong': {
    src: '/images/nha-rong.jpg',
    caption: { vi: 'Toà nhà Rồng, nay là Bảo tàng Hồ Chí Minh', en: 'The Dragon House, now the Ho Chi Minh Museum' },
    author: 'David Stanley',
    license: 'CC BY 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Dragon_Wharf.jpg',
  },
  'nha-rong-dem': {
    src: '/images/nha-rong-dem.jpg',
    caption: { vi: 'Bến Nhà Rồng về đêm', en: 'Nha Rong Wharf at night' },
    author: 'Eternal Dragon',
    license: 'CC BY 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Ben_Nha_Rong_ve_dem.JPG',
  },
  'cau-mong': {
    src: '/images/cau-mong.jpg',
    caption: { vi: 'Cầu Mống bắc qua rạch Bến Nghé', en: 'Mong Bridge over the Ben Nghe channel' },
    author: 'son do',
    license: 'CC BY 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Cau_Mong,_Saigon_(14170976790).jpg',
  },
  'cau-khanh-hoi': {
    src: '/images/cau-khanh-hoi.jpg',
    caption: { vi: 'Cầu Khánh Hội nối Quận 4 với Quận 1', en: 'Khanh Hoi Bridge, linking District 4 and District 1' },
    author: 'Syced',
    license: 'CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Pedestrian_on_Khanh_Hoi_Bridge.jpg',
  },
  'cang-khanh-hoi': {
    src: '/images/cang-khanh-hoi.jpg',
    caption: { vi: 'Cảng Khánh Hội nhìn từ trên cao, ảnh tư liệu', en: 'Khanh Hoi Port from above, archive photo' },
    author: 'U.S. National Archives (K-33094)',
    license: 'Public domain',
    source: 'https://commons.wikimedia.org/wiki/File:K-33094_Khanh_Hoi_Port.jpg',
  },
  'xom-chieu': {
    src: '/images/xom-chieu.jpg',
    caption: { vi: 'Nhà thờ Xóm Chiếu, cạnh chợ Xóm Chiếu', en: 'Xom Chieu Church, next to Xom Chieu Market' },
    author: 'Akira2112',
    license: 'CC BY 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Nh%C3%A0_th%E1%BB%9D_X%C3%B3m_Chi%E1%BA%BFu.jpg',
  },
  'song-sai-gon': {
    src: '/images/song-sai-gon.jpg',
    caption: { vi: 'Sông Sài Gòn nhìn từ Bến Nhà Rồng', en: 'The Saigon River seen from Nha Rong Wharf' },
    author: 'Ngô Trung',
    license: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:B%E1%BA%BFn_Nh%C3%A0_R%E1%BB%93ng_v%C3%A0_c%E1%BA%A7u_Kh%C3%A1nh_H%E1%BB%99i.JPG',
  },
  'rach-ben-nghe': {
    src: '/images/rach-ben-nghe.jpg',
    caption: { vi: 'Rạch Bến Nghé, ranh giới Quận 4 và Quận 1', en: 'Ben Nghe channel, the border of District 4 and District 1' },
    author: 'Syced',
    license: 'CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Ben_Nghe_Creek,_Saigon_(20230705_1457).jpg',
  },
  'tau-song': {
    src: '/images/tau-song.jpg',
    caption: { vi: 'Tàu neo bên bờ sông Sài Gòn', en: 'A boat moored on the Saigon River' },
    author: 'Syced',
    license: 'CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Saigon_River_(20230705_1503).jpg',
  },
};

const BY_NAME: [RegExp, Photo][] = [
  [/nhà rồng/i, AI_PHOTOS['nha-rong']],
  [/cầu mống/i, AI_PHOTOS['cau-mong']],
  [/cầu khánh hội/i, AI_PHOTOS['cau-khanh-hoi']],
  [/cảng/i, AI_PHOTOS['cang-sai-gon']],
  [/vĩnh khánh/i, AI_PHOTOS['vinh-khanh']],
  [/xóm chiếu/i, AI_PHOTOS['xom-chieu']],
  [/trạm xe buýt/i, AI_PHOTOS['tram-xe-buyt']],
];

export function poiPhoto(poi: Pick<Poi, 'name' | 'image_url'>): Photo | null {
  if (poi.image_url) return { src: poi.image_url, caption: { vi: poi.name, en: poi.name }, author: '', license: '', source: '' };
  const hit = BY_NAME.find(([re]) => re.test(poi.name));
  return hit ? hit[1] : null;
}
