import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Chart as ChartJS } from 'chart.js';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { fillDaily, formatDate, formatDateTime, formatNumber, hourlyToLocal } from '../lib/format';
import { languageLabel, triggerLabel } from '../lib/languages';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, LoadingState } from '../components/States';
import { Icon } from '../components/Icon';
import { HBarChart, LineChart } from '../components/charts';
import { Kpis, PerPoiTable, filtersQuery, useAnalyticsFilters } from './AnalyticsPage';

/**
 * Trang báo cáo tối ưu cho in / "Lưu thành PDF" của trình duyệt.
 * Dùng phông chữ hệ thống nên tiếng Việt có dấu hiển thị đúng (jsPDF mặc định không hỗ trợ).
 */
export function AnalyticsReportPage() {
  useDocumentTitle('Báo cáo thống kê');
  const [filters] = useAnalyticsFilters();
  const [params] = useSearchParams();
  const autoPrint = params.get('print') === '1';
  const { user } = useAuth();
  const printed = useRef(false);
  const report = useAsync(() => api.analytics({ from: filters.from, to: filters.to, tour_id: filters.tourId }), [filters.from, filters.to, filters.tourId]);
  const tours = useAsync(() => api.listTours(), []);
  const tourName = filters.tourId ? (tours.data?.find((t) => t.id === filters.tourId)?.name ?? `Tour #${filters.tourId}`) : null;

  useEffect(() => {
    const prev = ChartJS.defaults.animation;
    ChartJS.defaults.animation = false;
    return () => {
      ChartJS.defaults.animation = prev;
    };
  }, []);

  useEffect(() => {
    if (!autoPrint || printed.current || !report.data || tours.loading) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [autoPrint, report.data, tours.loading]);

  const r = report.data;
  const daily = r ? fillDaily(r.daily, filters.from, filters.to) : [];
  const hourly = r ? hourlyToLocal(r.hourly) : [];
  const top = r ? [...r.per_poi].sort((a, b) => b.plays - a.plays).slice(0, 10) : [];
  const total = r?.summary.plays || 1;

  return (
    <div className="report">
      <div className="report-toolbar no-print">
        <Link to={`/analytics?${filtersQuery(filters)}`} className="btn">
          ← Quay lại thống kê
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!r}>
          <Icon name="print" /> In / Lưu PDF
        </button>
        <span className="muted small">Trong hộp thoại in, chọn "Lưu dưới dạng PDF" làm máy in.</span>
      </div>
      {report.loading && !r ? (
        <LoadingState text="Đang chuẩn bị báo cáo…" />
      ) : report.error ? (
        <ErrorState message={report.error} onRetry={report.reload} />
      ) : r ? (
        <article className="report-page">
          <header className="report-head">
            <div>
              <h1>Báo cáo thống kê thuyết minh tự động</h1>
              <p>Hệ thống thuyết minh đa ngôn ngữ – Quận 4, TP. Hồ Chí Minh</p>
            </div>
            <dl className="report-meta">
              <dt>Khoảng thời gian</dt>
              <dd>
                {formatDate(filters.from)} – {formatDate(filters.to)}
              </dd>
              <dt>Tour</dt>
              <dd>{tourName ?? 'Tất cả'}</dd>
              <dt>Người lập</dt>
              <dd>{user?.full_name || user?.username}</dd>
              <dt>Thời điểm lập</dt>
              <dd>{formatDateTime(new Date().toISOString())}</dd>
            </dl>
          </header>

          {!r.has_data ? (
            <p className="report-empty">Không có dữ liệu trong khoảng thời gian đã chọn.</p>
          ) : (
            <>
              <h2>1. Chỉ số tổng quan</h2>
              <Kpis r={r} />

              <h2>2. Lượt nghe theo ngày</h2>
              <div className="report-chart">
                <LineChart labels={daily.map((d) => formatDate(d.date).slice(0, 5))} values={daily.map((d) => d.plays)} label="Lượt nghe" height={220} />
              </div>

              <h2>3. Điểm được nghe nhiều nhất</h2>
              <div className="report-chart">
                <HBarChart labels={top.map((p) => p.name)} values={top.map((p) => p.plays)} label="Lượt nghe" />
              </div>
              <PerPoiTable r={r} />

              <div className="report-cols">
                <section>
                  <h2>4. Cách kích hoạt</h2>
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Phương thức</th>
                        <th scope="col" className="num">
                          Lượt
                        </th>
                        <th scope="col" className="num">
                          Tỉ lệ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.by_method.map((m) => (
                        <tr key={m.method}>
                          <td>{triggerLabel(m.method)}</td>
                          <td className="num">{formatNumber(m.plays)}</td>
                          <td className="num">{Math.round((m.plays / total) * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <section>
                  <h2>5. Ngôn ngữ</h2>
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Ngôn ngữ</th>
                        <th scope="col" className="num">
                          Lượt
                        </th>
                        <th scope="col" className="num">
                          Tỉ lệ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.by_language.map((l) => (
                        <tr key={l.language}>
                          <td>{languageLabel(l.language)}</td>
                          <td className="num">{formatNumber(l.plays)}</td>
                          <td className="num">{Math.round((l.plays / total) * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>

              <h2>6. Lượt nghe theo giờ (giờ Việt Nam)</h2>
              <table className="table table-compact hours">
                <tbody>
                  <tr>
                    <th scope="row">Giờ</th>
                    {hourly.map((h) => (
                      <td key={h.hour} className="num">
                        {h.hour}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Lượt</th>
                    {hourly.map((h) => (
                      <td key={h.hour} className="num">
                        {h.plays}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <p className="muted small">
                Dữ liệu vị trí: {formatNumber(r.heatmap.length)} ô bản đồ nhiệt, {formatNumber(r.routes.length)} lộ trình ẩn danh. Ngày tính theo UTC.
              </p>
            </>
          )}
        </article>
      ) : null}
    </div>
  );
}
