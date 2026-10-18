import { displayTitle, resolveTranslation, TTS_LOCALE } from '../engine/language';
import { CAU_MONG, NHA_RONG } from './fixtures';

describe('resolveTranslation', () => {
  it('dùng đúng ngôn ngữ đã chọn khi có', () => {
    expect(resolveTranslation(NHA_RONG.translations, 'en')).toMatchObject({ language: 'en', isFallback: false });
  });
  it('fallback tiếng Việt khi thiếu bản dịch', () => {
    expect(resolveTranslation(CAU_MONG.translations, 'ja')).toMatchObject({ language: 'vi', isFallback: true });
  });
  it('bản dịch rỗng (không text, không audio) coi như không có', () => {
    const tr = [
      { language_code: 'fr', title: 'X', narration_text: '  ', audio_url: null },
      { language_code: 'vi', title: 'Y', narration_text: 'nội dung', audio_url: null },
    ];
    expect(resolveTranslation(tr, 'fr')?.language).toBe('vi');
  });
  it('chỉ có audio cũng hợp lệ', () => {
    const tr = [{ language_code: 'ko', title: null, narration_text: null, audio_url: '/uploads/ko.mp3' }];
    expect(resolveTranslation(tr, 'ko')).toMatchObject({ language: 'ko', isFallback: false });
  });
  it('không có tiếng Việt → lấy bản bất kỳ có nội dung', () => {
    const tr = [{ language_code: 'en', title: 'E', narration_text: 'text', audio_url: null }];
    expect(resolveTranslation(tr, 'zh')).toMatchObject({ language: 'en', isFallback: true });
  });
  it('không có gì → null', () => {
    expect(resolveTranslation([], 'vi')).toBeNull();
    expect(resolveTranslation(undefined, 'vi')).toBeNull();
  });
  it('chọn vi khi vi là mặc định không bị đánh dấu fallback', () => {
    expect(resolveTranslation(CAU_MONG.translations, 'vi')?.isFallback).toBe(false);
  });
  it('displayTitle theo ngôn ngữ, cuối cùng là tên POI', () => {
    expect(displayTitle(NHA_RONG, 'en')).toBe('Nha Rong Wharf');
    expect(displayTitle(NHA_RONG, 'ko')).toBe('Bến Nhà Rồng');
    expect(displayTitle({ name: 'Tên', translations: [] }, 'vi')).toBe('Tên');
  });
  it('có locale TTS cho cả 6 ngôn ngữ', () => {
    expect(Object.keys(TTS_LOCALE).sort()).toEqual(['en', 'fr', 'ja', 'ko', 'vi', 'zh']);
  });
});
