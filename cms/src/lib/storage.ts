/**
 * Bọc localStorage an toàn: trình duyệt chặn bộ nhớ (chế độ riêng tư, cookie bị chặn)
 * sẽ ném lỗi khi truy cập — khi đó dùng bộ nhớ tạm trong phiên.
 */
const memory = new Map<string, string>();

/** Chọn localStorage nếu dùng được; ghi thử để phát hiện trình duyệt chặn bộ nhớ. */
function backend(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    const probe = '__narr_probe__';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/** API lưu trữ an toàn: luôn có bản sao trong bộ nhớ tạm của phiên. */
export const safeStorage = {
  get(key: string): string | null {
    try {
      const s = backend();
      if (s) return s.getItem(key);
    } catch {
      /* bỏ qua */
    }
    return memory.has(key) ? (memory.get(key) as string) : null;
  },
  set(key: string, value: string): void {
    memory.set(key, value);
    try {
      backend()?.setItem(key, value);
    } catch {
      /* bỏ qua: đã giữ trong bộ nhớ tạm */
    }
  },
  remove(key: string): void {
    memory.delete(key);
    try {
      backend()?.removeItem(key);
    } catch {
      /* bỏ qua */
    }
  },
};

const TOKEN_KEY = 'narration_cms_token';
const USER_KEY = 'narration_cms_user';

/** Lưu token đăng nhập và thông tin người dùng; `clear` dùng khi đăng xuất. */
export const tokenStore = {
  getToken: () => safeStorage.get(TOKEN_KEY),
  setToken: (t: string) => safeStorage.set(TOKEN_KEY, t),
  getUser<T>(): T | null {
    const raw = safeStorage.get(USER_KEY);
    if (!raw) return null;
    // Dữ liệu cũ/hỏng thì coi như chưa đăng nhập thay vì làm sập trang.
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setUser: (u: unknown) => safeStorage.set(USER_KEY, JSON.stringify(u)),
  clear() {
    safeStorage.remove(TOKEN_KEY);
    safeStorage.remove(USER_KEY);
  },
};
