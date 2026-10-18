import type { AnalyticsReport } from './types';
import { fillDaily, hourlyToLocal } from './format';
import { languageLabel, triggerLabel } from './languages';

export interface ExportMeta {
  from: string;
  to: string;
  tourName: string | null;
}

/** Bảng dữ liệu cho từng sheet — tách riêng để kiểm thử không cần thư viện xlsx. */
export function reportSheets(r: AnalyticsReport, meta: ExportMeta): { name: string; rows: (string | number)[][] }[] {
  const s = r.summary;
  return [
    {
      name: 'Tổng quan',
      rows: [
        ['Báo cáo thống kê lượt nghe thuyết minh – Quận 4'],
        ['Từ ngày', meta.from],
        ['Đến ngày', meta.to],
        ['Tour', meta.tourName ?? 'Tất cả'],
        [],
        ['Chỉ số', 'Giá trị'],
        ['Lượt nghe', s.plays],
        ['Phiên sử dụng (ẩn danh)', s.sessions],
        ['Thời gian nghe trung bình (giây)', s.avg_listen_seconds],
        ['Tổng thời gian nghe (giây)', s.total_listen_seconds],
        ['Tổng thời gian nghe (giờ)', Math.round((s.total_listen_seconds / 3600) * 100) / 100],
      ],
    },
    {
      name: 'Theo điểm',
      rows: [
        ['Mã điểm', 'Tên điểm', 'Lượt nghe', 'Số phiên', 'Nghe TB (giây)', 'Vĩ độ', 'Kinh độ'],
        ...r.per_poi.map((p) => [p.poi_id, p.name, p.plays, p.sessions, p.avg_listen_seconds, p.latitude, p.longitude]),
      ],
    },
    { name: 'Theo ngày', rows: [['Ngày (UTC)', 'Lượt nghe'], ...fillDaily(r.daily, meta.from, meta.to).map((d) => [d.date, d.plays])] },
    { name: 'Theo giờ', rows: [['Giờ (UTC+7)', 'Lượt nghe'], ...hourlyToLocal(r.hourly).map((h) => [`${String(h.hour).padStart(2, '0')}:00`, h.plays])] },
    { name: 'Cách kích hoạt', rows: [['Phương thức', 'Mã', 'Lượt nghe'], ...r.by_method.map((m) => [triggerLabel(m.method), m.method, m.plays])] },
    { name: 'Ngôn ngữ', rows: [['Ngôn ngữ', 'Mã', 'Lượt nghe'], ...r.by_language.map((l) => [languageLabel(l.language), l.language, l.plays])] },
    { name: 'Bản đồ nhiệt', rows: [['Vĩ độ', 'Kinh độ', 'Số lần ghi nhận'], ...r.heatmap.map((h) => [h.lat, h.lng, h.weight])] },
  ];
}

export async function exportReportExcel(r: AnalyticsReport, meta: ExportMeta) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const sheet of reportSheets(r, meta)) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    const widths = sheet.rows.reduce<number[]>((acc, row) => {
      row.forEach((c, i) => (acc[i] = Math.min(60, Math.max(acc[i] ?? 8, String(c ?? '').length + 2))));
      return acc;
    }, []);
    ws['!cols'] = widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  XLSX.writeFile(wb, `thong-ke-thuyet-minh_${meta.from}_${meta.to}.xlsx`, { compression: true });
}
