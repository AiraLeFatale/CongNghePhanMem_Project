export function createLiveController(s, { heartbeatMs = 15_000 } = {}) {
  return {
    ping: (req, res) => {
      s.live.ping(req.body);
      res.status(204).end();
    },
    snapshot: (_req, res) => res.json(s.live.snapshot()),
    // Đẩy số liệu sang CMS ngay khi có người vào, đổi điểm hoặc rời đi (Server-Sent Events)
    stream: (req, res) => {
      res.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      const send = (snap) => res.write(`event: live\ndata: ${JSON.stringify(snap)}\n\n`);
      send(s.live.snapshot());
      const off = s.live.subscribe(send);
      // Dòng chú thích giữ kết nối, để proxy và trình duyệt không đóng kết nối đang rảnh
      const beat = setInterval(() => res.write(': ping\n\n'), heartbeatMs);
      req.on('close', () => {
        clearInterval(beat);
        off();
      });
    },
  };
}
