import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ArrowSquareOut,
  ChartBar,
  ClockCounterClockwise,
  Eye,
  HandWaving,
  Headphones,
  MapPin,
  Play,
  Plus,
  Star,
  Timer,
  UsersThree,
  Warning,
} from '@phosphor-icons/react';
import { api } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { daysAgo, fillDaily, formatDate, formatDecimal, formatDuration, formatNumber, toLocalISODate } from '../lib/format';
import { LANGUAGES, languageLabel } from '../lib/languages';
import { poiPhoto } from '../lib/poiPhoto';
import type { RecentActivity } from '../lib/types';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, LoadingState } from '../components/States';
import { Delta, LineChart } from '../components/charts';
import { useLiveStream, type Status } from '../components/LiveNow';
import { previousRange } from './AnalyticsPage';
import '../dashboard.css';

const RANGES = [7, 30, 90] as const;

/** Ảnh lấy từ website công khai (cùng tên miền), đặt qua biến CSS để Vite không đổi đường dẫn theo /admin/. */
const DASH_IMAGES = {
  '--dash-hero-img': 'url(/images/ai/hero-nha-rong.jpg)',
  '--dash-promo-img': 'url(/images/tau-song.jpg)',
} as CSSProperties;

const LIVE_TEXT: Record<Status, string> = {
  live: 'Trực tiếp',
  polling: 'Cập nhật mỗi 3 giây',
  connecting: 'Đang kết nối…',
  retrying: 'Mất kết nối, đang thử lại…',
};

function activityText(a: RecentActivity) {
  const poi = a.poi_name ?? 'điểm đã xoá';
  if (a.method === 'qr') return { verb: 'Quét mã QR, nghe', poi };
  if (a.method === 'geofence') return { verb: 'Tự phát theo GPS tại', poi };
  return { verb: 'Bấm nghe', poi };
}

function shortTime(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function DashboardPage() {
  useDocumentTitle('Tổng quan');
  const { user } = useAuth();
  const name = user?.full_name || user?.username || 'bạn';
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const from = daysAgo(days - 1);
  const to = toLocalISODate(new Date());
  const prev = previousRange(from, to);

  const { snap, status } = useLiveStream();
  const counts = useAsync(() => Promise.all([api.listPois(), api.listTours(), api.listQrCodes()]), []);
  const stats = useAsync(() => api.analytics({ from, to }), [from, to]);
  const prevStats = useAsync(() => api.analytics({ from: prev.from, to: prev.to }), [prev.from, prev.to]);
  const recent = useAsync(() => api.recentActivity(6), []);

  const [pois, tours, qrs] = counts.data ?? [[], [], []];
  const total = pois.length;
  const health = [
    { label: 'Có file audio', done: pois.filter((p) => p.audio_languages.length > 0).length, filter: 'no-audio', fix: 'chưa có audio' },
    { label: `Đủ ${LANGUAGES.length} ngôn ngữ`, done: pois.filter((p) => p.languages.length >= LANGUAGES.length).length, filter: 'missing-lang', fix: 'thiếu bản dịch' },
    { label: 'Có mã QR tại trạm', done: pois.filter((p) => p.qr_count > 0).length, filter: 'no-qr', fix: 'chưa có mã QR' },
  ];

  const s = stats.data?.summary;
  const ps = prevStats.data?.summary;
  const top = stats.data ? [...stats.data.per_poi].filter((p) => p.plays > 0).sort((a, b) => b.plays - a.plays).slice(0, 4) : [];
  const topInfo = top[0] ? pois.find((p) => p.id === top[0].poi_id) : undefined;
  const topImg = top[0] ? poiPhoto(top[0].name, topInfo?.image_url) : null;
  const daily = stats.data ? fillDaily(stats.data.daily, from, to) : [];
  const lastPlays = daily.length ? daily[daily.length - 1].plays : 0;

  const liveCards = [
    {
      key: 'total',
      tone: 'green',
      icon: <UsersThree size={24} weight="fill" />,
      label: 'Đang dùng ngay lúc này',
      value: snap ? formatNumber(snap.total) : '–',
      sub: 'người đang mở web hoặc app',
      deco: <UsersThree size={64} weight="fill" />,
      live: true,
    },
    {
      key: 'listening',
      tone: 'teal',
      icon: <Headphones size={24} weight="fill" />,
      label: 'Đang nghe',
      value: snap ? formatNumber(snap.listening) : '–',
      sub: snap?.by_poi[0] ? `nhiều nhất ở ${snap.by_poi[0].name}` : 'người đang phát thuyết minh',
      deco: <Headphones size={64} weight="duotone" />,
    },
    {
      key: 'browsing',
      tone: 'violet',
      icon: <Eye size={24} weight="fill" />,
      label: 'Đang xem, chưa nghe',
      value: snap ? formatNumber(snap.browsing) : '–',
      sub: 'người đang xem trang',
      deco: <Eye size={64} weight="duotone" />,
    },
    {
      key: 'avg',
      tone: 'amber',
      icon: <Timer size={24} weight="fill" />,
      label: 'Thời gian nghe TB',
      value: s ? `${formatDecimal(s.avg_listen_seconds)} giây` : '–',
      sub: `mỗi lượt, ${days} ngày qua`,
      deco: (
        <span className="dash-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      ),
    },
  ];

  return (
    <div className="dash" style={DASH_IMAGES}>
      <section className="dash-hero">
        <div className="dash-hero-copy">
          <h1>
            <HandWaving size={34} weight="fill" className="dash-wave" aria-hidden="true" /> Xin chào, <strong>{name}!</strong>
          </h1>
          <p>Cùng xem những số liệu mới nhất của hệ thống thuyết minh Quận 4.</p>
        </div>
        <Link to="/pois/new" className="btn btn-primary dash-hero-btn">
          <Plus size={16} weight="bold" aria-hidden="true" /> Thêm điểm
        </Link>
      </section>

      <section className="dash-stats" aria-live="polite" aria-label="Số người dùng ngay lúc này">
        {liveCards.map((c) => (
          <article key={c.key} className={`dash-stat dash-${c.tone}`}>
            <span className="dash-stat-icon" aria-hidden="true">
              {c.icon}
            </span>
            <div className="dash-stat-body">
              <h2>{c.label}</h2>
              <p className="dash-stat-num">{c.value}</p>
              <p className="dash-stat-sub">{c.sub}</p>
              {c.live && (
                <span className={`dash-live live-${status}`}>
                  <i aria-hidden="true" /> {LIVE_TEXT[status]}
                </span>
              )}
            </div>
            <span className="dash-stat-deco" aria-hidden="true">
              {c.deco}
            </span>
          </article>
        ))}
      </section>

      <section className="card dash-chart">
        <div className="dash-chart-head">
          <div className="dash-chart-title">
            <span className="dash-title-icon" aria-hidden="true">
              <ChartBar size={20} weight="fill" />
            </span>
            <div>
              <h2>Biến động sử dụng</h2>
              <p>
                Lượt nghe {days} ngày gần nhất
                {s && (
                  <>
                    {' · '}
                    <b>{formatNumber(s.plays)}</b> lượt <Delta current={s.plays} previous={ps?.plays} /> · <b>{formatNumber(s.sessions)}</b> phiên{' '}
                    <Delta current={s.sessions} previous={ps?.sessions} /> · tổng <b>{formatDuration(s.total_listen_seconds)}</b>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="dash-range" role="group" aria-label="Khoảng thời gian">
            {RANGES.map((d) => (
              <button key={d} type="button" className={days === d ? 'active' : ''} aria-pressed={days === d} onClick={() => setDays(d)}>
                {d === 7 ? '7 ngày qua' : `${d} ngày`}
              </button>
            ))}
          </div>
        </div>
        {stats.loading && !stats.data ? (
          <LoadingState text="Đang tải số liệu…" />
        ) : stats.error ? (
          <ErrorState message={stats.error} onRetry={stats.reload} />
        ) : stats.data?.has_data ? (
          <LineChart
            labels={daily.map((d) => formatDate(d.date).slice(0, 5))}
            values={daily.map((d) => d.plays)}
            label="Lượt nghe"
            height={240}
            points
            endLabel={`${formatNumber(lastPlays)} lượt`}
          />
        ) : (
          <p className="muted dash-empty">Chưa có lượt nghe nào trong {days} ngày qua.</p>
        )}
      </section>

      <div className="dash-row">
        <section className="card dash-top">
          <div className="card-head">
            <h2 className="card-title dash-h">
              <Star size={20} weight="fill" className="dash-star" aria-hidden="true" /> Điểm nghe nhiều nhất
            </h2>
            <Link to="/analytics" className="link-more">
              Xem chi tiết <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {!top[0] ? (
            <p className="muted small">Chưa có lượt nghe trong {days} ngày qua.</p>
          ) : (
            <>
              <Link to={`/pois/${top[0].poi_id}`} className="dash-top-main">
                <span className="dash-top-img">{topImg ? <img src={topImg} alt="" loading="lazy" /> : <Headphones size={30} aria-hidden="true" />}</span>
                <span className="dash-top-info">
                  <strong>{top[0].name}</strong>
                  {topInfo?.address && (
                    <span className="dash-top-addr">
                      <MapPin size={15} weight="fill" aria-hidden="true" /> {topInfo.address}
                    </span>
                  )}
                  <span className="dash-pill">
                    <Play size={13} weight="fill" aria-hidden="true" /> {formatNumber(top[0].plays)} lượt nghe
                  </span>
                </span>
              </Link>
              {top.length > 1 && (
                <ol className="dash-top-rest" start={2}>
                  {top.slice(1).map((p) => (
                    <li key={p.poi_id}>
                      <Link to={`/pois/${p.poi_id}`}>{p.name}</Link>
                      <b>{formatNumber(p.plays)}</b>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </section>

        <section className="card dash-activity">
          <div className="card-head">
            <h2 className="card-title dash-h">
              <ClockCounterClockwise size={20} weight="bold" aria-hidden="true" /> Hoạt động gần đây
            </h2>
            <Link to="/analytics" className="link-more">
              Xem tất cả <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {recent.loading && !recent.data ? (
            <LoadingState />
          ) : recent.error ? (
            <ErrorState message={recent.error} onRetry={recent.reload} />
          ) : !recent.data?.length ? (
            <p className="muted small">Chưa có lượt nghe nào.</p>
          ) : (
            <ul className="dash-feed">
              {recent.data.map((a) => {
                const t = activityText(a);
                return (
                  <li key={a.id}>
                    <time dateTime={a.played_at}>{shortTime(a.played_at)}</time>
                    <span>
                      {t.verb}{' '}
                      {a.poi_id ? <Link to={`/pois/${a.poi_id}`}>{t.poi}</Link> : t.poi}
                      <small>
                        {languageLabel(a.language)}
                        {a.listen_seconds > 0 && ` · ${formatDuration(a.listen_seconds)}`}
                      </small>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <a href="/" target="_blank" rel="noopener" className="dash-promo">
          <span className="dash-promo-copy">
            <span className="dash-promo-script">
              Khám phá
              <br />
              Quận 4
            </span>
            <span className="dash-promo-sub">Xem website như khách tham quan</span>
            <span className="dash-promo-btn">
              <Play size={13} weight="fill" aria-hidden="true" /> Mở trang chủ <ArrowSquareOut size={14} aria-hidden="true" />
            </span>
          </span>
        </a>
      </div>

      <section className="card dash-health">
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
          <ul className="dash-health-list">
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
                      <Warning size={14} aria-hidden="true" /> {missing} điểm {h.fix}
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
      <p className="dash-note muted">
        Số người dùng ngay lúc này là ẩn danh, không lưu lại. Một người được tính là đã rời đi nếu {snap?.ttl_seconds ?? 45} giây không
        còn tín hiệu.
      </p>
    </div>
  );
}
