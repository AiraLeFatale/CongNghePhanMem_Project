export function createAnalyticsController(s) {
  return {
    report: (req, res) => res.json(s.analytics.report(req.query)),
    recent: (req, res) => res.json(s.analytics.recent(req.query)),
  };
}
