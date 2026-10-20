# Backend API

Express 5 + SQLite (`node:sqlite`, không cần build module native), kiến trúc 3 lớp:

```
src/
├── routes/         # khai báo REST endpoint
├── controllers/    # lớp điều khiển (controller): đọc request, trả response
├── services/       # lớp nghiệp vụ (service): nghiệp vụ, kiểm tra dữ liệu, gọi API dịch/TTS
├── repositories/   # lớp truy cập dữ liệu (repository): truy vấn SQLite
├── middleware/     # xác thực JWT, upload file, xử lý lỗi
└── db/             # schema + dữ liệu mẫu
```

## Chạy

```bash
npm install
npm run seed:demo     # tạo DB mẫu: 8 điểm tham quan (POI) Quận 4, 2 tour, 5 mã QR + dữ liệu thống kê giả lập
npm run dev           # http://localhost:4000/api
npm test              # 43 ca kiểm thử (node:test), DB trong bộ nhớ, không cần mạng
```

Yêu cầu Node ≥ 22.13. Tài khoản CMS mẫu: `admin` / `admin123` (chỉ dùng trên máy cục bộ).
Biến môi trường: xem `.env.example`, chạy với `node --env-file=.env src/server.js`.
Tài liệu API chi tiết: [../docs/api.md](../docs/api.md).

Docker: `docker build -t narration-api . && docker run -p 4000:4000 -v narration-data:/data -e JWT_SECRET=... narration-api`
(chạy seed lần đầu: `docker run --rm -v narration-data:/data -e DB_FILE=/data/narration.db narration-api node src/db/seed.js`).
