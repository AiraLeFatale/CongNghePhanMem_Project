import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, resolveQr } from '../lib/api';
import { useT } from '../lib/i18n';
import { useContent, useTitle } from '../lib/useContent';
import type { QrResolution } from '../lib/types';
import { PlaceView } from '../components/PlaceView';
import { LoadError, Loading } from '../components/States';

/** Trang mở ra khi khách quét mã QR ở trạm xe buýt bằng camera điện thoại. */
export function QrPage() {
  const { code = '' } = useParams();
  const t = useT();
  const { data } = useContent();
  const [res, setRes] = useState<QrResolution | null>(null);
  const [err, setErr] = useState<{ msg: string; notFound: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useTitle(res?.poi.name ?? '');

  useEffect(() => {
    let alive = true;
    setErr(null);
    resolveQr(code).then(
      (r) => alive && setRes(r),
      (e: ApiError) => alive && setErr({ msg: e.message, notFound: e.status === 404 || e.status === 400 }),
    );
    return () => {
      alive = false;
    };
  }, [code, attempt]);

  if (err) {
    return (
      <div className="wrap page-narrow">
        <h1 className="page-title">{err.notFound ? t({ vi: 'Mã QR không còn hiệu lực', en: 'This QR code is no longer valid' }) : t({ vi: 'Chưa mở được nội dung', en: 'Could not load the narration' })}</h1>
        {err.notFound ? (
          <p className="lead">
            {t({
              vi: 'Mã này có thể đã bị gỡ hoặc in sai. Bạn vẫn có thể chọn điểm cần nghe trong danh sách.',
              en: 'The code may have been removed or misprinted. You can still pick a place from the list.',
            })}
          </p>
        ) : (
          <LoadError message={err.msg} onRetry={() => setAttempt((n) => n + 1)} />
        )}
        <Link to="/diem" className="btn btn-primary">
          {t({ vi: 'Xem các điểm thuyết minh', en: 'Browse places' })}
        </Link>
      </div>
    );
  }
  if (!res) return <Loading />;
  // Dùng bản mới nhất từ nội dung đồng bộ nếu có (cùng điểm), để có đủ "Gần đây".
  const poi = data?.pois.find((p) => p.id === res.poi.id) ?? res.poi;
  return <PlaceView poi={poi} content={data} trigger="qr" scannedLabel={res.qr.label} />;
}
