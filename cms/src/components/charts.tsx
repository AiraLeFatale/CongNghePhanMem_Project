import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import type { ReactNode } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Filler);

/** Đọc màu từ biến CSS để biểu đồ đổi theo chế độ sáng/tối. */
function token(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function theme() {
  return {
    accent: token('--accent', '#0f766e'),
    fill: token('--chart-fill', 'rgba(15,118,110,0.10)'),
    grid: token('--chart-grid', 'rgba(24,24,27,0.06)'),
    tick: token('--muted', '#71717a'),
    tooltipBg: token('--tooltip-bg', '#18181b'),
  };
}

ChartJS.defaults.font.family = getComputedStyle(document.documentElement).getPropertyValue('--font').trim() || 'system-ui, sans-serif';
ChartJS.defaults.font.size = 12;

const nf = new Intl.NumberFormat('vi-VN');

function baseTooltip(t: ReturnType<typeof theme>) {
  return { backgroundColor: t.tooltipBg, padding: 10, cornerRadius: 6, displayColors: false, titleFont: { weight: 500 as const }, bodyFont: { weight: 600 as const } };
}

export function HBarChart({ labels, values, label, unit = '' }: { labels: string[]; values: number[]; label: string; unit?: string }) {
  const t = theme();
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...baseTooltip(t), callbacks: { label: (c) => `${label}: ${nf.format(c.parsed.x ?? 0)}${unit}` } },
    },
    scales: {
      x: { beginAtZero: true, grid: { color: t.grid }, border: { display: false }, ticks: { precision: 0, color: t.tick } },
      y: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false, color: t.tick, callback: (_v, i) => truncate(labels[i], 26) } },
    },
  };
  return (
    <div className="chart" style={{ height: Math.max(160, labels.length * 30 + 40) }}>
      <Bar data={{ labels, datasets: [{ label, data: values, backgroundColor: t.accent, borderRadius: 3, maxBarThickness: 18 }] }} options={options} aria-label={label} role="img" />
    </div>
  );
}

export function VBarChart({ labels, values, label, height = 220 }: { labels: string[]; values: number[]; label: string; height?: number }) {
  const t = theme();
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...baseTooltip(t), callbacks: { label: (c) => `${label}: ${nf.format(c.parsed.y ?? 0)}` } } },
    scales: {
      y: { beginAtZero: true, grid: { color: t.grid }, border: { display: false }, ticks: { precision: 0, color: t.tick, maxTicksLimit: 5 } },
      x: { grid: { display: false }, border: { display: false }, ticks: { color: t.tick, maxRotation: 0, autoSkipPadding: 6 } },
    },
  };
  return (
    <div className="chart" style={{ height }}>
      <Bar data={{ labels, datasets: [{ label, data: values, backgroundColor: t.accent, borderRadius: 2, maxBarThickness: 28 }] }} options={options} aria-label={label} role="img" />
    </div>
  );
}

export function LineChart({ labels, values, label, height = 260 }: { labels: string[]; values: number[]; label: string; height?: number }) {
  const t = theme();
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { ...baseTooltip(t), callbacks: { label: (c) => `${label}: ${nf.format(c.parsed.y ?? 0)}` } } },
    scales: {
      y: { beginAtZero: true, grid: { color: t.grid }, border: { display: false }, ticks: { precision: 0, color: t.tick, maxTicksLimit: 6 } },
      x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0, color: t.tick } },
    },
  };
  return (
    <div className="chart" style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label,
              data: values,
              borderColor: t.accent,
              backgroundColor: t.fill,
              fill: true,
              cubicInterpolationMode: 'monotone',
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBackgroundColor: t.accent,
              borderWidth: 2,
            },
          ],
        }}
        options={options}
        aria-label={label}
        role="img"
      />
    </div>
  );
}

/**
 * Danh sách xếp hạng: thanh mờ nằm sau nhãn, số liệu căn phải.
 * Dùng thay biểu đồ ngang/donut cho dữ liệu dạng "top N".
 */
export function BarList({
  items,
  valueLabel,
  format = (n) => nf.format(n),
  empty = 'Chưa có dữ liệu.',
}: {
  items: { key: string | number; label: ReactNode; value: number; href?: string }[];
  valueLabel: string;
  format?: (n: number) => string;
  empty?: string;
}) {
  if (items.length === 0) return <p className="muted small">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="barlist">
      <div className="barlist-head">
        <span />
        <span>{valueLabel}</span>
      </div>
      <ul>
        {items.map((i) => (
          <li key={i.key}>
            <span className="barlist-bar" style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} aria-hidden="true" />
            <span className="barlist-label">{i.label}</span>
            <span className="barlist-value">{format(i.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mức thay đổi so với kỳ trước, ví dụ ↑ 12%. */
export function Delta({ current, previous, invert = false }: { current: number; previous: number | null | undefined; invert?: boolean }) {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) {
    return current > 0 ? <span className="delta delta-flat">mới</span> : null;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="delta delta-flat">0%</span>;
  const good = invert ? pct < 0 : pct > 0;
  return (
    <span className={`delta ${good ? 'delta-up' : 'delta-down'}`} title="So với kỳ trước cùng độ dài">
      {pct > 0 ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
}

function truncate(s: string | undefined, n: number) {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
