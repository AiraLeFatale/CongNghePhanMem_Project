# Tài liệu: Hệ thống thuyết minh tự động đa ngôn ngữ

Bộ tài liệu công nghệ phần mềm của đồ án. Các sơ đồ viết bằng Mermaid và hiển thị trực tiếp trên GitHub.

| # | Tài liệu | Nội dung |
|---|---|---|
| 1 | [01-SRS.md](01-SRS.md) | Đặc tả yêu cầu phần mềm (SRS): phạm vi, tác nhân (actor), sơ đồ ca sử dụng (use case), yêu cầu chức năng (functional requirement) FR-01 đến FR-39 truy vết (traceability) tới UC1–UC5, yêu cầu phi chức năng (non-functional requirement), quy tắc nghiệp vụ (business rule), ràng buộc, giả định, ma trận truy vết |
| 2 | [02-design.md](02-design.md) | Thiết kế phần mềm: kiến trúc, các lớp và mô-đun backend, thiết kế mô-đun mobile và CMS, sơ đồ lớp, sơ đồ hoạt động (UC1–UC5), sơ đồ tuần tự, sơ đồ trạng thái của bộ máy thuyết minh (narration engine), ERD theo schema thực tế, sơ đồ triển khai (deployment), các quyết định thiết kế |
| 3 | [03-test-plan.md](03-test-plan.md) | Chiến lược kiểm thử, môi trường, 92 ca kiểm thử (test case) kèm trạng thái (backend 43/43, CMS 36/36 kiểm thử đơn vị + E2E trên trình duyệt, mobile 62/62 kiểm thử đơn vị + 5/5 kiểm thử với backend thật, tất cả Đạt ngày 18/10/2026; các ca cần chạy ứng dụng trên thiết bị đang Chờ thiết bị), danh sách kiểm tra cho kiểm thử thực địa (field test) |
| 4 | [04-installation.md](04-installation.md) | Cài đặt và chạy backend, biến môi trường, thiết lập CMS và mobile (địa chỉ backend, Expo Go hay development build, demo trên lớp), triển khai lên môi trường production và sao lưu |
| 5 | [05-user-guide.md](05-user-guide.md) | Hướng dẫn sử dụng cho quản trị viên (CMS) và khách du lịch/hành khách (ứng dụng), nhãn màn hình lấy từ code; ảnh chụp màn hình: Cần bổ sung |
| 6 | [06-project-management.md](06-project-management.md) | Mô hình quy trình, WBS, các mốc (milestone), vai trò, rủi ro (risk) và biện pháp giảm thiểu (mitigation) |
| – | [api.md](api.md) | Tài liệu tham chiếu REST API (endpoint công khai, xác thực, quản trị; định dạng request/response; mã lỗi) |

Tài liệu gốc của nhóm:
- [`../README.md`](../README.md): sơ đồ kiến trúc ban đầu và ERD
- Đặc tả ca sử dụng (Focused Use Cases UC1–UC5, v1.0, 20/09/2026)

Tình trạng (18/10/2026): backend, CMS và ứng dụng di động đã được xây dựng xong. Ứng dụng di động đã được kiểm chứng bằng kiểm thử đơn vị và kiểm thử với backend thật, nhưng chưa chạy trên thiết bị; các ca này được đánh dấu "Chờ thiết bị". Chưa thực hiện kiểm thử thực địa tại các điểm tham quan (POI) thật.
