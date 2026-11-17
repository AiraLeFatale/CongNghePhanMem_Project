import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Headphones, MapPin, SpeakerHigh } from '@phosphor-icons/react';
import { LANGS, poiTitle, useLang, useT } from '../lib/i18n';
import { useContent, useTitle } from '../lib/useContent';
import { poiPhoto } from '../lib/photos';
import type { Poi } from '../lib/types';
import { PoiMap } from '../components/PoiMap';
import { LoadError, Loading } from '../components/States';
import '../home.css';
import '../pages-mau.css';

export function PlaceCard({ poi, href }: { poi: Poi; href?: string }) {
  const { lang, ui } = useLang();
  const t = useT();
  const photo = poiPhoto(poi);
  const langs = LANGS.filter((l) => poi.translations.some((x) => x.language_code === l.code && x.narration_text.trim()));
  return (
    <Link to={href ?? `/diem/${poi.id}`} className="pg-card">
      <div className={`pg-card-img${photo ? '' : ' pg-card-img-empty'}`}>
        {photo ? <img src={photo.src} alt={photo.caption[ui]} loading="lazy" /> : <Headphones size={30} aria-hidden="true" />}
      </div>
      <div className="pg-card-body">
        <h3>{poiTitle(poi, lang)}</h3>
        {poi.price ? <span className="pg-price">{poi.price.toLocaleString('vi-VN')}đ</span> : null}
        {poi.address && (
          <p className="pg-card-addr">
            <MapPin size={14} weight="fill" aria-hidden="true" />
            <span>{poi.address}</span>
          </p>
        )}
        <div className="pg-card-foot">
          <p className="pg-card-langs">
            <SpeakerHigh size={14} weight="fill" aria-hidden="true" />
            <span>
              {langs.length} {t({ vi: 'ngôn ngữ', en: langs.length === 1 ? 'language' : 'languages' })} · {langs.map((l) => l.code.toUpperCase()).join(' ')}
            </span>
          </p>
          <span className="pg-go" aria-hidden="true">
            <ArrowRight size={14} weight="bold" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Phần đầu trang con: nhãn vàng, tiêu đề chữ có chân, mô tả; nền ảnh AI cầu dây văng + lá cây cùng bộ với trang chủ. */
export function PageHero({ eyebrow, title, lead, back, children }: { eyebrow: string; title: string; lead?: string; back?: ReactNode; children?: ReactNode }) {
  return (
    <section className="pg-hero">
      <div className="wrap pg-hero-copy">
        {back}
        <p className="hs-eyebrow">{eyebrow}</p>
        <h1 className="pg-title">{title}</h1>
        {lead && <p className="pg-lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}

export function PlacesPage() {
  const t = useT();
  useTitle(t({ vi: 'Điểm thuyết minh', en: 'Places' }));
  const { data, error, retry } = useContent();
  if (error) return <LoadError message={error} onRetry={retry} />;
  if (!data) return <Loading />;
  const pois = [...data.pois].sort((a, b) => b.priority - a.priority);
  return (
    <div className="hs pg">
      <PageHero
        eyebrow={t({ vi: 'Điểm thuyết minh', en: 'Places to listen' })}
        title={t({ vi: 'Khám phá những điểm đến đặc sắc của Quận 4', en: 'Discover the landmarks of District 4' })}
        lead={t({
          vi: `${pois.length} điểm ở Khánh Hội, Vĩnh Hội và Xóm Chiếu. Chọn một điểm để nghe, hoặc bấm vào ghim trên bản đồ.`,
          en: `${pois.length} places in Khanh Hoi, Vinh Hoi and Xom Chieu. Pick one to listen, or tap a pin on the map.`,
        })}
      />
      <div className="wrap pg-places">
        <div className="pg-grid">
          {pois.map((p) => (
            <PlaceCard key={p.id} poi={p} />
          ))}
        </div>
        <div className="pg-map">
          <PoiMap pois={pois} className="map-tall" />
        </div>
      </div>
    </div>
  );
}
