/**
 * Tầng controller cho báo cáo thống kê trong CMS.
 * Chuyển query string (from/to/...) nguyên vẹn cho analyticsService xử lý và trả JSON.
 */

// Handler duy nhất: trả báo cáo tổng hợp theo khoảng thời gian và bộ lọc trên query.
export function createAnalyticsController(s) {
  return {
    report: (req, res) => res.json(s.analytics.report(req.query)),
  };
}
