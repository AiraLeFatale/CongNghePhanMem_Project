import { Link, useParams, useSearchParams } from 'react-router';
import { useT } from '../lib/i18n';
import { useContent, useTitle } from '../lib/useContent';
import { PlaceView } from '../components/PlaceView';
import { LoadError, Loading } from '../components/States';

export function PlacePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const t = useT();
  const { data, error, retry } = useContent();
  const poi = data?.pois.find((p) => String(p.id) === id);
  const tour = data?.tours.find((x) => String(x.id) === params.get('tour') && poi && x.poi_ids.includes(poi.id));
  useTitle(poi?.name ?? '');

  if (error) return <LoadError message={error} onRetry={retry} />;
  if (!data) return <Loading />;
  if (!poi) {
    return (
      <div className="wrap page-narrow">
        <h1 className="page-title">{t({ vi: 'Không tìm thấy điểm này', en: 'Place not found' })}</h1>
        <Link to="/diem" className="btn btn-primary">
          {t({ vi: 'Xem các điểm thuyết minh', en: 'Browse places' })}
        </Link>
      </div>
    );
  }
  return <PlaceView poi={poi} content={data} trigger="manual" tour={tour} />;
}
