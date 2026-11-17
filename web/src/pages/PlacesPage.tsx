import { Link } from 'react-router';
import { Headphones } from '@phosphor-icons/react';
import { LANGS, poiTitle, useLang, useT } from '../lib/i18n';
import { useContent, useTitle } from '../lib/useContent';
import { poiPhoto } from '../lib/photos';
import type { Poi } from '../lib/types';
import { PoiMap } from '../components/PoiMap';
import { LoadError, Loading } from '../components/States';

export function PlaceCard({ poi, href }: { poi: Poi; href?: string }) {
  const { lang, ui } = useLang();
  const t = useT();
  const photo = poiPhoto(poi);
  const langs = LANGS.filter((l) => poi.translations.some((x) => x.language_code === l.code && x.narration_text.trim()));
  return (
    <Link to={href ?? `/diem/${poi.id}`} className="place-card">
      <div className={`card-img${photo ? '' : ' card-img-empty'}`}>
        {photo ? <img src={photo.src} alt={photo.caption[ui]} loading="lazy" /> : <Headphones size={28} aria-hidden="true" />}
      </div>
      <div className="card-body">
        <h3>{poiTitle(poi, lang)}</h3>
        {poi.price ? <span className="price-tag">{poi.price.toLocaleString('vi-VN')}đ</span> : null}
        {poi.address && <p className="card-sub">{poi.address}</p>}
        <p className="card-meta">
          {langs.length} {t({ vi: 'ngôn ngữ', en: langs.length === 1 ? 'language' : 'languages' })} · {langs.map((l) => l.code.toUpperCase()).join(' ')}
        </p>
      </div>
    </Link>
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
    <div className="wrap section">
      <h1 className="page-title">{t({ vi: 'Điểm thuyết minh', en: 'Places to listen' })}</h1>
      <p className="lead">
        {t({
          vi: `${pois.length} điểm ở Khánh Hội, Vĩnh Hội và Xóm Chiếu. Chọn một điểm để nghe, hoặc bấm vào ghim trên bản đồ.`,
          en: `${pois.length} places in Khanh Hoi, Vinh Hoi and Xom Chieu. Pick one to listen, or tap a pin on the map.`,
        })}
      </p>
      <div className="places-layout">
        <div className="card-grid">
          {pois.map((p) => (
            <PlaceCard key={p.id} poi={p} />
          ))}
        </div>
        <div className="places-map">
          <PoiMap pois={pois} className="map-tall" />
        </div>
      </div>
    </div>
  );
}
