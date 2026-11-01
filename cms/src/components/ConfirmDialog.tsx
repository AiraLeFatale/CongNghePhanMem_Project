/**
 * Hộp thoại xác nhận dùng chung: cung cấp hàm confirm() trả về Promise<boolean>
 * để các trang await kết quả trước khi thực hiện thao tác nguy hiểm.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// Nội dung và nhãn nút của hộp thoại xác nhận.
export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

// Hàm confirm trả về true nếu người dùng đồng ý, false nếu huỷ.
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
// Context chia sẻ hàm confirm cho toàn bộ cây component bên trong provider.
const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Hộp thoại xác nhận dùng <dialog> gốc: tự giữ focus, Esc để huỷ. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);

  // Huỷ lượt chờ cũ (nếu có) rồi mở hộp thoại mới; Promise chỉ resolve khi người dùng chọn.
  const confirm = useCallback<ConfirmFn>((o) => {
    resolver.current?.(false);
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  // Đồng bộ trạng thái opts với <dialog>: mở dạng modal và focus nút Huỷ để tránh xác nhận nhầm.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (opts && !d.open) {
      d.showModal();
      cancelBtn.current?.focus();
    } else if (!opts && d.open) d.close();
  }, [opts]);

  // Kết thúc lượt chờ: trả kết quả cho Promise, xoá resolver và đóng hộp thoại.
  const finish = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={ref}
        className="dialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
        onCancel={(e) => {
          e.preventDefault();
          finish(false);
        }}
        onClick={(e) => {
          if (e.target === ref.current) finish(false);
        }}
      >
        {opts && (
          <div className="dialog-body">
            <h2 id="confirm-title" className="dialog-title">
              {opts.title}
            </h2>
            <div id="confirm-msg" className="dialog-msg">
              {opts.message}
            </div>
            <div className="dialog-actions">
              <button ref={cancelBtn} type="button" className="btn" onClick={() => finish(false)}>
                {opts.cancelText ?? 'Huỷ'}
              </button>
              <button type="button" className={`btn ${opts.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => finish(true)}>
                {opts.confirmText ?? 'Đồng ý'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}

// Hook lấy hàm confirm; báo lỗi sớm nếu component không nằm trong ConfirmProvider.
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm phải nằm trong ConfirmProvider');
  return ctx;
}
