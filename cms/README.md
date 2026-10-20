# CMS web – Hệ thống thuyết minh tự động đa ngôn ngữ

Trang quản trị dành cho quản trị viên nội dung (content administrator) của hệ thống thuyết minh (narration) tự động đa ngôn ngữ tại Quận 4, TP.HCM.
Vite + React 19 + TypeScript, react-router, Leaflet (OpenStreetMap), Chart.js, SheetJS.

## Chạy thử (dev)

Yêu cầu Node ≥ 22.22 và backend đang chạy ở `http://localhost:4000` (xem `../backend`).

```bash
cd cms
npm install
npm run dev          # http://localhost:5173 — đăng nhập admin / admin123 (dữ liệu demo)
```

Ở chế độ dev, Vite proxy `/api` và `/uploads` sang backend nên không cần cấu hình CORS.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy máy chủ phát triển (dev server) có proxy |
| `npm run build` | Kiểm tra kiểu (tsc) rồi build ra `dist/` |
| `npm run preview` | Xem bản build (cũng có proxy) |
| `npm test` | Kiểm thử đơn vị (vitest): kiểm tra dữ liệu, API client, định dạng, xuất Excel |
| `npm run typecheck` | Chỉ kiểm tra kiểu |

## Biến môi trường

Sao chép `.env.example` thành `.env` khi cần.

| Biến | Dùng khi | Ý nghĩa |
|---|---|---|
| `VITE_API_URL` | build production | Gốc backend, ví dụ `https://api.example.com` (không kèm `/api`). Để trống nếu CMS và backend cùng tên miền (reverse proxy `/api`, `/uploads`). File audio/ảnh (`/uploads/...`) cũng được ghép với gốc này. |
| `DEV_PROXY_TARGET` | `dev` / `preview` | Backend mà proxy trỏ tới, mặc định `http://localhost:4000`. |

Khi CMS ở tên miền khác backend, đặt `CORS_ORIGIN` của backend thành địa chỉ CMS.
`dist/` là site tĩnh kiểu SPA: máy chủ web cần trả `index.html` cho mọi đường dẫn không phải file.

## Chức năng

- **Đăng nhập** (JWT lưu qua lớp bọc localStorage an toàn). API trả 401 → về trang đăng nhập, giữ lại trang đang mở (`?next=`). Đăng xuất ở thanh bên.
- **Tổng quan**: số điểm / tour / mã QR, số liệu 7 ngày gần nhất, việc cần làm (điểm thiếu audio, thiếu ngôn ngữ, chưa có QR), lối tắt.
- **Điểm thuyết minh (UC3)**: quản lý điểm tham quan (POI). Danh sách có tìm kiếm, ngôn ngữ/audio, số QR; form tạo/sửa có bản đồ (bấm để đặt điểm, kéo ghim, vòng tròn bán kính (radius), các điểm khác hiển thị mờ) và ô nhập tay; ảnh minh hoạ; 6 tab ngôn ngữ cho bản dịch (translation), vi bắt buộc, với "Dịch tự động từ tiếng Việt" và "Dịch tất cả ngôn ngữ còn trống"; audio từng ngôn ngữ: tải file, tạo giọng đọc bằng chuyển văn bản thành giọng nói (TTS; tự hỏi lưu trước vì TTS dùng nội dung đã lưu), nghe thử, gỡ. Kiểm tra dữ liệu phía client giống máy chủ và hiển thị `error.details` của máy chủ dưới từng ô (E1). Xoá có xác nhận (A1). Cảnh báo khi rời trang còn thay đổi chưa lưu.
- **Mã QR**: tạo/xoá/tải PNG ngay trong trang điểm (A2); trang "Mã QR" liệt kê mọi mã, lọc theo điểm, chọn mã để in bảng (khổ A4, 4 mã/trang, có nhãn trạm, tên điểm, "Quét mã để nghe thuyết minh").
- **Tour (UC4)**: danh sách; form chọn điểm, sắp xếp bằng kéo thả hoặc nút lên/xuống (dùng được bằng bàn phím, có thông báo cho trình đọc màn hình), bản đồ lộ trình đánh số; chặn lưu tour rỗng (E1); xoá có xác nhận.
- **Thống kê (UC5)** (analytics): lọc khoảng ngày (mặc định 30 ngày) và tour; KPI; biểu đồ điểm nghe nhiều nhất, thời gian nghe TB theo điểm, theo ngày, cách kích hoạt (trigger), ngôn ngữ, theo giờ (đổi sang giờ Việt Nam); bản đồ nhiệt (heatmap) + bật/tắt lộ trình ẩn danh; "Không có dữ liệu" khi `has_data=false` (E1); xuất Excel nhiều sheet và xuất PDF (A1).
  - PDF dùng trang báo cáo tối ưu cho in (`/analytics/report`) + hộp thoại in của trình duyệt ("Lưu dưới dạng PDF"), vì jsPDF mặc định không hiển thị đúng tiếng Việt có dấu.
- **Tài khoản**: thông tin và đổi mật khẩu.

## Cấu trúc

```
src/
  lib/          api.ts (client + ApiError), validation.ts, storage.ts, format.ts, qr.ts,
                exportExcel.ts, useAsync.ts, useUnsavedWarning.ts, types.ts, languages.ts, *.test.ts
  auth/         AuthContext.tsx (đăng nhập, 401, RequireAuth)
  components/   Layout, Toast, ConfirmDialog, States (loading/empty/error, Field), maps, charts, QrImage, Icon
  pages/        Login, Dashboard, PoiList, PoiEdit, Qr, TourList, TourEdit, Analytics, AnalyticsReport, Account
```
