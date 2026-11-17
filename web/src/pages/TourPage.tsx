import { Link, useParams } from 'react-router';
import { ArrowLeft, Play } from '@phosphor-icons/react';
import { poiTitle, useLang, useT } from '../lib/i18n';
import { useContent, useTitle } from '../lib/useContent';
import { PoiMap } from '../components/PoiMap';
import { LoadError, Loading } from '../components/States';
import { tourLength, tourStops } from './ToursPage';

export function TourPage() {
  const { id } = useParams();
  const t = useT();
  const { lang } = useLang();
  const { data, error, retry } = useContent();
  const tour = data?.tours.find((x) => String(x.id) === id);
  useTitle(tour?.name ?? '');
  if (error) return <LoadError message={error} onRetry={retry} />;
  if (!data) return <Loading />;
  if (!tour) {
    return (
      <div className="wrap page-narrow">
        <h1 className="page-title">{t({ vi: 'Không tìm thấy tour', en: 'Tour not found' })}</h1>
        <Link to="/tour" className="btn btn-primary">
          {t({ vi: 'Xem các tour', en: 'Browse tours' })}
        </Link>
      </div>
    );
  }
  const stops = tourStops(tour, data);
  const km = tourLength(stops) / 1000;
  return (
    <div className="wrap section">
      <Link to="/tour" className="back-link">
        <ArrowLeft size={16} /> {t({ vi: 'Tất cả tour', en: 'All tours' })}
      </Link>
      <h1 className="page-title">{tour.name}</h1>
      {tour.description && <p className="lead">{tour.description}</p>}
      <p className="tour-summary">
        {stops.length} {t({ vi: 'điểm', en: 'stops' })} · ~{km.toFixed(1)} km {t({ vi: 'đi bộ', en: 'on foot' })}
      </p>
      {stops[0] && (
        <Link to={`/diem/${stops[0].id}?tour=${tour.id}`} className="btn btn-primary btn-lg">
          <Play size={18} weight="fill" /> {t({ vi: 'Bắt đầu từ điểm 1', en: 'Start at stop 1' })}
        </Link>
      )}
      <div className="tour-layout">
        <ol className="stops">
          {stops.map((p, i) => (
            <li key={p.id}>
              <span className="stop-num">{i + 1}</span>
              <Link to={`/diem/${p.id}?tour=${tour.id}`}>
                <strong>{poiTitle(p, lang)}</strong>
                {p.address && <small>{p.address}</small>}
              </Link>
            </li>
          ))}
        </ol>
        <PoiMap pois={stops} numbered className="map-tall" />
      </div>
    </div>
  );
}
