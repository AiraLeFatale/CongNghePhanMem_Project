import { Link } from 'react-router';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { daysAgo, fillDaily, formatDate, formatDecimal, formatDuration, formatNumber, toLocalISODate } from '../lib/format';
import { LANGUAGES } from '../lib/languages';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, LoadingState, PageHeader } from '../components/States';
import { Icon } from '../components/Icon';
import { VBarChart } from '../components/charts';

export function DashboardPage() {
  useDocumentTitle('Tổng quan');
  const { user } = useAuth();
  const from = daysAgo(6);
  const to = toLocalISODate(new Date());
  const counts = useAsync(() => Promise.all([api.listPois(), api.listTours(), api.listQrCodes()]), []);
  const stats = useAsync(() => api.analytics({ from, to }), [from, to]);

  const [pois, tours, qrs] = counts.data ?? [[], [], []];
  const missingAudio = pois.filter((p) => p.audio_languages.length === 0);
  const fewLanguages = pois.filter((p) => p.languages.length < LANGUAGES.length);
  const noQr = pois.filter((p) => p.qr_count === 0);
  const s = stats.data?.summary;
  const daily = stats.data ? fillDaily(stats.data.daily, from, to) : [];
  const topPoi = stats.data ? [...stats.data.per_poi].sort((a, b) => b.plays - a.plays)[0] : undefined;

  return (
    <>
      <PageHeader
        title={`Xin chào${user?.full_name ? `, ${user.full_name}` : ''}`}
        subtitle="Tổng quan nội dung thuyết minh và hoạt động 7 ngày gần nhất"
        actions={
          <Link to="/pois/new" className="btn btn-primary">
            <Icon name="plus" /> Thêm điểm
          </Link>
        }
      />

      {counts.loading && !counts.data ? (
        <LoadingState />
      ) : counts.error ? (
        <ErrorState message={counts.error} onRetry={counts.reload} />
      ) : (
        <div className="kpis">
          <Link to="/pois" className="kpi kpi-link">
            <span className="kpi-label">
              <Icon name="pin" /> Điểm thuyết minh
            </span>
            <span className="kpi-value">{formatNumber(pois.length)}</span>
            <span className="kpi-sub">{pois.filter((p) => p.audio_languages.length > 0).length} điểm đã có audio</span>
          </Link>
          <Link to="/tours" className="kpi kpi-link">
            <span className="kpi-label">
              <Icon name="route" /> Tour tham quan
            </span>
            <span className="kpi-value">{formatNumber(tours.length)}</span>
            <span className="kpi-sub">{tours.reduce((a, t) => a + t.poi_count, 0)} lượt điểm trong các tour</span>
          </Link>
          <Link to="/qr" className="kpi kpi-link">
            <span className="kpi-label">
              <Icon name="qr" /> Mã QR
            </span>
            <span className="kpi-value">{formatNumber(qrs.length)}</span>
            <span className="kpi-sub">{noQr.length ? `${noQr.length} điểm chưa có mã` : 'Mọi điểm đều có mã'}</span>
          </Link>
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">7 ngày gần nhất</h2>
            <Link to="/analytics" className="btn btn-sm">
              Xem thống kê chi tiết
            </Link>
          </div>
          {stats.loading && !stats.data ? (
            <LoadingState text="Đang tải số liệu…" />
          ) : stats.error ? (
            <ErrorState message={stats.error} onRetry={stats.reload} />
          ) : !stats.data?.has_data ? (
            <p className="muted">Không có dữ liệu sử dụng trong 7 ngày qua.</p>
          ) : (
            <>
              <dl className="mini-stats">
                <div>
                  <dt>Lượt nghe</dt>
                  <dd>{formatNumber(s?.plays)}</dd>
                </div>
                <div>
                  <dt>Phiên</dt>
                  <dd>{formatNumber(s?.sessions)}</dd>
                </div>
                <div>
                  <dt>Nghe TB</dt>
                  <dd>{formatDecimal(s?.avg_listen_seconds)} giây</dd>
                </div>
                <div>
                  <dt>Tổng thời gian</dt>
                  <dd>{formatDuration(s?.total_listen_seconds)}</dd>
                </div>
              </dl>
              <VBarChart labels={daily.map((d) => formatDate(d.date).slice(0, 5))} values={daily.map((d) => d.plays)} label="Lượt nghe" height={180} />
              {topPoi && (
                <p className="muted small">
                  Điểm nổi bật: <strong>{topPoi.name}</strong> với {formatNumber(topPoi.plays)} lượt nghe.
                </p>
              )}
            </>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">Việc cần làm</h2>
          {counts.loading && !counts.data ? (
            <LoadingState />
          ) : counts.error ? null : missingAudio.length + fewLanguages.length + noQr.length === 0 ? (
            <p className="muted">Nội dung đã đầy đủ. Tuyệt vời!</p>
          ) : (
            <ul className="todo">
              {missingAudio.length > 0 && (
                <li>
                  <strong>{missingAudio.length} điểm chưa có audio</strong> – app sẽ đọc bằng giọng máy.
                  <ul>
                    {missingAudio.slice(0, 4).map((p) => (
                      <li key={p.id}>
                        <Link to={`/pois/${p.id}`}>{p.name}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
              {fewLanguages.length > 0 && (
                <li>
                  <strong>{fewLanguages.length} điểm chưa đủ {LANGUAGES.length} ngôn ngữ</strong> – dùng nút "Dịch tất cả ngôn ngữ còn trống".
                </li>
              )}
              {noQr.length > 0 && (
                <li>
                  <strong>{noQr.length} điểm chưa có mã QR</strong> cho trạm xe buýt.
                </li>
              )}
            </ul>
          )}
          <h3 className="sub-title">Lối tắt</h3>
          <div className="shortcuts">
            <Link to="/pois/new" className="shortcut">
              <Icon name="pin" /> Thêm điểm thuyết minh
            </Link>
            <Link to="/tours/new" className="shortcut">
              <Icon name="route" /> Tạo tour
            </Link>
            <Link to="/qr" className="shortcut">
              <Icon name="print" /> In mã QR
            </Link>
            <Link to="/analytics" className="shortcut">
              <Icon name="chart" /> Báo cáo thống kê
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
