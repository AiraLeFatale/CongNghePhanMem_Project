import { describe, expect, it } from 'vitest';
import { safeStorage, tokenStore } from './storage';

describe('safeStorage khi trình duyệt không có localStorage', () => {
  it('vẫn lưu và đọc được nhờ bộ nhớ tạm', () => {
    safeStorage.set('k', 'v');
    expect(safeStorage.get('k')).toBe('v');
  });

  it('ghi đè giá trị cũ', () => {
    safeStorage.set('k', 'v1');
    safeStorage.set('k', 'v2');
    expect(safeStorage.get('k')).toBe('v2');
  });

  it('xoá thì trả null', () => {
    safeStorage.set('k', 'v');
    safeStorage.remove('k');
    expect(safeStorage.get('k')).toBeNull();
  });

  it('trả null cho khoá chưa từng ghi', () => {
    expect(safeStorage.get('chua-co')).toBeNull();
  });
});

describe('tokenStore', () => {
  it('lưu và đọc token', () => {
    tokenStore.setToken('jwt-abc');
    expect(tokenStore.getToken()).toBe('jwt-abc');
  });

  it('lưu người dùng dạng JSON và đọc lại thành object', () => {
    tokenStore.setUser({ id: 1, username: 'admin', full_name: 'Quản trị nội dung' });
    expect(tokenStore.getUser()).toEqual({ id: 1, username: 'admin', full_name: 'Quản trị nội dung' });
  });

  it('trả null khi dữ liệu người dùng bị hỏng', () => {
    safeStorage.set('narration_cms_user', '{không phải json');
    expect(tokenStore.getUser()).toBeNull();
  });

  it('clear xoá cả token và người dùng', () => {
    tokenStore.setToken('jwt-abc');
    tokenStore.setUser({ id: 1, username: 'admin' });
    tokenStore.clear();
    expect(tokenStore.getToken()).toBeNull();
    expect(tokenStore.getUser()).toBeNull();
  });
});
