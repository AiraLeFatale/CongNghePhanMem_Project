# Quản lý dự án

**Dự án:** Hệ thống thuyết minh tự động đa ngôn ngữ
**Phiên bản tài liệu:** 1.0 (18/10/2026)

## 1. Mô hình quy trình
Nhóm áp dụng quy trình **lặp và tăng trưởng, hướng ca sử dụng (use case)**:

1. **Khởi đầu (Inception)**: xác định phạm vi và phác thảo kiến trúc (các sơ đồ trong README), các ca sử dụng trọng tâm UC1–UC5.
2. **Làm rõ (Elaboration)**: SRS, mô hình dữ liệu, hợp đồng API, thiết kế bộ máy geofence (geofence engine) và bộ máy thuyết minh (narration engine).
3. **Xây dựng (Construction)** theo từng bản tăng trưởng (increment); mỗi bản kết thúc bằng phần mềm chạy được và đã kiểm thử:
   - Bản tăng trưởng 1: backend (dữ liệu, API cho CMS, đồng bộ (sync), QR, nhật ký, thống kê (analytics)) kèm kiểm thử tự động.
   - Bản tăng trưởng 2: CMS web (POI, bản dịch, audio, QR, tour, thống kê).
   - Bản tăng trưởng 3: ứng dụng di động (đồng bộ, geofence, thuyết minh, QR, nhật ký ngoại tuyến (offline), chế độ mô phỏng vị trí).
4. **Chuyển giao (Transition)**: kiểm thử thực địa (field test) tại các điểm tham quan (POI) thật, sửa lỗi, hoàn thiện tài liệu, demo.

Lý do lựa chọn: yêu cầu đã rõ ở mức ca sử dụng, nhưng hành vi của GPS và giới hạn của các dịch vụ miễn phí chỉ biết được khi xây dựng và kiểm thử. Phát triển theo bản tăng trưởng cho phép kiểm thử sớm phần rủi ro nhất (geofence trên thiết bị) trên máy thật, trong khi hợp đồng API của backend vẫn giữ ổn định.

Thực hành: kho mã Git/GitHub, mỗi tính năng một nhánh và được review trước khi gộp, hợp đồng API (`docs/api.md`) là thoả thuận giữa backend và các client, kiểm thử tự động của backend chạy trước mỗi lần gộp.

## 2. Cấu trúc phân rã công việc (WBS)

```text
1  Quản lý dự án
   1.1 Lập kế hoạch, lịch trình, theo dõi rủi ro
   1.2 Họp hằng tuần và báo cáo tiến độ
2  Yêu cầu
   2.1 Phác thảo kiến trúc (README)
   2.2 Các ca sử dụng trọng tâm UC1–UC5
   2.3 SRS (FR/NFR, quy tắc nghiệp vụ, truy vết)
3  Thiết kế
   3.1 Kiến trúc và triển khai
   3.2 Cơ sở dữ liệu (ERD, schema)
   3.3 Hợp đồng REST API
   3.4 Thiết kế bộ máy geofence và bộ máy thuyết minh
   3.5 Thiết kế giao diện (màn hình CMS, màn hình ứng dụng)
4  Backend
   4.1 Lớp dữ liệu (schema, repository, dữ liệu mẫu)
   4.2 Service (POI, tour, QR, đồng bộ, nhật ký, thống kê, xác thực)
   4.3 Nhà cung cấp dịch và TTS
   4.4 REST controller, middleware bảo mật
   4.5 Kiểm thử tự động
5  CMS web
   5.1 Đăng nhập và API client
   5.2 Quản lý POI có chọn vị trí trên bản đồ
   5.3 Tab bản dịch, dịch tự động, TTS, tải lên audio
   5.4 Tạo và in mã QR
   5.5 Quản lý tour có đường lộ trình trên bản đồ
   5.6 Bảng thống kê, bản đồ nhiệt, xuất Excel/PDF
6  Ứng dụng di động
   6.1 Lớp nội dung ngoại tuyến và đồng bộ
   6.2 Dịch vụ vị trí (tiền cảnh và nền)
   6.3 Bộ máy geofence
   6.4 Bộ máy thuyết minh (audio, TTS trên máy, thời gian chờ phát lại)
   6.5 Trình quét QR
   6.6 Hàng đợi nhật ký và gửi lên máy chủ
   6.7 Giao diện: bản đồ, danh sách, tour, cài đặt; chế độ mô phỏng vị trí
7  Kiểm thử
   7.1 Kế hoạch kiểm thử và ca kiểm thử
   7.2 Kiểm thử đơn vị và kiểm thử API
   7.3 Kiểm thử hệ thống (CMS, ứng dụng)
   7.4 Kiểm thử thực địa tại POI và trạm xe buýt
8  Triển khai và tài liệu
   8.1 Triển khai lên máy chủ (HTTPS, sao lưu)
   8.2 Hướng dẫn cài đặt, hướng dẫn sử dụng
   8.3 Báo cáo cuối kỳ và demo
```

## 3. Tiến độ và các mốc

| Ngày | Mốc (milestone) | Trạng thái |
|---|---|---|
| 17/09/2026 | Tạo kho mã của nhóm | Hoàn thành |
| 20/09/2026 | Focused Use Cases v1.0 (UC1–UC5) | Hoàn thành |
| 22/09–28/09/2026 | Sơ đồ kiến trúc và ERD trong README | Hoàn thành |
| đến 18/10/2026 | Bản tăng trưởng backend: API 3 lớp, schema SQLite, dữ liệu mẫu, 43 kiểm thử tự động Đạt | Hoàn thành |
| 18/10/2026 | SRS, thiết kế, kế hoạch kiểm thử (test plan), hướng dẫn cài đặt và hướng dẫn sử dụng (bộ tài liệu này), đã đối chiếu với code | Hoàn thành |
| đến 18/10/2026 | Bản tăng trưởng CMS: đủ các trang, 36 kiểm thử đơn vị Đạt, chạy E2E trên trình duyệt với backend thật | Hoàn thành (còn phải kiểm tra hộp thoại in, giao diện đổi mật khẩu và bản build production) |
| đến 18/10/2026 | Bản tăng trưởng mobile: đủ các mô-đun, 62 kiểm thử đơn vị + 5 kiểm thử với backend thật Đạt, kiểm tra kiểu, expo-doctor và xuất bundle không lỗi | Hoàn thành về code; chưa chạy trên thiết bị |
| Chưa xác định | Kiểm thử ứng dụng trên thiết bị (các ca Chờ thiết bị trong kế hoạch kiểm thử) trên Android và iOS | Chưa bắt đầu |
| Chưa xác định | Kiểm thử thực địa FT-01 đến FT-09 tại POI và trạm xe buýt thật | Chưa bắt đầu |
| Chưa xác định | Triển khai lên máy chủ có HTTPS | Chưa bắt đầu |
| Chưa xác định | Báo cáo cuối kỳ và demo | Chưa bắt đầu |

Các ngày "Chưa xác định" sẽ do nhóm ấn định dựa theo hạn nộp đồ án.

```mermaid
gantt
    title Hệ thống thuyết minh - các mốc đã ghi nhận
    dateFormat YYYY-MM-DD
    axisFormat %d/%m
    section Yêu cầu
    Tạo kho mã                     :milestone, m1, 2026-09-17, 0d
    Focused Use Cases v1.0         :milestone, m2, 2026-09-20, 0d
    Kiến trúc và ERD trong README  :done, r3, 2026-09-22, 2026-09-28
    section Xây dựng
    Hoàn thành code backend, CMS và ứng dụng :milestone, m3, 2026-10-18, 0d
    section Tài liệu
    Bộ tài liệu v1.0               :milestone, m4, 2026-10-18, 0d
```

Biểu đồ chỉ thể hiện các ngày có ghi nhận trong lịch sử kho mã hoặc trong tài liệu. Ngày bắt đầu làm backend không được ghi nhận trong kho mã chung nên không đưa vào.

## 4. Vai trò

| Vai trò | Trách nhiệm | Thành viên |
|---|---|---|
| Trưởng nhóm / phân tích | Lịch trình, ca sử dụng, SRS, liên lạc với giảng viên | Cần bổ sung: tên |
| Lập trình viên backend | API, cơ sở dữ liệu, kiểm thử, triển khai | Cần bổ sung: tên |
| Lập trình viên CMS | Ứng dụng web quản trị | Cần bổ sung: tên |
| Lập trình viên mobile | Ứng dụng, bộ máy geofence và bộ máy thuyết minh | Cần bổ sung: tên |
| Kiểm thử / tài liệu | Thực hiện kế hoạch kiểm thử, kiểm thử thực địa, hướng dẫn sử dụng | Cần bổ sung: tên |

Một người có thể đảm nhận nhiều vai trò.

## 5. Rủi ro và biện pháp giảm thiểu

| ID | Rủi ro (risk) | Khả năng xảy ra | Mức ảnh hưởng | Biện pháp giảm thiểu (mitigation) | Phụ trách |
|---|---|---|---|---|---|
| R1 | **Độ chính xác GPS** ở phố đông và gần nhà cao tầng gây kích hoạt (trigger) muộn, bỏ sót hoặc kích hoạt sai | Cao | Cao | Bỏ qua các lần định vị có độ chính xác kém hơn 60 m; ngưỡng trễ khi ra vùng là 1,2 × bán kính (radius); thời gian chờ phát lại (cooldown); tinh chỉnh bán kính và độ ưu tiên (priority) cho từng POI trong CMS sau kiểm thử thực địa; dùng mã QR và phát thủ công từ danh sách làm phương án thay thế | Lập trình viên mobile |
| R2 | **Giới hạn định vị nền (background location)** của iOS/Android (tối ưu pin, Doze, người dùng từ chối quyền "luôn luôn"; không có trong Expo Go) làm dừng thuyết minh khi tắt màn hình | Cao | Cao | Dùng `expo-task-manager` cập nhật vị trí nền kèm thông báo dịch vụ tiền cảnh trên Android, trong bản development/store build; giải thích lý do cần quyền "luôn luôn"; giữ chế độ tiền cảnh làm phương án chắc chắn chạy được; ghi lại hành vi theo từng thiết bị từ FT-03 | Lập trình viên mobile |
| R3 | **Endpoint dịch/TTS miễn phí** (endpoint không chính thức của Google) bị giới hạn tần suất, thay đổi hoặc bị chặn | Trung bình | Trung bình | Chỉ gọi từ CMS khi quản trị viên yêu cầu, ứng dụng không bao giờ gọi; nhà cung cấp có thể cấu hình (`libretranslate`, `none`); audio chỉ tạo một lần và lưu lại; ứng dụng có TTS trên máy làm phương án dự phòng; lỗi trả về 502 nhưng không chặn việc lưu | Lập trình viên backend |
| R4 | **Quyền riêng tư**: dữ liệu vị trí có thể làm lộ danh tính khách tham quan | Trung bình | Cao | Không có tài khoản người dùng; session ID ngẫu nhiên cho mỗi lần mở ứng dụng; máy chủ làm tròn toạ độ còn 4 chữ số thập phân; bản đồ nhiệt (heatmap) chỉ hiển thị dữ liệu gộp; lộ trình không kèm session ID; không thu thập định danh thiết bị; chính sách lưu giữ dữ liệu sẽ thống nhất với bên sở hữu nội dung | Trưởng nhóm |
| R5 | Toạ độ POI sai hoặc văn bản dịch máy đến tay khách tham quan | Trung bình | Trung bình | Kiểm tra toạ độ tại chỗ trước khi đưa vào sử dụng; duyệt bản dịch trước khi lưu; tiếng Việt là bắt buộc để làm bản dự phòng | Quản trị viên nội dung |
| R6 | Thiết bị ngoại tuyến không nhận được cập nhật nội dung | Trung bình | Thấp | Kiểm tra phiên bản khi mở ứng dụng và khi có mạng lại; nội dung vẫn dùng được ngoại tuyến với phiên bản gần nhất | Lập trình viên mobile |
| R7 | Ứng dụng chưa được kiểm chứng trên thiết bị; lỗi lúc chạy (WebView bản đồ, camera, phiên audio, quyền truy cập) phát hiện muộn | Trung bình | Cao | Chạy các ca Chờ thiết bị trên emulator và một điện thoại thật trước; chế độ mô phỏng vị trí và nhập mã QR thủ công cho phép demo UC1/UC2 mà không cần điều kiện thực địa | Lập trình viên mobile |
| R8 | Mất dữ liệu SQLite do chỉ có một máy chủ | Thấp | Cao | Sao lưu trực tuyến cơ sở dữ liệu và thư mục uploads hằng ngày, có bản sao ngoài máy chủ, thử khôi phục (xem `04-installation.md` §4.3) | Lập trình viên backend |
