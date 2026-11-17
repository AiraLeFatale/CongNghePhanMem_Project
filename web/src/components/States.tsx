import { useT } from '../lib/i18n';

export function Loading() {
  const t = useT();
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      {t({ vi: 'Đang tải…', en: 'Loading…' })}
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div className="state state-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          {t({ vi: 'Thử lại', en: 'Try again' })}
        </button>
      )}
    </div>
  );
}
