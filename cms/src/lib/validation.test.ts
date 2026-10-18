import { describe, expect, it } from 'vitest';
import {
  emptyPoiForm,
  filledLanguages,
  mapServerErrors,
  moveItem,
  parseNumber,
  poiToForm,
  toPoiInput,
  validateDateRange,
  validatePasswordChange,
  validatePoiForm,
  validateTour,
  type PoiForm,
} from './validation';

function validForm(): PoiForm {
  const f = emptyPoiForm();
  f.name = 'Bến Nhà Rồng';
  f.latitude = '10.7681';
  f.longitude = '106.7068';
  f.radius_m = '80';
  f.priority = '10';
  f.translations.vi = { title: 'Bến Nhà Rồng', narration_text: 'Bạn đang đến Bến Nhà Rồng.' };
  return f;
}

describe('parseNumber', () => {
  it('đọc số thập phân, chấp nhận dấu phẩy', () => {
    expect(parseNumber('10.5')).toBe(10.5);
    expect(parseNumber('10,7681')).toBe(10.7681);
    expect(parseNumber(' -3 ')).toBe(-3);
  });
  it('trả null cho chuỗi rỗng hoặc không phải số', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('12abc')).toBeNull();
    expect(parseNumber(null)).toBeNull();
  });
});

describe('validatePoiForm (UC3 E1)', () => {
  it('form hợp lệ không có lỗi', () => {
    expect(validatePoiForm(validForm())).toEqual({});
  });

  it('bắt lỗi toạ độ ngoài khoảng', () => {
    const f = validForm();
    f.latitude = '90.0001';
    f.longitude = '-180.5';
    const e = validatePoiForm(f);
    expect(e.latitude).toMatch(/-90 đến 90/);
    expect(e.longitude).toMatch(/-180 đến 180/);
  });

  it('chấp nhận biên −90/90 và −180/180', () => {
    const f = validForm();
    f.latitude = '-90';
    f.longitude = '180';
    expect(validatePoiForm(f)).toEqual({});
  });

  it('bán kính phải > 0 và ≤ 5000', () => {
    const f = validForm();
    f.radius_m = '0';
    expect(validatePoiForm(f).radius_m).toMatch(/lớn hơn 0/);
    f.radius_m = '5001';
    expect(validatePoiForm(f).radius_m).toMatch(/5000/);
    f.radius_m = '5000';
    expect(validatePoiForm(f).radius_m).toBeUndefined();
  });

  it('mức ưu tiên nguyên 0..100, để trống thì mặc định 1', () => {
    const f = validForm();
    f.priority = '1.5';
    expect(validatePoiForm(f).priority).toBeDefined();
    f.priority = '101';
    expect(validatePoiForm(f).priority).toBeDefined();
    f.priority = '';
    expect(validatePoiForm(f).priority).toBeUndefined();
    expect(toPoiInput(f).priority).toBe(1);
  });

  it('bắt buộc nội dung tiếng Việt', () => {
    const f = validForm();
    f.translations.vi.narration_text = '   ';
    expect(validatePoiForm(f)['translations.vi']).toMatch(/tiếng Việt/);
  });

  it('tên không được trống', () => {
    const f = validForm();
    f.name = '  ';
    expect(validatePoiForm(f).name).toBeDefined();
  });

  it('ngôn ngữ phụ có tiêu đề mà thiếu nội dung là lỗi', () => {
    const f = validForm();
    f.translations.en.title = 'Nha Rong';
    expect(validatePoiForm(f)['translations.en']).toBeDefined();
  });
});

describe('toPoiInput', () => {
  it('chỉ gửi các ngôn ngữ có nội dung, cắt khoảng trắng, đổi kiểu số', () => {
    const f = validForm();
    f.translations.en = { title: '', narration_text: ' Hello ' };
    f.address = '  ';
    f.radius_m = '80.6';
    const input = toPoiInput(f);
    expect(input.translations.map((t) => t.language_code)).toEqual(['vi', 'en']);
    expect(input.translations[1]).toEqual({ language_code: 'en', title: null, narration_text: 'Hello' });
    expect(input.address).toBeNull();
    expect(input.latitude).toBe(10.7681);
    expect(input.radius_m).toBe(81);
    expect(filledLanguages(f)).toEqual(['vi', 'en']);
  });

  it('poiToForm ↔ toPoiInput giữ nguyên dữ liệu', () => {
    const form = poiToForm({
      id: 1,
      name: 'A',
      address: null,
      latitude: 10.76,
      longitude: 106.7,
      radius_m: 50,
      priority: 3,
      image_url: '/uploads/a.jpg',
      translations: [{ language_code: 'vi', title: 'A', narration_text: 'Nội dung', audio_url: null, audio_source: null }],
      qrcodes: [],
    });
    expect(validatePoiForm(form)).toEqual({});
    expect(toPoiInput(form)).toMatchObject({ name: 'A', latitude: 10.76, radius_m: 50, image_url: '/uploads/a.jpg' });
  });
});

describe('mapServerErrors', () => {
  it('ánh xạ details của máy chủ về trường trên form', () => {
    const mapped = mapServerErrors(
      {
        radius_m: 'Bán kính kích hoạt phải lớn hơn 0',
        translations: 'Cần ít nhất nội dung thuyết minh bằng ngôn ngữ mặc định (vi)',
        'translations.1.language_code': 'Ngôn ngữ "xx" không được hỗ trợ',
      },
      ['vi', 'ja'],
    );
    expect(mapped).toEqual({
      radius_m: 'Bán kính kích hoạt phải lớn hơn 0',
      'translations.vi': 'Cần ít nhất nội dung thuyết minh bằng ngôn ngữ mặc định (vi)',
      'translations.ja': 'Ngôn ngữ "xx" không được hỗ trợ',
    });
    expect(mapServerErrors(undefined)).toEqual({});
  });
});

describe('tour', () => {
  it('chặn tour rỗng (UC4 E1) và tên trống', () => {
    expect(validateTour({ name: 'Tour A', description: null, poi_ids: [] }).poi_ids).toMatch(/ít nhất một/);
    expect(validateTour({ name: ' ', description: null, poi_ids: [1] }).name).toBeDefined();
    expect(validateTour({ name: 'Tour A', description: null, poi_ids: [1, 1] }).poi_ids).toMatch(/lặp lại/);
    expect(validateTour({ name: 'Tour A', description: null, poi_ids: [3, 1, 2] })).toEqual({});
  });
  it('moveItem đổi thứ tự không làm đổi mảng gốc', () => {
    const src = [1, 2, 3, 4];
    expect(moveItem(src, 0, 2)).toEqual([2, 3, 1, 4]);
    expect(moveItem(src, 3, 0)).toEqual([4, 1, 2, 3]);
    expect(moveItem(src, 0, 9)).toEqual([1, 2, 3, 4]);
    expect(src).toEqual([1, 2, 3, 4]);
  });
});

describe('khác', () => {
  it('đổi mật khẩu', () => {
    expect(validatePasswordChange('', 'short', 'x')).toMatchObject({
      current_password: expect.any(String),
      new_password: expect.any(String),
      confirm_password: expect.any(String),
    });
    expect(validatePasswordChange('admin123', 'admin123', 'admin123').new_password).toBeDefined();
    expect(validatePasswordChange('admin123', 'matkhaumoi1', 'matkhaumoi1')).toEqual({});
  });
  it('khoảng ngày', () => {
    expect(validateDateRange('2026-10-01', '2026-10-18')).toBeNull();
    expect(validateDateRange('2026-10-18', '2026-10-18')).toBeNull();
    expect(validateDateRange('2026-10-19', '2026-10-18')).toMatch(/trước/);
    expect(validateDateRange('', '2026-10-18')).toBeDefined();
  });
});
