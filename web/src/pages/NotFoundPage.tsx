import { Link } from 'react-router';
import { useT } from '../lib/i18n';
import { useTitle } from '../lib/useContent';
import { PageHero } from './PlacesPage';
import '../home.css';
import '../pages-mau.css';

export function NotFoundPage() {
  const t = useT();
  useTitle(t({ vi: 'Không tìm thấy trang', en: 'Page not found' }));
  return (
    <div className="hs pg pg-404">
      <PageHero
        eyebrow="404"
        title={t({ vi: 'Không tìm thấy trang', en: 'Page not found' })}
        lead={t({ vi: 'Đường dẫn không tồn tại hoặc đã được đổi.', en: 'This link does not exist or has changed.' })}
      >
        <Link to="/" className="hs-btn hs-btn-primary pg-hero-btn">
          {t({ vi: 'Về trang chủ', en: 'Go to home page' })}
        </Link>
      </PageHero>
    </div>
  );
}
