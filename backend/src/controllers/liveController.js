/**
 * Tầng controller cho panel "Đang dùng ngay lúc này" của CMS.
 * GET trả snapshot; GET /stream giữ kết nối SSE và đẩy snapshot định kỳ.
 */
export function createLiveController(s) {
  return {
    snapshot: (_req, res) => res.json(s.live.snapshot()),
    // Stream dùng chung middleware Bearer của router admin (CMS gọi bằng fetch, không phải EventSource).
    stream: (req, res) => s.live.stream(req, res),
  };
}
