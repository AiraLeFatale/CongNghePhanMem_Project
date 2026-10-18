import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { daysAgo, fillDaily, formatDate, formatDecimal, formatDuration, formatNumber, hourlyToLocal, toLocalISODate } from '../lib/format';
import { languageLabel, triggerLabel } from '../lib/languages';
import { validateDateRange } from '../lib/validation';
import { exportReportExcel } from '../lib/exportExcel';
import type { AnalyticsReport, TourListItem } from '../lib/types';
import { EmptyState, ErrorState, LoadingState, PageHeader, Spinner } from '../components/States';
import { Icon } from '../components/Icon';
import { DonutChart, HBarChart, LineChart, VBarChart } from '../components/charts';
import { HeatMap } from '../components/maps';
import { useToast } from '../components/Toast';

export interface AnalyticsFilters {
  from: string;
  to: string;
  tourId: number | null;
}

export function useAnalyticsFilters(): [AnalyticsFilters, (f: AnalyticsFilters) => void] {
  const [params, setParams] = useSearchParams();
  const today = toLocalISODate(new Date());
  const from = params.get('from') || daysAgo(29);
  const to = params.get('to') || today;
  const tourRaw = params.get('tour');
  const tourId = tourRaw && Number.isInteger(Number(tourRaw)) ? Number(tourRaw) : null;
  const set = (f: AnalyticsFilters) => {
    const p: Record<string, string> = { from: f.from, to: f.to };
    if (f.tourId) p.tour = String(f.tourId);
    setParams(p, { replace: true });
  };
  return [{ from, to, tourId }, set];
}

export function filtersQuery(f: AnalyticsFilters) {
  const p = new URLSearchParams({ from: f.from, to: f.to });
  if (f.tourId) p.set('tour', String(f.tourId));
  return p.toString();
}

export function Kpis({ r }: { r: AnalyticsReport }) {
  const s = r.summary;
  return (
    <div className="kpis">
      <div className="kpi">
        <span className="kpi-label">Lượt nghe</span>
        <span className="kpi-value">{formatNumber(s.plays)}</span>
      </div>
      <div className="kpi">
        <span className="kpi-label">Phiên sử dụng</span>
        <span className="kpi-value">{formatNumber(s.sessions)}</span>
        <span className="kpi-sub">ẩn danh, mỗi lần mở app</span>
      </div>
      <div className="kpi">
        <span className="kpi-label">Nghe trung bình</span>
        <span className="kpi-value">{formatDecimal(s.avg_listen_seconds)} giây</span>
        <span className="kpi-sub">mỗi lượt</span>
      </div>
      <div className="kpi">
        <span className="kpi-label">Tổng thời gian nghe</span>
        <span className="kpi-value">{formatDuration(s.total_listen_seconds)}</span>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  useDocumentTitle('Thống kê');
  const toast = useToast();
  const [filters, setFilters] = useAnalyticsFilters();
  const [draft, setDraft] = useState(filters);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(false);
  const [exporting, setExporting] = useState(false);
  const tours = useAsync<TourListItem[]>(() => api.listTours(), []);
  const report = useAsync(
    () => api.analytics({ from: filters.from, to: filters.to, tour_id: filters.tourId }),
    [filters.from, filters.to, filters.tourId],
  );
  const tourName = filters.tourId ? (tours.data?.find((t) => t.id === filters.tourId)?.name ?? `Tour #${filters.tourId}`) : null;

  function apply(e: FormEvent) {
    e.preventDefault();
    const err = validateDateRange(draft.from, draft.to);
    setRangeError(err);
    if (err) return;
    setFilters(draft);
  }

  function preset(days: number) {
    const f = { ...draft, from: daysAgo(days - 1), to: toLocalISODate(new Date()) };
    setDraft(f);
    setRangeError(null);
    setFilters(f);
  }

  async function onExcel() {
    if (!report.data) return;
    setExporting(true);
    try {
      await exportReportExcel(report.data, { from: filters.from, to: filters.to, tourName });
      toast.success('Đã xuất file Excel');
    } catch (err) {
      toast.error(errorMessage(err, 'Không xuất được file Excel'));
    } finally {
      setExporting(false);
    }
  }

  const r = report.data;
  const canExport = !!r && r.has_data && !report.loading;

  return (
    <>
      <PageHeader
        title="Thống kê sử dụng"
        subtitle="Lượt nghe, thời lượng, điểm phổ biến và bản đồ nhiệt vị trí ẩn danh (UC5)"
        actions={
          <>
            <button type="button" className="btn" onClick={onExcel} disabled={!canExport || exporting}>
              {exporting ? <Spinner small /> : <Icon name="download" />} Xuất Excel
            </button>
            {canExport ? (
              <Link to={`/analytics/report?${filtersQuery(filters)}&print=1`} className="btn">
                <Icon name="file" /> Xuất PDF
              </Link>
            ) : (
              <button type="button" className="btn" disabled>
                <Icon name="file" /> Xuất PDF
              </button>
            )}
          </>
        }
      />

      <form className="card filters" onSubmit={apply} noValidate>
        <div className="field">
          <label htmlFor="f-from">Từ ngày</label>
          <input id="f-from" type="date" value={draft.from} max={draft.to} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="f-to">Đến ngày</label>
          <input id="f-to" type="date" value={draft.to} min={draft.from} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="f-tour">Tour</label>
          <select
            id="f-tour"
            value={draft.tourId ?? ''}
            onChange={(e) => setDraft({ ...draft, tourId: e.target.value ? Number(e.target.value) : null })}
            disabled={tours.loading}
          >
            <option value="">Tất cả tour</option>
            {(tours.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-actions">
          <button type="submit" className="btn btn-primary">
            Xem báo cáo
          </button>
          <div className="presets" role="group" aria-label="Khoảng thời gian nhanh">
            <button type="button" className="btn btn-sm" onClick={() => preset(7)}>
              7 ngày
            </button>
            <button type="button" className="btn btn-sm" onClick={() => preset(30)}>
              30 ngày
            </button>
            <button type="button" className="btn btn-sm" onClick={() => preset(90)}>
              90 ngày
            </button>
          </div>
        </div>
        {rangeError && (
          <p className="field-error filters-error" role="alert">
            {rangeError}
          </p>
        )}
        {tours.error && <p className="field-error filters-error">Không tải được danh sách tour: {tours.error}</p>}
      </form>

      <p className="muted small range-note" aria-live="polite">
        Đang xem: {formatDate(filters.from)} – {formatDate(filters.to)}
        {tourName ? ` · Tour: ${tourName} (lượt nghe tại các điểm thuộc tour)` : ' · Tất cả điểm'}
      </p>

      {report.loading && !r ? (
        <LoadingState text="Đang tổng hợp số liệu…" />
      ) : report.error ? (
        <ErrorState message={report.error} onRetry={report.reload} />
      ) : !r || !r.has_data ? (
        <div className="card">
          <EmptyState title="Không có dữ liệu">
            Không có lượt nghe hay vị trí nào trong khoảng thời gian{tourName ? ' và tour' : ''} đã chọn. Hãy thử mở rộng khoảng ngày hoặc chọn tour khác.
          </EmptyState>
        </div>
      ) : (
        <div className={`analytics${report.loading ? ' is-refreshing' : ''}`} aria-busy={report.loading}>
          <Kpis r={r} />
          <AnalyticsCharts r={r} from={filters.from} to={filters.to} />
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Bản đồ nhiệt vị trí người dùng</h2>
              <label className="switch">
                <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
                <span>Hiện lộ trình ẩn danh ({r.routes.length})</span>
              </label>
            </div>
            <p className="muted small">
              Vị trí được làm tròn ~11 m và không gắn với danh tính. Chấm trắng là các điểm thuyết minh. {r.heatmap.length === 0 && 'Không có dữ liệu vị trí trong khoảng này.'}
            </p>
            <HeatMap heat={r.heatmap} routes={r.routes} showRoutes={showRoutes} pois={r.per_poi} />
          </section>
        </div>
      )}
    </>
  );
}

export function AnalyticsCharts({ r, from, to }: { r: AnalyticsReport; from: string; to: string }) {
  const top = [...r.per_poi].sort((a, b) => b.plays - a.plays).slice(0, 10);
  const byListen = [...r.per_poi].filter((p) => p.plays > 0).sort((a, b) => b.avg_listen_seconds - a.avg_listen_seconds).slice(0, 10);
  const daily = fillDaily(r.daily, from, to);
  const hourly = hourlyToLocal(r.hourly);
  return (
    <>
      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Điểm được nghe nhiều nhất</h2>
          {top.length ? <HBarChart labels={top.map((p) => p.name)} values={top.map((p) => p.plays)} label="Lượt nghe" /> : <p className="muted">Chưa có lượt nghe.</p>}
        </section>
        <section className="card">
          <h2 className="card-title">Thời gian nghe trung bình theo điểm</h2>
          {byListen.length ? (
            <HBarChart labels={byListen.map((p) => p.name)} values={byListen.map((p) => p.avg_listen_seconds)} label="Nghe TB" unit=" giây" color="#2563eb" />
          ) : (
            <p className="muted">Chưa có lượt nghe.</p>
          )}
        </section>
      </div>
      <section className="card">
        <h2 className="card-title">Lượt nghe theo ngày</h2>
        <LineChart labels={daily.map((d) => formatDate(d.date).slice(0, 5))} values={daily.map((d) => d.plays)} label="Lượt nghe" />
      </section>
      <div className="grid-3">
        <section className="card">
          <h2 className="card-title">Cách kích hoạt</h2>
          {r.by_method.length ? (
            <DonutChart labels={r.by_method.map((m) => triggerLabel(m.method))} values={r.by_method.map((m) => m.plays)} label="Cách kích hoạt" />
          ) : (
            <p className="muted">Không có dữ liệu.</p>
          )}
        </section>
        <section className="card">
          <h2 className="card-title">Ngôn ngữ nghe</h2>
          {r.by_language.length ? (
            <DonutChart labels={r.by_language.map((l) => languageLabel(l.language))} values={r.by_language.map((l) => l.plays)} label="Ngôn ngữ" />
          ) : (
            <p className="muted">Không có dữ liệu.</p>
          )}
        </section>
        <section className="card">
          <h2 className="card-title">Theo giờ trong ngày</h2>
          <VBarChart labels={hourly.map((h) => `${h.hour}h`)} values={hourly.map((h) => h.plays)} label="Lượt nghe" height={260} />
          <p className="muted small">Giờ Việt Nam (UTC+7)</p>
        </section>
      </div>
      <section className="card">
        <h2 className="card-title">Chi tiết theo điểm</h2>
        <PerPoiTable r={r} />
      </section>
    </>
  );
}

export function PerPoiTable({ r }: { r: AnalyticsReport }) {
  const rows = [...r.per_poi].sort((a, b) => b.plays - a.plays);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Điểm thuyết minh</th>
            <th scope="col" className="num">
              Lượt nghe
            </th>
            <th scope="col" className="num">
              Số phiên
            </th>
            <th scope="col" className="num">
              Nghe TB
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.poi_id}>
              <td>{i + 1}</td>
              <td>{p.name}</td>
              <td className="num">{formatNumber(p.plays)}</td>
              <td className="num">{formatNumber(p.sessions)}</td>
              <td className="num nowrap">{formatDecimal(p.avg_listen_seconds)} giây</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
