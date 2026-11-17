import { PHOTOS } from '../lib/photos';
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
          vi: 'Ảnh các điểm thuyết minh là ảnh chụp thật lấy từ Wikimedia Commons theo giấy phép mở của từng tác giả. Ảnh ghi "minh hoạ" chụp nơi khác cùng loại, chưa có ảnh mở của đúng địa điểm. Hình nền trang trí được tạo bằng AI.',
          en: 'Place photos are real photographs from Wikimedia Commons under each author’s open licence. Photos marked "illustrative" show a similar place, as no openly licensed photo of the exact spot was found. Decorative backgrounds are AI-generated.',
        })}
      />
      <div className="wrap page-narrow pg-credits">
      <h2 className="credits-h">{t({ vi: 'Ảnh chụp (Wikimedia Commons)', en: 'Photos (Wikimedia Commons)' })}</h2>
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
