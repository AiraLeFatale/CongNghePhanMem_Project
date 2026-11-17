import { Link } from 'react-router';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { daysAgo, formatNumber, toLocalISODate } from '../lib/format';
import { LANGUAGES } from '../lib/languages';
import { ErrorState, LoadingState, PageHeader } from '../components/States';
import { Icon } from '../components/Icon';
import { BarList } from '../components/charts';
import { DailyChart, Kpis, previousRange } from './AnalyticsPage';
import { LiveNow } from '../components/LiveNow';

export function DashboardPage() {
  useDocumentTitle('Tổng quan');
  const from = daysAgo(6);
  const to = toLocalISODate(new Date());
  const prev = previousRange(from, to);
  const counts = useAsync(() => Promise.all([api.listPois(), api.listTours(), api.listQrCodes()]), []);
  const stats = useAsync(() => api.analytics({ from, to }), [from, to]);
  const prevStats = useAsync(() => api.analytics({ from: prev.from, to: prev.to }), [prev.from, prev.to]);

  const [pois, tours, qrs] = counts.data ?? [[], [], []];
  const total = pois.length;
  const withAudio = pois.filter((p) => p.audio_languages.length > 0).length;
  const fullLang = pois.filter((p) => p.languages.length >= LANGUAGES.length).length;
  const withQr = pois.filter((p) => p.qr_count > 0).length;
  const top = stats.data ? [...stats.data.per_poi].filter((p) => p.plays > 0).sort((a, b) => b.plays - a.plays).slice(0, 6) : [];

  const health = [
    { label: 'Có file audio', done: withAudio, filter: 'no-audio', fix: 'chưa có audio' },
    { label: `Đủ ${LANGUAGES.length} ngôn ngữ`, done: fullLang, filter: 'missing-lang', fix: 'thiếu bản dịch' },
    { label: 'Có mã QR tại trạm', done: withQr, filter: 'no-qr', fix: 'chưa có mã QR' },
  ];

  return (
    <>
      <PageHeader
        title="Tổng quan"
        subtitle="7 ngày gần nhất, so với 7 ngày trước đó"
        actions={
          <Link to="/pois/new" className="btn btn-primary">
            <Icon name="plus" /> Thêm điểm
          </Link>
        }
      />

      <LiveNow />

      <section className="card card-flush">
        {stats.loading && !stats.data ? (
          <LoadingState text="Đang tải số liệu…" />
        ) : stats.error ? (
          <ErrorState message={stats.error} onRetry={stats.reload} />
        ) : !stats.data?.has_data ? (
          <p className="muted card-body">Không có dữ liệu sử dụng trong 7 ngày qua.</p>
        ) : (
          <>
            <Kpis r={stats.data} prev={prevStats.data ? prevStats.data.summary : null} />
            <div className="card-body">
              <DailyChart r={stats.data} from={from} to={to} height={200} />
            </div>
          </>
        )}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Điểm được nghe nhiều trong tuần</h2>
            <Link to="/analytics" className="link-more">
              Thống kê đầy đủ <Icon name="arrow" size={14} />
            </Link>
          </div>
          {stats.data && (
            <BarList
              valueLabel="Lượt nghe"
              items={top.map((p) => ({
                key: p.poi_id,
                label: (
                  <Link to={`/pois/${p.poi_id}`} className="barlist-link">
                    {p.name}
                  </Link>
                ),
                value: p.plays,
              }))}
              empty="Chưa có lượt nghe trong tuần."
            />
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Tình trạng nội dung</h2>
            <span className="muted small">
              {formatNumber(total)} điểm · {formatNumber(tours.length)} tour · {formatNumber(qrs.length)} mã QR
            </span>
          </div>
          {counts.loading && !counts.data ? (
            <LoadingState />
          ) : counts.error ? (
            <ErrorState message={counts.error} onRetry={counts.reload} />
          ) : (
            <ul className="health">
              {health.map((h) => {
                const missing = total - h.done;
                return (
                  <li key={h.filter}>
                    <div className="health-row">
                      <span>{h.label}</span>
                      <span className="health-count">
                        {h.done}/{total}
                      </span>
                    </div>
                    <div className="meter" aria-hidden="true">
                      <span style={{ width: total ? `${(h.done / total) * 100}%` : 0 }} />
                    </div>
                    {missing > 0 ? (
                      <Link to={`/pois?status=${h.filter}`} className="health-fix">
                        <Icon name="warning" size={14} /> {missing} điểm {h.fix}
                      </Link>
                    ) : (
                      <span className="health-ok">Đã đầy đủ</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
