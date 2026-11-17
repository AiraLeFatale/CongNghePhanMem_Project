import { Link } from 'react-router';
import { useT } from '../lib/i18n';
import { useTitle } from '../lib/useContent';

export function NotFoundPage() {
  const t = useT();
  useTitle(t({ vi: 'Không tìm thấy trang', en: 'Page not found' }));
  return (
    <div className="wrap page-narrow">
      <h1 className="page-title">{t({ vi: 'Không tìm thấy trang', en: 'Page not found' })}</h1>
      <p className="lead">{t({ vi: 'Đường dẫn không tồn tại hoặc đã được đổi.', en: 'This link does not exist or has changed.' })}</p>
      <Link to="/" className="btn btn-primary">
        {t({ vi: 'Về trang chủ', en: 'Go to home page' })}
      </Link>
    </div>
  );
}
