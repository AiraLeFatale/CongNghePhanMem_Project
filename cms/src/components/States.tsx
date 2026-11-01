/**
 * Các component trạng thái và bố cục dùng chung: spinner, loading, rỗng, lỗi,
 * tiêu đề trang và bọc một trường nhập liệu kèm nhãn/gợi ý/lỗi.
 */
import type { ReactNode } from 'react';

/** Vòng xoay báo đang tải; bản `small` dùng trong nút hoặc khối nhỏ. */
export function Spinner({ small = false }: { small?: boolean }) {
  return <span className={`spinner${small ? ' spinner-sm' : ''}`} aria-hidden="true" />;
}

/** Khối báo đang tải kèm thông điệp, có aria-live để trình đọc màn hình đọc. */
export function LoadingState({ text = 'Đang tải dữ liệu…' }: { text?: string }) {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <Spinner />
      <span>{text}</span>
    </div>
  );
}

/** Khối danh sách rỗng: tiêu đề, mô tả và hành động gợi ý (nếu có). */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state-empty">
      <div className="state-icon" aria-hidden="true">
        ∅
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/** Khối lỗi kèm nút "Thử lại" tuỳ chọn; dùng role="alert" để được thông báo ngay. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon" aria-hidden="true">
        !
      </div>
      <h3>Không tải được dữ liệu</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

/** Tiêu đề trang kèm phụ đề và nhóm nút hành động bên phải. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/** Bọc nhãn, ô nhập, gợi ý và lỗi của một trường; thêm dấu * khi bắt buộc. */
export function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Thuộc tính aria cho ô nhập gắn với Field. */
export function fieldAria(id: string, error?: string, hint?: boolean) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
