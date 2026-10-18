import { diffBundles, planSync, resolveMediaUrl, SYNC_FORMAT, validateBundle } from '../data/syncLogic';
import { parseQrPayload, qrApiPath } from '../engine/qr';
import { chunk, isValidSessionId, shouldSampleLocation } from '../services/analyticsPolicy';
import { CAU_MONG, NHA_RONG, north } from './fixtures';

describe('planSync', () => {
  it('chưa có dữ liệu → tải', () => {
    expect(planSync(null, 3, false)).toBe('download');
    expect(planSync(3, 3, false)).toBe('download');
  });
  it('cùng phiên bản → bỏ qua; khác → tải (kể cả khi máy chủ giảm số)', () => {
    expect(planSync(3, 3, true)).toBe('skip');
    expect(planSync(3, 4, true)).toBe('download');
    expect(planSync(5, 4, true)).toBe('download');
  });
  it('định dạng lưu cũ (chưa có bảng QR) → tải lại', () => {
    expect(planSync(3, 3, true, SYNC_FORMAT - 1)).toBe('download');
  });
});

describe('diffBundles', () => {
  const tours = [{ id: 1, name: 'T', description: null, updated_at: null, poi_ids: [1, 5] }];
  it('phát hiện thêm/sửa/xoá POI và audio cần tải/xoá', () => {
    const changed = {
      ...NHA_RONG,
      translations: [{ language_code: 'vi', title: 'Bến Nhà Rồng', narration_text: 'mới', audio_url: '/uploads/vi.mp3' }],
    };
    const added = { ...CAU_MONG, id: 7 };
    const d = diffBundles([NHA_RONG, CAU_MONG], tours, { version: 2, pois: [changed, added], tours });
    expect(d.added).toEqual([7]);
    expect(d.updated).toEqual([1]);
    expect(d.removed).toEqual([5]);
    expect(d.newAudio).toEqual(['/uploads/vi.mp3']);
    expect(d.removedAudio).toEqual(['/uploads/en.mp3']);
    expect(d.toursChanged).toBe(false);
  });
  it('không đổi gì → rỗng; thứ tự bản dịch không ảnh hưởng', () => {
    const reordered = { ...NHA_RONG, translations: [...NHA_RONG.translations].reverse() };
    const d = diffBundles([NHA_RONG], tours, { version: 2, pois: [reordered], tours });
    expect(d).toMatchObject({ added: [], updated: [], removed: [], newAudio: [], removedAudio: [] });
  });
  it('đổi thứ tự điểm trong tour → toursChanged', () => {
    const d = diffBundles([], tours, { version: 2, pois: [], tours: [{ ...tours[0], poi_ids: [5, 1] }] });
    expect(d.toursChanged).toBe(true);
  });
});

describe('validateBundle', () => {
  it('chuẩn hoá dữ liệu, loại POI hỏng, lọc tour/QR trỏ tới POI không tồn tại', () => {
    const b = validateBundle({
      version: '4',
      pois: [NHA_RONG, { id: 2, latitude: 'x', longitude: 1, radius_m: 10 }, { id: 3, latitude: 1, longitude: 1, radius_m: 0 }],
      tours: [{ id: 1, name: 'T', poi_ids: [1, 2, 99] }],
      qrcodes: [
        { payload: 'abcdef123', poi_id: 1, label: 'Trạm' },
        { payload: 'zzzzzz999', poi_id: 99, label: null },
        { payload: '', poi_id: 1 },
      ],
    });
    expect(b.version).toBe(4);
    expect(b.pois.map((p) => p.id)).toEqual([1]);
    expect(b.tours[0].poi_ids).toEqual([1]);
    expect(b.qrcodes).toEqual([{ payload: 'abcdef123', poi_id: 1, label: 'Trạm' }]);
  });
  it('gói từ backend cũ (không có qrcodes) vẫn hợp lệ', () => {
    expect(validateBundle({ version: 1, pois: [], tours: [] }).qrcodes).toEqual([]);
  });
  it('thiếu version/pois → lỗi', () => {
    expect(() => validateBundle({ pois: [], tours: [] })).toThrow();
    expect(() => validateBundle({ version: 1 })).toThrow();
    expect(() => validateBundle(null)).toThrow();
  });
});

describe('resolveMediaUrl', () => {
  it('ghép /uploads với địa chỉ máy chủ, bỏ hậu tố /api', () => {
    expect(resolveMediaUrl('/uploads/a.mp3', 'http://192.168.1.5:4000')).toBe('http://192.168.1.5:4000/uploads/a.mp3');
    expect(resolveMediaUrl('/uploads/a.mp3', 'http://h:4000/api/')).toBe('http://h:4000/uploads/a.mp3');
    expect(resolveMediaUrl('uploads/a.mp3', 'http://h:4000')).toBe('http://h:4000/uploads/a.mp3');
  });
  it('URL tuyệt đối / file cục bộ giữ nguyên; rỗng → null', () => {
    expect(resolveMediaUrl('https://cdn/x.mp3', 'http://h')).toBe('https://cdn/x.mp3');
    expect(resolveMediaUrl('file:///a.mp3', 'http://h')).toBe('file:///a.mp3');
    expect(resolveMediaUrl(null, 'http://h')).toBeNull();
  });
});

describe('parseQrPayload (UC2)', () => {
  it('dạng NARR:<mã> (khớp seed backend)', () => {
    expect(parseQrPayload('NARR:VSdMICEvK7Ln')).toEqual({ code: 'VSdMICEvK7Ln', payload: 'NARR:VSdMICEvK7Ln' });
    expect(parseQrPayload('  narr:rm0AFPQ2-TrC \n')?.code).toBe('rm0AFPQ2-TrC');
  });
  it('dạng URL .../q/<mã> và mã trần', () => {
    expect(parseQrPayload('https://thuyetminh.vn/q/4lUZ4hiy7lXM')?.code).toBe('4lUZ4hiy7lXM');
    expect(parseQrPayload('https://x.vn/q/4lUZ4hiy7lXM/?utm=1')?.code).toBe('4lUZ4hiy7lXM');
    expect(parseQrPayload('m8lT3ntYxeuu')?.payload).toBe('NARR:m8lT3ntYxeuu');
  });
  it('E1: chuỗi không hợp lệ → null', () => {
    for (const bad of ['', '   ', 'NARR:', 'NARR:ab', 'hello world', 'https://google.com', 'NARR:abc$%^def', 42, null, undefined]) {
      expect(parseQrPayload(bad as any)).toBeNull();
    }
  });
  it('đường dẫn API được encodeURIComponent', () => {
    expect(qrApiPath(parseQrPayload('NARR:abc-DEF_12')!)).toBe('/api/qr/NARR%3Aabc-DEF_12');
  });
});

describe('analytics policy', () => {
  const p0 = { latitude: 10.76, longitude: 106.7, t: 0 };
  it('mẫu đầu tiên luôn được ghi', () => expect(shouldSampleLocation(null, p0)).toBe(true));
  it('đứng yên: ghi lại sau ~30 s', () => {
    expect(shouldSampleLocation(p0, { ...p0, t: 29_000 })).toBe(false);
    expect(shouldSampleLocation(p0, { ...p0, t: 30_000 })).toBe(true);
  });
  it('di chuyển ≥ 25 m: ghi sớm hơn nhưng không dày hơn 5 s', () => {
    const moved = { ...north(p0, 30), t: 6_000 };
    expect(shouldSampleLocation(p0, moved)).toBe(true);
    expect(shouldSampleLocation(p0, { ...north(p0, 30), t: 2_000 })).toBe(false);
    expect(shouldSampleLocation(p0, { ...north(p0, 10), t: 10_000 })).toBe(false);
  });
  it('session_id hợp lệ theo quy tắc máy chủ', () => {
    expect(isValidSessionId('a1b2c3d4e5f6a7b8')).toBe(true);
    expect(isValidSessionId('3f2c9a0e8b7d4c1fa9e6b5d4c3b2a190')).toBe(true);
    expect(isValidSessionId('short')).toBe(false);
    expect(isValidSessionId('có dấu cách')).toBe(false);
  });
  it('chunk chia lô ≤ size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
