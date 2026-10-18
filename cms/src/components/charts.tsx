import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);
ChartJS.defaults.font.family = '"Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
ChartJS.defaults.color = '#4b5b58';

export const ACCENT = '#0f766e';
export const PALETTE = ['#0f766e', '#2563eb', '#d97706', '#9333ea', '#db2777', '#64748b'];

const nf = new Intl.NumberFormat('vi-VN');
const gridColor = 'rgba(15, 23, 42, 0.07)';

export function HBarChart({ labels, values, label, unit = '', color = ACCENT }: { labels: string[]; values: number[]; label: string; unit?: string; color?: string }) {
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${label}: ${nf.format(c.parsed.x ?? 0)}${unit}` } },
    },
    scales: {
      x: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0 } },
      y: { grid: { display: false }, ticks: { autoSkip: false, callback: (_v, i) => truncate(labels[i], 26) } },
    },
  };
  return (
    <div className="chart" style={{ height: Math.max(180, labels.length * 34 + 40) }}>
      <Bar data={{ labels, datasets: [{ label, data: values, backgroundColor: color, borderRadius: 4, maxBarThickness: 22 }] }} options={options} aria-label={label} role="img" />
    </div>
  );
}

export function VBarChart({ labels, values, label, color = ACCENT, height = 240 }: { labels: string[]; values: number[]; label: string; color?: string; height?: number }) {
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${label}: ${nf.format(c.parsed.y ?? 0)}` } } },
    scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0 } }, x: { grid: { display: false } } },
  };
  return (
    <div className="chart" style={{ height }}>
      <Bar data={{ labels, datasets: [{ label, data: values, backgroundColor: color, borderRadius: 3 }] }} options={options} aria-label={label} role="img" />
    </div>
  );
}

export function LineChart({ labels, values, label, height = 260 }: { labels: string[]; values: number[]; label: string; height?: number }) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${label}: ${nf.format(c.parsed.y ?? 0)}` } } },
    scales: {
      y: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0 } },
      x: { grid: { display: false }, ticks: { maxTicksLimit: 10, maxRotation: 0 } },
    },
  };
  return (
    <div className="chart" style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            { label, data: values, borderColor: ACCENT, backgroundColor: 'rgba(15,118,110,0.12)', fill: true, tension: 0.3, pointRadius: labels.length > 45 ? 0 : 2.5, borderWidth: 2 },
          ],
        }}
        options={options}
        aria-label={label}
        role="img"
      />
    </div>
  );
}

export function DonutChart({ labels, values, label }: { labels: string[]; values: number[]; label: string }) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
      tooltip: { callbacks: { label: (c) => `${c.label}: ${nf.format(c.parsed)} (${Math.round((c.parsed / total) * 100)}%)` } },
    },
  };
  return (
    <div className="chart" style={{ height: 260 }}>
      <Doughnut data={{ labels, datasets: [{ label, data: values, backgroundColor: PALETTE, borderColor: '#fff', borderWidth: 2 }] }} options={options} aria-label={label} role="img" />
    </div>
  );
}

function truncate(s: string | undefined, n: number) {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
