import { describe, expect, it } from 'vitest';
import { QR_INSTRUCTION, qrDataUrl, slugify } from './qr';

describe('slugify', () => {
  it('bỏ dấu tiếng Việt và ký tự đặc biệt', () => {
    expect(slugify('Bến Nhà Rồng – Bảo tàng Hồ Chí Minh')).toBe('ben-nha-rong-bao-tang-ho-chi-minh');
    expect(slugify('Phố ẩm thực Vĩnh Khánh')).toBe('pho-am-thuc-vinh-khanh');
  });

  it('xử lý đ/Đ vì NFD không tách được hai ký tự này', () => {
    expect(slugify('Đường Hoàng Diệu')).toBe('duong-hoang-dieu');
    expect(slugify('ĐẶC BIỆT')).toBe('dac-biet');
  });

  it('gộp khoảng trắng và dấu câu thành một gạch nối', () => {
    expect(slugify('  Trạm   xe  buýt -- Vĩnh Hội  ')).toBe('tram-xe-buyt-vinh-hoi');
  });

  it('cắt tối đa 60 ký tự', () => {
    const s = slugify('a '.repeat(80));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it('trả về "ma-qr" khi không còn ký tự dùng được', () => {
    expect(slugify('!!!')).toBe('ma-qr');
    expect(slugify('   ')).toBe('ma-qr');
    expect(slugify('')).toBe('ma-qr');
  });
});

describe('qrDataUrl', () => {
  it('tạo ảnh PNG dạng data URL', async () => {
    const url = await qrDataUrl('POI-1', 120);
    expect(url).toMatch(/^data:image\/png;base64,/);
    expect(url.length).toBeGreaterThan(200);
  });

  it('mã QR khác nội dung thì ảnh khác nhau', async () => {
    const a = await qrDataUrl('POI-1', 120);
    const b = await qrDataUrl('POI-2', 120);
    expect(a).not.toBe(b);
  });
});

describe('QR_INSTRUCTION', () => {
  it('là câu hướng dẫn hiển thị trên poster', () => {
    expect(QR_INSTRUCTION).toMatch(/^Quét mã/);
  });
});
