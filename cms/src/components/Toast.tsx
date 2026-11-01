/**
 * Hệ thống thông báo nổi (toast) toàn cục: hàng đợi ngắn, tự ẩn sau vài giây
 * và cung cấp hook useToast cho mọi component.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

// Loại thông báo quyết định màu sắc, icon và thời gian hiển thị.
type ToastKind = 'success' | 'error' | 'info';
// Một thông báo đang hiển thị; id tăng dần để làm key và để huỷ đúng hẹn giờ.
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

// API mà các component dùng để phát thông báo.
interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

// Context chia sẻ API toast; null khi component nằm ngoài provider.
const ToastContext = createContext<ToastApi | null>(null);

/** Provider giữ danh sách toast và render vùng thông báo cố định. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  // Xoá một toast theo id khi hết giờ hoặc khi người dùng bấm nút đóng.
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);
  // Giới hạn 4 toast gần nhất để không che nội dung; lỗi hiển thị lâu hơn để kịp đọc.
  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );

  // Gói ba hàm tiện dụng; memo để giá trị context không đổi giữa các lần render.
  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-label="Thông báo">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span className="toast-icon" aria-hidden="true">
              {t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}
            </span>
            <span className="toast-msg">{t.message}</span>
            <button type="button" className="toast-close" aria-label="Đóng thông báo" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Hook lấy API toast; báo lỗi nếu dùng ngoài ToastProvider. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải nằm trong ToastProvider');
  return ctx;
}
