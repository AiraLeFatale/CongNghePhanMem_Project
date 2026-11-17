import { badRequest } from '../utils/errors.js';
import { isIsoDate } from '../utils/validate.js';

export function createAnalyticsService(repos) {
  function parseFilters(q) {
    const f = {};
    if (q.from) {
      if (!isIsoDate(q.from)) throw badRequest('Ngày bắt đầu không hợp lệ');
      f.from = new Date(q.from).toISOString();
    }
    if (q.to) {
      if (!isIsoDate(q.to)) throw badRequest('Ngày kết thúc không hợp lệ');
      // "to" là ngày (YYYY-MM-DD) → lấy hết ngày đó
      const d = new Date(q.to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(q.to)) d.setUTCDate(d.getUTCDate() + 1);
      f.to = d.toISOString();
    }
    if (f.from && f.to && f.from >= f.to) throw badRequest('Ngày bắt đầu phải trước ngày kết thúc');
    if (q.tour_id) {
      const id = Number(q.tour_id);
      if (!Number.isInteger(id) || !repos.tours.findById(id)) throw badRequest('Tour không tồn tại');
      f.tourId = id;
    }
    return f;
  }

  function tourBbox(tourId) {
    const pts = repos.tours.findById(tourId).pois;
    if (!pts.length) return null;
    const pad = 0.003; // ~300 m quanh các điểm của tour
    return {
      minLat: Math.min(...pts.map((p) => p.latitude)) - pad,
      maxLat: Math.max(...pts.map((p) => p.latitude)) + pad,
      minLng: Math.min(...pts.map((p) => p.longitude)) - pad,
      maxLng: Math.max(...pts.map((p) => p.longitude)) + pad,
    };
  }

  return {
    report(query) {
      const f = parseFilters(query);
      const a = repos.analytics;
      const bbox = f.tourId ? tourBbox(f.tourId) : null;
      const summary = a.summary(f);
      const heatmap = a.heatmap({ ...f, bbox });
      return {
        filters: { from: f.from ?? null, to: f.to ?? null, tour_id: f.tourId ?? null },
        has_data: summary.plays > 0 || heatmap.length > 0,
        summary,
        by_method: a.byMethod(f),
        by_language: a.byLanguage(f),
        per_poi: a.perPoi(f),
        daily: a.daily(f),
        hourly: a.hourly(f),
        heatmap,
        routes: a.routes({ ...f, bbox }),
      };
    },
  };
}
