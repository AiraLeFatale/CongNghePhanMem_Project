/**
 * Ảnh đại diện cho điểm trong CMS: ưu tiên ảnh đã tải lên, không có thì dùng ảnh minh hoạ của website công khai
 * (cùng tên miền, thư mục /images/ai) theo tên điểm, giống web/src/lib/photos.ts.
 */
const BY_NAME: [RegExp, string][] = [
  [/nhà rồng/i, 'hero-nha-rong'],
  [/cầu mống/i, 'cau-mong'],
  [/cầu khánh hội/i, 'cau-khanh-hoi'],
  [/cảng/i, 'cang-sai-gon'],
  [/vĩnh khánh/i, 'pho-am-thuc'],
  [/xóm chiếu/i, 'xom-chieu'],
  [/trạm xe buýt/i, 'tram-xe-buyt'],
];

export function poiPhoto(name: string, imageUrl?: string | null): string | null {
  if (imageUrl) return imageUrl;
  const hit = BY_NAME.find(([re]) => re.test(name));
  return hit ? `/images/ai/${hit[1]}.jpg` : null;
}
