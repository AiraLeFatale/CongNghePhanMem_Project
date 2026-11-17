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
import { BarList, Delta, LineChart, VBarChart } from '../components/charts';
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

/** Khoảng liền trước, cùng số ngày, để so sánh. */
export function previousRange(from: string, to: string) {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  const prevTo = new Date(a);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: toLocalISODate(prevFrom), to: toLocalISODate(prevTo), days };
}

export function Kpis({ r, prev }: { r: AnalyticsReport; prev?: AnalyticsReport['summary'] | null }) {
  const s = r.summary;
  const items = [
    { label: 'Lượt nghe', value: formatNumber(s.plays), cur: s.plays, prev: prev?.plays },
    { label: 'Phiên sử dụng', value: formatNumber(s.sessions), cur: s.sessions, prev: prev?.sessions },
    { label: 'Nghe trung bình', value: `${formatDecimal(s.avg_listen_seconds)} giây`, cur: s.avg_listen_seconds, prev: prev?.avg_listen_seconds },
    { label: 'Tổng thời gian nghe', value: formatDuration(s.total_listen_seconds), cur: s.total_listen_seconds, prev: prev?.total_listen_seconds },
  ];
  return (
    <dl className="kpi-strip">
      {items.map((k) => (
        <div key={k.label} className="kpi-cell">
          <dt>{k.label}</dt>
          <dd>
            <span className="kpi-num">{k.value}</span>
            {prev !== undefined && <Delta current={k.cur} previous={k.prev} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const PRESETS = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '90 ngày' },
];

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
  const prevRange = previousRange(filters.from, filters.to);
  const previous = useAsync(
    () => api.analytics({ from: prevRange.from, to: prevRange.to, tour_id: filters.tourId }),
    [prevRange.from, prevRange.to, filters.tourId],
  );
  const tourName = filters.tourId ? (tours.data?.find((t) => t.id === filters.tourId)?.name ?? `Tour #${filters.tourId}`) : null;
  const today = toLocalISODate(new Date());
  const activePreset = filters.to === today ? PRESETS.find((p) => daysAgo(p.days - 1) === filters.from)?.days : undefined;

  function apply(e: FormEvent) {
    e.preventDefault();
    const err = validateDateRange(draft.from, draft.to);
    setRangeError(err);
    if (err) return;
    setFilters(draft);
  }

  function preset(days: number) {
    const f = { ...draft, from: daysAgo(days - 1), to: today };
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
        subtitle={
          <>
            {formatDate(filters.from)} đến {formatDate(filters.to)}
            {tourName ? <> · tour {tourName}</> : ' · tất cả điểm'}
          </>
        }
        actions={
          <>
            <button type="button" className="btn" onClick={onExcel} disabled={!canExport || exporting}>
              {exporting ? <Spinner small /> : <Icon name="download" />} Excel
            </button>
            {canExport ? (
              <Link to={`/analytics/report?${filtersQuery(filters)}&print=1`} className="btn">
                <Icon name="file" /> Báo cáo PDF
              </Link>
            ) : (
              <button type="button" className="btn" disabled>
                <Icon name="file" /> Báo cáo PDF
              </button>
            )}
          </>
        }
      />

      <form className="filterbar" onSubmit={apply} noValidate>
        <div className="segmented" role="group" aria-label="Khoảng thời gian nhanh">
          {PRESETS.map((p) => (
            <button key={p.days} type="button" className={activePreset === p.days ? 'on' : ''} aria-pressed={activePreset === p.days} onClick={() => preset(p.days)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="date-range">
          <label htmlFor="f-from" className="sr-only">
            Từ ngày
          </label>
          <input id="f-from" type="date" value={draft.from} max={draft.to} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          <span className="muted" aria-hidden="true">
            đến
          </span>
          <label htmlFor="f-to" className="sr-only">
            Đến ngày
          </label>
          <input id="f-to" type="date" value={draft.to} min={draft.from} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        </div>
        <label htmlFor="f-tour" className="sr-only">
          Tour
        </label>
        <select
          id="f-tour"
          className="filter-select"
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
        <button type="submit" className="btn btn-primary">
          Áp dụng
        </button>
        {rangeError && (
          <p className="field-error filters-error" role="alert">
            {rangeError}
          </p>
        )}
        {tours.error && <p className="field-error filters-error">Không tải được danh sách tour: {tours.error}</p>}
      </form>

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
          <Kpis r={r} prev={previous.data ? previous.data.summary : null} />
          <section className="card chart-card">
            <DailyChart r={r} from={filters.from} to={filters.to} />
          </section>
          <AnalyticsCharts r={r} />
          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Bản đồ nhiệt vị trí</h2>
                <p className="card-desc">
                  Vị trí làm tròn khoảng 11 m, không gắn với danh tính. Chấm trắng là các điểm thuyết minh.
                  {r.heatmap.length === 0 && ' Không có dữ liệu vị trí trong khoảng này.'}
                </p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
                <span>Lộ trình ẩn danh ({r.routes.length})</span>
              </label>
            </div>
            <HeatMap heat={r.heatmap} routes={r.routes} showRoutes={showRoutes} pois={r.per_poi} />
          </section>
          <section className="card card-flush">
            <div className="card-head card-head-pad">
              <h2 className="card-title">Chi tiết theo điểm</h2>
            </div>
            <PerPoiTable r={r} />
          </section>
        </div>
      )}
    </>
  );
}

export function DailyChart({ r, from, to, height = 240 }: { r: AnalyticsReport; from: string; to: string; height?: number }) {
  const daily = fillDaily(r.daily, from, to);
  return <LineChart labels={daily.map((d) => formatDate(d.date).slice(0, 5))} values={daily.map((d) => d.plays)} label="Lượt nghe" height={height} />;
}

export function AnalyticsCharts({ r }: { r: AnalyticsReport }) {
  const top = [...r.per_poi].filter((p) => p.plays > 0).sort((a, b) => b.plays - a.plays).slice(0, 8);
  const byListen = [...r.per_poi].filter((p) => p.plays > 0).sort((a, b) => b.avg_listen_seconds - a.avg_listen_seconds).slice(0, 8);
  const hourly = hourlyToLocal(r.hourly);
  const poiLink = (id: number, name: string) => (
    <Link to={`/pois/${id}`} className="barlist-link">
      {name}
    </Link>
  );
  return (
    <>
      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Điểm được nghe nhiều</h2>
          <BarList valueLabel="Lượt nghe" items={top.map((p) => ({ key: p.poi_id, label: poiLink(p.poi_id, p.name), value: p.plays }))} empty="Chưa có lượt nghe." />
        </section>
        <section className="card">
          <h2 className="card-title">Thời gian nghe trung bình</h2>
          <BarList
            valueLabel="Giây / lượt"
            format={(n) => formatDecimal(n)}
            items={byListen.map((p) => ({ key: p.poi_id, label: poiLink(p.poi_id, p.name), value: p.avg_listen_seconds }))}
            empty="Chưa có lượt nghe."
          />
        </section>
      </div>
      <div className="grid-3">
        <section className="card">
          <h2 className="card-title">Ngôn ngữ</h2>
          <BarList valueLabel="Lượt nghe" items={[...r.by_language].sort((a, b) => b.plays - a.plays).map((l) => ({ key: l.language, label: languageLabel(l.language), value: l.plays }))} />
        </section>
        <section className="card">
          <h2 className="card-title">Cách kích hoạt</h2>
          <BarList valueLabel="Lượt nghe" items={[...r.by_method].sort((a, b) => b.plays - a.plays).map((m) => ({ key: m.method, label: triggerLabel(m.method), value: m.plays }))} />
        </section>
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">Theo giờ trong ngày</h2>
            <span className="muted small">Giờ Việt Nam</span>
          </div>
          <VBarChart labels={hourly.map((h) => `${h.hour}h`)} values={hourly.map((h) => h.plays)} label="Lượt nghe" height={200} />
        </section>
      </div>
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
              <td>
                <Link to={`/pois/${p.poi_id}`} className="row-title">
                  {p.name}
                </Link>
              </td>
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
