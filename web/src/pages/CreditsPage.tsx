import { AI_PHOTOS, PHOTOS } from '../lib/photos';
import { useLang, useT } from '../lib/i18n';
import { useTitle } from '../lib/useContent';
import { PageHero } from './PlacesPage';
import '../home.css';
import '../pages-mau.css';

export function CreditsPage() {
  const t = useT();
  const { ui } = useLang();
  useTitle(t({ vi: 'Nguồn ảnh', en: 'Photo credits' }));
  return (
    <div className="hs pg">
      <PageHero
        eyebrow={t({ vi: 'Nguồn ảnh', en: 'Photo credits' })}
        title={t({ vi: 'Nguồn ảnh trên website', en: 'Where our images come from' })}
        lead={t({
          vi: 'Ảnh các điểm thuyết minh và hình nền là ảnh minh hoạ tạo bằng AI, không phải ảnh chụp thật. Ảnh tư liệu bên dưới lấy từ Wikimedia Commons theo giấy phép mở của từng tác giả.',
          en: 'Place images and backgrounds are AI-generated illustrations, not real photographs. The archive photos below come from Wikimedia Commons under each author’s open licence.',
        })}
      />
      <div className="wrap page-narrow pg-credits">
      <h2 className="credits-h">{t({ vi: 'Ảnh minh hoạ AI', en: 'AI illustrations' })}</h2>
      <ul className="credits">
        {Object.values(AI_PHOTOS).map((p) => (
          <li key={p.src}>
            <img src={p.src} alt="" loading="lazy" />
            <div>
              <strong>{p.caption[ui]}</strong>
              <span>{t({ vi: 'Tạo bằng AI cho đồ án', en: 'AI-generated for this project' })}</span>
            </div>
          </li>
        ))}
      </ul>
      <h2 className="credits-h">{t({ vi: 'Ảnh tư liệu (Wikimedia Commons)', en: 'Archive photos (Wikimedia Commons)' })}</h2>
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
    </div>
  );
}
