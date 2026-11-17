import { PHOTOS } from '../lib/photos';
import { useLang, useT } from '../lib/i18n';
import { useTitle } from '../lib/useContent';

export function CreditsPage() {
  const t = useT();
  const { ui } = useLang();
  useTitle(t({ vi: 'Nguồn ảnh', en: 'Photo credits' }));
  return (
    <div className="wrap page-narrow section">
      <h1 className="page-title">{t({ vi: 'Nguồn ảnh', en: 'Photo credits' })}</h1>
      <p className="lead">{t({ vi: 'Ảnh trên trang lấy từ Wikimedia Commons theo giấy phép mở của từng tác giả.', en: 'Photos come from Wikimedia Commons under each author’s open licence.' })}</p>
      <ul className="credits">
        {Object.values(PHOTOS).map((p) => (
          <li key={p.src}>
            <img src={p.src} alt="" loading="lazy" />
            <div>
              <strong>{p.caption[ui]}</strong>
              <span>
                {p.author} · {p.license}
              </span>
              <a href={p.source} target="_blank" rel="noreferrer">
                Wikimedia Commons
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
