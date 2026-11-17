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
}

export const PHOTOS: Record<string, Photo> = {
  'nha-rong-mat-tien': {
    src: '/images/nha-rong-mat-tien.jpg',
    caption: { vi: 'Mặt tiền Bến Nhà Rồng, nay là Bảo tàng Hồ Chí Minh', en: 'Front of Nha Rong Wharf, now the Ho Chi Minh Museum' },
    author: 'Syced',
    license: 'CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_Museum,_in_Saigon_3.jpg',
  },
  'cang-sai-gon': {
    src: '/images/cang-sai-gon.jpg',
    caption: { vi: 'Sông Sài Gòn và khu cảng Khánh Hội nhìn từ trên cao', en: 'The Saigon River and Khanh Hoi port area from above' },
    author: 'Syced',
    license: 'CC0',
    source: 'https://commons.wikimedia.org/wiki/File:Container_ships_on_Saigon_River_3.jpg',
  },
  'vinh-khanh': {
    src: '/images/vinh-khanh-hai-san.jpg',
    caption: { vi: 'Hải sản quán bình dân ở TP.HCM (ảnh minh hoạ)', en: 'Seafood at a local eatery in Ho Chi Minh City (illustrative photo)' },
    author: 'Bahnfrend',
    license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Seafood_with_Bia_Viet,_Ho_Chi_Minh_City,_2023_(02).jpg',
  },
  'tram-xe-buyt': {
    src: '/images/tram-xe-buyt.jpg',
    caption: { vi: 'Một trạm xe buýt ở TP.HCM (ảnh minh hoạ)', en: 'A bus stop in Ho Chi Minh City (illustrative photo)' },
    author: 'HappyMidnight',
    license: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Bus_stop,_Nguy%E1%BB%85n_H%E1%BB%AFu_C%E1%BA%A3nh,_district1,_HCMC.JPG',
  },
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
  [/nhà rồng/i, PHOTOS['nha-rong-mat-tien']],
  [/cầu mống/i, PHOTOS['cau-mong']],
  [/cầu khánh hội/i, PHOTOS['cau-khanh-hoi']],
  [/cảng/i, PHOTOS['cang-sai-gon']],
  [/vĩnh khánh/i, PHOTOS['vinh-khanh']],
  [/xóm chiếu/i, PHOTOS['xom-chieu']],
  [/trạm xe buýt/i, PHOTOS['tram-xe-buyt']],
];

export function poiPhoto(poi: Pick<Poi, 'name' | 'image_url'>): Photo | null {
  if (poi.image_url) return { src: poi.image_url, caption: { vi: poi.name, en: poi.name }, author: '', license: '', source: '' };
  const hit = BY_NAME.find(([re]) => re.test(poi.name));
  return hit ? hit[1] : null;
}
