import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from './Icon';

export function Spinner({ small = false }: { small?: boolean }) {
  return <span className={`spinner${small ? ' spinner-sm' : ''}`} aria-hidden="true" />;
}

export function LoadingState({ text = 'Đang tải dữ liệu…' }: { text?: string }) {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <Spinner />
      <span>{text}</span>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state-empty">
      <div className="state-icon" aria-hidden="true">
        <Icon name="file" size={20} />
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon" aria-hidden="true">
        <Icon name="warning" size={20} />
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

export function PageHeader({
  title,
  subtitle,
  actions,
  crumbs,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  crumbs?: { to: string; label: string }[];
}) {
  return (
    <div className="page-header">
      <div className="page-heading">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Vị trí trang" className="crumbs">
            {crumbs.map((c) => (
              <span key={c.to}>
                <Link to={c.to}>{c.label}</Link>
                <Icon name="caret" size={12} />
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

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
