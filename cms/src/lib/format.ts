const nf = new Intl.NumberFormat('vi-VN');
const nf1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

export const formatNumber = (n: number | null | undefined) => (n === null || n === undefined ? '–' : nf.format(n));
export const formatDecimal = (n: number | null | undefined) => (n === null || n === undefined ? '–' : nf1.format(n));

/** 3725 → "1 giờ 2 phút"; 95 → "1 phút 35 giây". */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) return '–';
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} giờ ${m} phút`;
  if (m > 0) return sec ? `${m} phút ${sec} giây` : `${m} phút`;
  return `${sec} giây`;
}

/** Ngày theo giờ máy (YYYY-MM-DD), không lệch múi giờ như toISOString(). */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysAgo(n: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return toLocalISODate(d);
}

/** "2026-10-05" → "05/10/2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Thời điểm từ SQLite ("2026-10-18 02:17:56", UTC) → giờ địa phương dạng Việt Nam. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '–';
  const iso = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Điền 0 cho các ngày không có lượt nghe trong khoảng [from, to]. */
export function fillDaily(daily: { date: string; plays: number }[], from: string, to: string): { date: string; plays: number }[] {
  const map = new Map(daily.map((d) => [d.date, d.plays]));
  const out: { date: string; plays: number }[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return daily;
  for (let d = start; d <= end && out.length < 1000; d = new Date(d.getTime() + 86400000)) {
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, plays: map.get(key) ?? 0 });
  }
  return out;
}

export const VN_OFFSET_HOURS = 7;

/** Giờ trong báo cáo là UTC → đổi sang giờ Việt Nam (UTC+7), đủ 24 cột. */
export function hourlyToLocal(hourly: { hour: number; plays: number }[], offset = VN_OFFSET_HOURS): { hour: number; plays: number }[] {
  const arr = Array.from({ length: 24 }, (_, hour) => ({ hour, plays: 0 }));
  for (const h of hourly) arr[(((h.hour + offset) % 24) + 24) % 24].plays += h.plays;
  return arr;
}
