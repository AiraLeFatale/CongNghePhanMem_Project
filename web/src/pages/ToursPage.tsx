import { Link } from 'react-router';
import { MapTrifold } from '@phosphor-icons/react';
import { useT } from '../lib/i18n';
import { distanceM, useContent, useTitle } from '../lib/useContent';
import { poiPhoto } from '../lib/photos';
import type { Poi, SyncData, Tour } from '../lib/types';
import { LoadError, Loading } from '../components/States';

export function tourStops(tour: Tour, data: SyncData): Poi[] {
  return tour.poi_ids.map((id) => data.pois.find((p) => p.id === id)).filter((p): p is Poi => !!p);
}

/** Tổng quãng đường đi bộ theo đường thẳng giữa các điểm (ước lượng). */
export function tourLength(stops: Poi[]) {
  let m = 0;
  for (let i = 1; i < stops.length; i++) m += distanceM([stops[i - 1].latitude, stops[i - 1].longitude], [stops[i].latitude, stops[i].longitude]);
  return m;
}

export function TourCard({ tour, data }: { tour: Tour; data: SyncData }) {
  const t = useT();
  const stops = tourStops(tour, data);
  const km = tourLength(stops) / 1000;
  const minutes = Math.round((km / 4.5) * 60 + stops.length * 4);
  const cover = stops.map((s) => poiPhoto(s)).find(Boolean);
  return (
    <Link to={`/tour/${tour.id}`} className="tour-card">
      <div className={`card-img${cover ? '' : ' card-img-empty'}`}>{cover ? <img src={cover.src} alt="" loading="lazy" /> : <MapTrifold size={28} aria-hidden="true" />}</div>
      <div className="card-body">
        <h3>{tour.name}</h3>
        {tour.description && <p className="card-sub">{tour.description}</p>}
        <dl className="tour-facts">
          <div>
            <dt>{t({ vi: 'Số điểm', en: 'Stops' })}</dt>
            <dd>{stops.length}</dd>
          </div>
          <div>
            <dt>{t({ vi: 'Quãng đường', en: 'Distance' })}</dt>
            <dd>~{km.toFixed(1)} km</dd>
          </div>
          <div>
            <dt>{t({ vi: 'Thời gian', en: 'Time' })}</dt>
            <dd>~{minutes} {t({ vi: 'phút', en: 'min' })}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}

export function ToursPage() {
  const t = useT();
  useTitle(t({ vi: 'Tour gợi ý', en: 'Tours' }));
  const { data, error, retry } = useContent();
  if (error) return <LoadError message={error} onRetry={retry} />;
  if (!data) return <Loading />;
  return (
    <div className="wrap section">
      <h1 className="page-title">{t({ vi: 'Tour gợi ý', en: 'Suggested tours' })}</h1>
      <p className="lead">
        {t({
          vi: 'Lộ trình đi bộ qua nhiều điểm theo thứ tự hợp lý. Thời gian ước tính gồm cả lúc dừng nghe.',
          en: 'Walking routes through several places in a sensible order. Times include stops to listen.',
        })}
      </p>
      <div className="tour-grid">
        {data.tours.map((tour) => (
          <TourCard key={tour.id} tour={tour} data={data} />
        ))}
      </div>
    </div>
  );
}
