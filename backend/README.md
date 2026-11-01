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
npm run seed:demo     # nội dung thật của website đang chạy + dữ liệu thống kê giả lập
npm start             # http://localhost:4000  (website) và /admin/ (CMS)
npm run dev           # chế độ tự nạp lại khi sửa code
npm test              # 43 ca kiểm thử (node:test), DB trong bộ nhớ, không cần mạng
```

`seed:demo` lấy dữ liệu từ `src/db/deployed-snapshot.json` (9 POI, 3 tour, 6 QR, 6 ngôn ngữ,
audio, giá và cờ `is_auto`). Ảnh/JS/CSS của website nằm trong `../web/`, audio trong `uploads/`.

- `npm run seed` — nạp nội dung snapshot, không sinh log giả lập.
- `npm run seed:sample` — 8 POI mẫu tối giản trong mã nguồn (dùng khi không có snapshot).
- `node scripts/fetch-deployed.mjs` — tải lại snapshot, audio và asset từ website đang chạy (cần mạng).

Mặc định backend phục vụ luôn website + CMS tại cùng origin nên CMS gọi API bằng đường dẫn tương đối.
Đếm người trực tuyến đang báo số thật (`LIVE_DEMO_FACTOR=1`); đặt `2` nếu muốn nhân đôi để demo. Thanh toán dùng
VietQR với tài khoản cấu hình qua `PAYMENT_*` (xem `.env.example`); đặt `PAYMENT_ACCOUNT=''` để tắt.

Yêu cầu Node ≥ 22.13. Tài khoản CMS mẫu: `admin` / `admin123` (chỉ dùng trên máy cục bộ).
Biến môi trường: xem `.env.example`, chạy với `node --env-file=.env src/server.js`.
Tài liệu API chi tiết: [../docs/api.md](../docs/api.md).
Bản đồ mã nguồn (file/hàm nào làm gì, sửa gì ở đâu): [../docs/code-map.md](../docs/code-map.md).

Docker: `docker build -t narration-api . && docker run -p 4000:4000 -v narration-data:/data -e JWT_SECRET=... narration-api`
(chạy seed lần đầu: `docker run --rm -v narration-data:/data -e DB_FILE=/data/narration.db narration-api node src/db/seed.js`).
