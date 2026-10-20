# Tài liệu tham chiếu API (backend 3 lớp)

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart LR
    APP["📱 Ứng dụng di động"]:::mobile
    CMS["🖥️ CMS web"]:::cms
    APP --> PUB
    CMS --> LOGIN
    CMS -- "Bearer JWT" --> ADM
    APP -. "audio, ảnh" .-> UP
    CMS -. "audio, ảnh" .-> UP
    subgraph API["⚙️ http://server:4000"]
        PUB["/api công khai<br/>7 endpoint, ẩn danh"]:::backend
        LOGIN["/api/auth/login<br/>1 endpoint"]:::backend
        ADM["/api/admin/*<br/>22 endpoint, cần JWT"]:::backend
        UP["/uploads/tên file<br/>file tĩnh"]:::data
    end
    style API fill:#F8FAFC,stroke:#CBD5E1
    classDef backend fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef cms fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95
    classDef data fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
    classDef mobile fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
```

*Hình: Ba nhóm endpoint REST dưới /api và thư mục file tĩnh /uploads, theo backend/src/routes/index.js và app.js*


URL gốc: `http://<server>:4000/api`. Mọi phản hồi đều ở dạng JSON. Lỗi có dạng:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Thông điệp dễ đọc (tiếng Việt)", "details": { "radius_m": "Bán kính kích hoạt phải lớn hơn 0" } } }
```

Máy chủ trả giá trị `message` và `details` bằng tiếng Việt; client nên rẽ nhánh theo `code` và theo tên trường trong `details`, không dựa vào nội dung thông điệp.

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart TD
    REQ(["Yêu cầu HTTP"]):::startend --> JSON{"Thân JSON<br/>đọc được?"}:::decision
    JSON -- "Lỗi cú pháp" --> E400J["400 BAD_JSON<br/>sai cú pháp JSON"]:::bad
    JSON -- "Quá lớn" --> E413["413 TOO_LARGE<br/>thân lớn hơn 1 MB"]:::bad
    JSON -- "Hợp lệ" --> ROUTE{"Khớp route?"}:::decision
    ROUTE -- "Không" --> E404["404 NOT_FOUND<br/>sai route hoặc file /uploads"]:::bad
    ROUTE -- "Có" --> LIM{"Vượt giới hạn<br/>tần suất?"}:::decision
    LIM -- "Có" --> E429["429 RATE_LIMIT<br/>đăng nhập / ghi nhật ký"]:::warn
    LIM -- "Không" --> AUTH{"/admin: token<br/>hợp lệ?"}:::decision
    AUTH -- "Không" --> E401["401 UNAUTHORIZED<br/>token thiếu, sai, hết hạn"]:::bad
    AUTH -- "Có / công khai" --> SVC["⚙️ Controller → Service"]:::backend
    SVC -- "AppError" --> EAPP["AppError từ service<br/>400 · 401 · 404 · 502"]:::bad
    SVC -- "MulterError" --> EUP["400 UPLOAD_ERROR<br/>file quá 15 MB, lỗi tải"]:::bad
    SVC -- "Lỗi khác" --> E500["500 INTERNAL<br/>lỗi ngoài dự kiến"]:::bad
    SVC -- "Thành công" --> OK["2xx<br/>JSON kết quả"]:::ok
    classDef backend fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef bad fill:#FEE2E2,stroke:#DC2626,stroke-width:2px,color:#7F1D1D
    classDef decision fill:#FFF7ED,stroke:#EA580C,stroke-width:2px,color:#7C2D12
    classDef ok fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef startend fill:#1E3A8A,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef warn fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F
```

*Hình: Mô hình lỗi: các điểm trong chuỗi middleware của Express có thể sinh mã lỗi, tất cả đi qua errorHandler và trả về dạng {error:{code, message, details}}*


| Mã | HTTP | Ý nghĩa |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào không hợp lệ; `details` có khoá là tên trường |
| `BAD_JSON` | 400 | Thân yêu cầu không phải JSON hợp lệ |
| `UPLOAD_ERROR` | 400 | Tải lên multipart thất bại (ví dụ file lớn hơn 15 MB) |
| `UNAUTHORIZED` | 401 | Thiếu token, token không hợp lệ hoặc đã hết hạn; sai thông tin đăng nhập |
| `NOT_FOUND` | 404 | Không tìm thấy tài nguyên, route hoặc file đã tải lên |
| `TOO_LARGE` | 413 | Thân JSON lớn hơn 1 MB |
| `RATE_LIMIT` | 429 | Đăng nhập sai quá nhiều lần. Các endpoint ghi nhật ký cũng trả 429 khi vượt giới hạn (với thân phản hồi mặc định của bộ giới hạn, không theo dạng JSON này) |
| `UPSTREAM_ERROR` | 502 | Dịch vụ dịch/TTS bên ngoài lỗi hoặc không truy cập được |
| `INTERNAL` | 500 | Lỗi máy chủ ngoài dự kiến |

File audio và ảnh được phục vụ tại `http://<server>:4000/uploads/<tên file>`. Các trường `audio_url` và `image_url` lưu đường dẫn tương đối `/uploads/...`; client tự ghép origin của máy chủ vào phía trước.

Ngôn ngữ hỗ trợ: `vi` (mặc định), `en`, `zh`, `ko`, `ja`, `fr`.

## 1. API công khai (ứng dụng di động, ẩn danh)

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart LR
    APP["📱 Ứng dụng di động<br/>ẩn danh"]:::mobile
    subgraph INFO["Thông tin"]
        H["GET /health"]:::backend
        L["GET /languages"]:::backend
    end
    subgraph SYNC["Đồng bộ ngoại tuyến"]
        V["GET /sync/version"]:::backend
        S["GET /sync"]:::backend
    end
    subgraph QRG["Phân giải mã QR"]
        Q["GET /qr/:payload"]:::backend
    end
    subgraph LOG["Nhật ký, 120 yêu cầu/phút/IP"]
        U["POST /logs/usage"]:::backend
        LO["POST /logs/location"]:::backend
    end
    APP --> INFO
    APP --> SYNC
    APP --> QRG
    APP --> LOG
    style INFO fill:#F8FAFC,stroke:#CBD5E1
    style SYNC fill:#F8FAFC,stroke:#CBD5E1
    style QRG fill:#F8FAFC,stroke:#CBD5E1
    style LOG fill:#F8FAFC,stroke:#CBD5E1
    classDef backend fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef mobile fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
```

*Hình: Bảy endpoint công khai chia theo mục đích; chỉ hai endpoint ghi nhật ký bị giới hạn tần suất*


| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/health` | `{status:"ok", time}` |
| GET | `/languages` | `{default:"vi", languages:[{code,name}]}` |
| GET | `/sync/version` | `{version: 12}`. Số này tăng mỗi khi quản trị viên thay đổi nội dung |
| GET | `/sync` | Toàn bộ ảnh chụp nội dung để lưu ngoại tuyến (offline) (xem bên dưới) |
| GET | `/qr/:payload` | Tra một mã QR → `{qr:{id,label}, poi:{...,translations}}`; 404 nếu không biết mã. `payload` nhận `NARR:<code>`, `<code>` hoặc URL kết thúc bằng `/q/<code>` (áp dụng `encodeURIComponent`) |
| POST | `/logs/usage` | Ghi sự kiện phát thuyết minh. Thân là một đối tượng hoặc một mảng (≤ 500 phần tử) |
| POST | `/logs/location` | Ghi mẫu vị trí ẩn danh. Thân là một đối tượng hoặc một mảng (≤ 500 phần tử) |

Hai endpoint ghi nhật ký bị giới hạn 120 yêu cầu mỗi phút cho mỗi IP.

`GET /sync`:
```json
{
  "version": 12, "generated_at": "2026-10-18T03:00:00.000Z", "default_language": "vi",
  "languages": [{ "code": "vi", "name": "Tiếng Việt" }],
  "pois": [{
    "id": 1, "name": "Bến Nhà Rồng – Bảo tàng Hồ Chí Minh", "address": "...", "latitude": 10.7681, "longitude": 106.7068,
    "radius_m": 80, "priority": 10, "image_url": null, "updated_at": "2026-10-18 03:00:00",
    "translations": [{ "language_code": "vi", "title": "Bến Nhà Rồng", "narration_text": "...", "audio_url": "/uploads/tts-....mp3", "audio_source": "tts" }]
  }],
  "qrcodes": [{ "payload": "rgKYmfihPDB4", "poi_id": 4, "label": "Cau Khanh Hoi bus stop" }],
  "tours": [{ "id": 1, "name": "Di sản ven sông Quận 4", "description": "...", "updated_at": "...", "poi_ids": [5, 1, 6, 4] }]
}
```
Các điểm tham quan (POI) được sắp theo `priority` giảm dần; `poi_ids` trong một tour theo đúng thứ tự tham quan. `qrcodes` liệt kê mọi payload QR cùng POI tương ứng, để ứng dụng tra được mã in sẵn khi ngoại tuyến; `GET /qr/:payload` vẫn được giữ làm phương án dự phòng khi có mạng.

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
sequenceDiagram
    participant App as Ứng dụng di động
    participant Local as SQLite trên máy
    participant API as Backend /api
    participant DB as SQLite máy chủ
    Note over App: Khởi động, mỗi 5 phút,<br/>về foreground, có mạng lại
    App->>API: GET /sync/version
    API->>DB: đọc meta.content_version
    API-->>App: 200 {version}
    alt Khác phiên bản cục bộ hoặc chưa có dữ liệu
        App->>API: GET /sync
        API->>DB: POI + bản dịch, tour, mã QR
        API-->>App: 200 {version, pois, qrcodes, tours, ...}
        App->>Local: Lưu bản chụp và phiên bản mới
    else Trùng phiên bản
        App->>App: Bỏ qua, không tải lại
    end
    Note over App,Local: Lỗi mạng thì giữ nguyên dữ liệu cũ
```

*Hình: Luồng đồng bộ: kiểm tra phiên bản trước, chỉ tải toàn bộ bản chụp khi phiên bản trên máy chủ thay đổi*


`POST /logs/usage` (mỗi phần tử):
```json
{ "poi_id": 1, "session_id": "a1b2c3d4e5f6a7b8", "trigger_method": "geofence|qr|manual", "language_code": "vi", "played_at": "ISO-8601", "listen_seconds": 42 }
```
`POST /logs/location` (mỗi phần tử): `{ "session_id": "...", "latitude": 10.76, "longitude": 106.70, "recorded_at": "ISO-8601" }`

- `session_id`: chuỗi ngẫu nhiên 8–64 ký tự `[A-Za-z0-9_-]`, do ứng dụng tạo ở mỗi lần khởi động và không gắn với danh tính nào.
- `language_code` phải là một ngôn ngữ được hỗ trợ.
- `played_at` / `recorded_at` không bắt buộc; nếu thiếu hoặc không hợp lệ, máy chủ dùng giờ của máy chủ.
- `listen_seconds` được làm tròn và giới hạn trong khoảng 0..3600.
- Máy chủ làm tròn toạ độ tới 4 chữ số thập phân (~11 m) trước khi lưu.
- Một lô được chèn trong một giao dịch. Bản ghi sử dụng có POI không còn tồn tại (bị xoá sau khi ứng dụng ghi nhật ký lúc ngoại tuyến) bị bỏ qua và được đếm vào `skipped`; nếu không bản ghi nào trong lô trỏ tới POI còn tồn tại, yêu cầu thất bại với mã 400. Mọi phần tử không hợp lệ khác làm cả lô bị từ chối với mã 400 (thông điệp nêu chỉ số của phần tử).

Phản hồi: `201 {inserted, skipped}` cho nhật ký sử dụng, `201 {inserted}` cho vị trí.

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
sequenceDiagram
    participant App as Ứng dụng di động
    participant Q as Hàng đợi cục bộ
    participant API as Backend /api
    participant Svc as logService
    participant DB as SQLite máy chủ
    App->>Q: Ghi bản ghi sau mỗi lần phát / mẫu vị trí
    loop Mỗi lô tối đa 200 bản ghi
        App->>API: POST /logs/usage [mảng ≤ 500]
        Note over API: Giới hạn 120 yêu cầu/phút/IP
        API->>Svc: recordUsage(body)
        Svc->>Svc: Bỏ bản ghi có POI đã xoá (skipped),<br/>kiểm tra session_id, trigger_method, language_code
        Svc->>DB: Chèn cả lô trong một transaction
        API-->>App: 201 {inserted, skipped}
        App->>Q: Xoá các bản ghi đã gửi
    end
    alt 400: cả lô bị từ chối
        App->>API: Gửi lại từng bản ghi, bỏ bản ghi lỗi
    else Lỗi mạng
        App->>Q: Giữ lại, thử lần sau
    end
    Note over App,DB: POST /logs/location đi theo cùng luồng,<br/>máy chủ làm tròn toạ độ 4 chữ số, trả 201 {inserted}
```

*Hình: Luồng gửi nhật ký: ứng dụng xếp hàng cục bộ, gửi theo lô, máy chủ kiểm tra và chèn trong một giao dịch*


## 2. Đăng nhập CMS

`POST /auth/login` `{username, password}` → `{token, user:{id,username,full_name}}`. Giới hạn 20 lần thử mỗi 15 phút cho mỗi IP.

Mọi endpoint `/admin/*` yêu cầu header `Authorization: Bearer <token>`. Mặc định token hết hạn sau 8 giờ (`JWT_EXPIRES_IN`); token hết hạn trả về 401 và CMS quay về trang đăng nhập.

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
sequenceDiagram
    actor QTV as Quản trị viên
    participant CMS as CMS web
    participant API as Backend /api
    participant Auth as authService
    participant DB as SQLite máy chủ
    QTV->>CMS: Nhập tên đăng nhập, mật khẩu
    CMS->>API: POST /auth/login {username, password}
    Note over API: Giới hạn 20 lần / 15 phút / IP
    API->>Auth: login()
    Auth->>DB: Tìm admin theo username
    Auth->>Auth: bcrypt.compare
    alt Sai thông tin
        API-->>CMS: 401 UNAUTHORIZED
    else Đúng
        Auth->>Auth: jwt.sign({sub, username}), hết hạn 8 giờ
        API-->>CMS: 200 {token, user}
    end
    CMS->>API: GET /admin/... + Authorization: Bearer token
    API->>Auth: requireAdmin → verify(token)
    Auth->>DB: Tìm admin theo sub
    alt Token hợp lệ và admin còn tồn tại
        API-->>CMS: 2xx dữ liệu
    else Thiếu, sai hoặc hết hạn
        API-->>CMS: 401 UNAUTHORIZED
        CMS->>QTV: Quay về trang đăng nhập
    end
```

*Hình: Luồng xác thực JWT: đăng nhập lấy token, mọi lệnh gọi /admin được middleware requireAdmin kiểm tra*


## 3. API quản trị (`/admin`)

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart LR
    CMS["🖥️ CMS<br/>Bearer JWT"]:::cms --> ADM["⚙️ /api/admin"]:::backend
    subgraph ACC["Tài khoản"]
        ME["/me<br/>GET · POST /password"]:::backend
    end
    subgraph POIG["Điểm tham quan"]
        POIS["/pois<br/>GET ?q= · POST"]:::backend
        POI["/pois/:id<br/>GET · PUT<br/>DELETE"]:::backend
        IMG["/images<br/>POST multipart"]:::backend
    end
    subgraph CONT["Nội dung thuyết minh"]
        AUD["/pois/:id/audio/:lang<br/>POST multipart<br/>DELETE"]:::backend
        TTS["/pois/:id/tts/:lang<br/>POST"]:::backend
        TR["/translate<br/>POST"]:::backend
    end
    subgraph QRG["Mã QR in tại trạm"]
        PQR["/pois/:id/qrcodes<br/>GET · POST"]:::backend
        QR["/qrcodes<br/>GET<br/>DELETE /:id"]:::backend
    end
    subgraph TOURG["Tour"]
        TOURS["/tours<br/>GET · POST"]:::backend
        TOUR["/tours/:id<br/>GET · PUT<br/>DELETE"]:::backend
    end
    subgraph ANG["Thống kê"]
        AN["/analytics<br/>GET ?from&to&tour_id"]:::backend
    end
    ADM --> ACC
    ADM --> POIG
    ADM --> CONT
    ADM --> QRG
    ADM --> TOURG
    ADM --> ANG
    TR -.-> EXT["🌐 Dịch máy"]:::ext
    TTS -.-> EXT2["🌐 Google TTS"]:::ext
    style ACC fill:#F8FAFC,stroke:#CBD5E1
    style POIG fill:#F8FAFC,stroke:#CBD5E1
    style CONT fill:#F8FAFC,stroke:#CBD5E1
    style QRG fill:#F8FAFC,stroke:#CBD5E1
    style TOURG fill:#F8FAFC,stroke:#CBD5E1
    style ANG fill:#F8FAFC,stroke:#CBD5E1
    classDef backend fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef cms fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95
    classDef ext fill:#FFE4E6,stroke:#E11D48,stroke-width:2px,color:#881337
```

*Hình: Bản đồ 22 endpoint quản trị theo tài nguyên; ô gộp các phương thức trên cùng một đường dẫn*


| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/admin/me` | Quản trị viên đang đăng nhập |
| POST | `/admin/me/password` | `{current_password,new_password}` (mật khẩu mới ≥ 8 ký tự) → 204. Lỗi trả 400 kèm `details.current_password` hoặc `details.new_password` |
| GET | `/admin/pois?q=` | `{items:[{id,name,address,latitude,longitude,radius_m,priority,image_url,created_at,updated_at,languages:["vi","en"],audio_languages:["vi"],qr_count}]}`. `q` tìm theo tên và địa chỉ |
| POST | `/admin/pois` | Tạo POI (thân yêu cầu ở bên dưới) → 201 + POI đầy đủ |
| GET | `/admin/pois/:id` | POI + `translations[]` + `qrcodes[]` (mỗi mã có `content` = `NARR:<payload>`) |
| PUT | `/admin/pois/:id` | Cập nhật POI (cùng dạng thân yêu cầu). Ngôn ngữ không có trong thân yêu cầu sẽ bị xoá cùng audio của nó. File `image_url` nằm trong `/uploads` bị thay thế hoặc bị xoá trống sẽ bị xoá |
| DELETE | `/admin/pois/:id` | 204. Xoá luôn các bản dịch, file audio, file ảnh và mã QR của POI, và gỡ POI khỏi các tour. Nhật ký sử dụng đã có được giữ lại với `poi_id = NULL` |
| POST | `/admin/pois/:id/audio/:lang` | multipart, trường `audio` (mp3/m4a/aac/wav/ogg/webm, ≤ 15 MB) → POI. Thay thế audio cũ của ngôn ngữ đó (nếu có) |
| DELETE | `/admin/pois/:id/audio/:lang` | Gỡ audio → POI |
| POST | `/admin/pois/:id/tts/:lang` | Tạo file MP3 từ `narration_text` ĐÃ LƯU của ngôn ngữ đó (hoặc từ thân yêu cầu `{text}`) → POI với `audio_source:"tts"` |
| GET | `/admin/pois/:id/qrcodes` | `{items:[{id,poi_id,payload,label,content,created_at}]}` |
| POST | `/admin/pois/:id/qrcodes` | `{label?}` → 201 QR. `content` là chuỗi cần mã hoá vào mã QR in ra (`NARR:<payload>`) |
| GET | `/admin/qrcodes` | Mọi mã QR kèm `poi_name` |
| DELETE | `/admin/qrcodes/:id` | 204 |
| POST | `/admin/images` | multipart, trường `image` (jpg/png/webp) → 201 `{url}` để dùng làm `image_url` |
| POST | `/admin/translate` | `{text, source, target}` (văn bản ≤ 5000 ký tự) → `{text, provider}` |
| GET | `/admin/tours` | `{items:[{id,name,description,poi_count,created_at,updated_at}]}` |
| POST | `/admin/tours` | `{name, description?, poi_ids:[3,1,2]}` (thứ tự mảng = thứ tự tham quan, ≥ 1 POI, không trùng lặp, mọi POI phải tồn tại) → 201 |
| GET | `/admin/tours/:id` | `{id,name,description,created_at,updated_at,pois:[{id,name,latitude,longitude,visit_order}]}` |
| PUT | `/admin/tours/:id` | Cùng dạng thân yêu cầu với POST |
| DELETE | `/admin/tours/:id` | 204 |
| GET | `/admin/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD&tour_id=` | Báo cáo thống kê (analytics) (xem bên dưới). Mọi tham số đều không bắt buộc |

Mỗi thao tác tạo/cập nhật/xoá thành công đối với POI, bản dịch, audio, tour hoặc mã QR đều làm tăng `content_version`.

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart TB
    W["🖥️ Tạo / sửa / xoá<br/>POI, bản dịch, audio,<br/>tour, mã QR"]:::cms --> SVC["⚙️ poiService, tourService,<br/>qrService"]:::backend
    SVC --> OK{"Thành công?"}:::decision
    OK -- "Không" --> SAME["Phiên bản giữ nguyên"]:::neutral
    OK -- "Có" --> BUMP[("🗄️ meta.content_version + 1")]:::data
    BUMP --> V["GET /sync/version<br/>trả số mới"]:::backend
    V --> APP["📱 App thấy khác phiên bản<br/>→ GET /sync"]:::mobile
    classDef backend fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef cms fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95
    classDef data fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
    classDef decision fill:#FFF7ED,stroke:#EA580C,stroke-width:2px,color:#7C2D12
    classDef mobile fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
    classDef neutral fill:#F8FAFC,stroke:#94A3B8,stroke-width:1.5px,color:#334155
```

*Hình: Mọi thao tác ghi nội dung thành công làm tăng content_version, nhờ đó ứng dụng biết cần đồng bộ lại*


Thân yêu cầu tạo/cập nhật POI:
```json
{
  "name": "Bến Nhà Rồng", "address": "1 Nguyễn Tất Thành", "latitude": 10.7681, "longitude": 106.7068,
  "radius_m": 80, "priority": 10, "image_url": null,
  "translations": [
    { "language_code": "vi", "title": "Bến Nhà Rồng", "narration_text": "..." },
    { "language_code": "en", "title": "Nha Rong Wharf", "narration_text": "..." }
  ]
}
```
Quy tắc kiểm tra dữ liệu (UC3 E1): bắt buộc có tên; vĩ độ −90..90; kinh độ −180..180; `0 < radius_m ≤ 5000` (làm tròn thành số nguyên); `priority` là số nguyên 0..100 (mặc định 1); mỗi `language_code` phải được hỗ trợ và không trùng lặp; bắt buộc có `narration_text` tiếng Việt (`vi`). Các dòng bản dịch không có cả tiêu đề lẫn nội dung sẽ bị bỏ qua. Lỗi trả về `details` có khoá theo trường: `name`, `latitude`, `longitude`, `radius_m`, `priority`, `translations`, `translations.<i>.language_code`.

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart LR
    BODY(["Thân yêu cầu POI"]):::startend --> C1["name: bắt buộc"]:::neutral
    BODY --> C2["latitude −90..90<br/>longitude −180..180"]:::neutral
    BODY --> C3["0 < radius_m ≤ 5000"]:::neutral
    BODY --> C4["priority nguyên 0..100<br/>mặc định 1"]:::neutral
    BODY --> C5["language_code được hỗ trợ,<br/>không trùng"]:::neutral
    BODY --> C6["Có narration_text<br/>tiếng Việt"]:::neutral
    C1 & C2 & C3 & C4 & C5 & C6 --> ANY{"Có lỗi nào?"}:::decision
    ANY -- "Có" --> ERR["400<br/>VALIDATION_ERROR<br/>details theo từng trường"]:::bad
    ANY -- "Không" --> SAVE["⚙️ Lưu POI + bản dịch<br/>trong một transaction"]:::ok
    classDef bad fill:#FEE2E2,stroke:#DC2626,stroke-width:2px,color:#7F1D1D
    classDef decision fill:#FFF7ED,stroke:#EA580C,stroke-width:2px,color:#7C2D12
    classDef neutral fill:#F8FAFC,stroke:#94A3B8,stroke-width:1.5px,color:#334155
    classDef ok fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef startend fill:#1E3A8A,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
```

*Hình: Kiểm tra dữ liệu POI (UC3 E1): mọi quy tắc được kiểm tra cùng lúc, lỗi gom vào details rồi trả một lần*


Báo cáo thống kê `GET /admin/analytics`:
```json
{
  "filters": { "from": "...", "to": "...", "tour_id": null },
  "has_data": true,
  "summary": { "plays": 1000, "sessions": 400, "avg_listen_seconds": 51.3, "total_listen_seconds": 51300 },
  "by_method": [{ "method": "geofence", "plays": 650 }],
  "by_language": [{ "language": "vi", "plays": 380 }],
  "per_poi": [{ "poi_id": 1, "name": "...", "latitude": 10.7, "longitude": 106.7, "plays": 210, "avg_listen_seconds": 50.2, "sessions": 190 }],
  "daily": [{ "date": "2026-10-01", "plays": 30 }],
  "hourly": [{ "hour": 18, "plays": 80 }],
  "heatmap": [{ "lat": 10.7605, "lng": 106.7036, "weight": 12 }],
  "routes": [{ "route": 1, "points": [[10.76, 106.70], [10.761, 106.701]] }]
}
```
- `to` truyền dạng ngày (`YYYY-MM-DD`) thì bao gồm trọn ngày đó. `from` phải sớm hơn `to`; ngày không hợp lệ hoặc `tour_id` không tồn tại trả về 400.
- Khi có `tour_id`, thống kê lượt phát chỉ tính các POI thuộc tour đó; bản đồ nhiệt (heatmap) và lộ trình dùng khung bao các POI của tour, nới rộng khoảng 300 m (mẫu vị trí không gắn với POI).
- `per_poi` được sắp theo số lượt phát (giảm dần), tức là danh sách các điểm được nghe nhiều nhất.
- `heatmap` gộp các mẫu vào ô ~11 m (tối đa 5000 ô). `routes` trả về tối đa 30 phiên gần nhất có ít nhất hai mẫu, được đánh số tuần tự; không bao giờ trả về `session_id`.
- `has_data=false` → CMS hiển thị "Không có dữ liệu" (UC5 E1). Ngày và giờ trong `daily`/`hourly` tính theo UTC.

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart TD
    Q(["GET /admin/analytics<br/>?from&to&tour_id"]):::startend --> F{"Ngày hợp lệ, from < to,<br/>tour tồn tại?"}:::decision
    F -- "Không" --> E400["400<br/>VALIDATION_ERROR"]:::bad
    F -- "Có" --> T{"Có tour_id?"}:::decision
    T -- "Có" --> TF["Lượt phát: chỉ POI của tour<br/>Vị trí: khung bao POI ± ~300 m"]:::backend
    T -- "Không" --> ALL["Toàn bộ dữ liệu<br/>trong khoảng ngày"]:::backend
    TF --> SEL["🗄️ Chỉ truy vấn SELECT<br/>usage_log, location_log"]:::data
    ALL --> SEL
    SEL --> OUT1["summary · by_method<br/>by_language · per_poi"]:::backend
    SEL --> OUT2["daily · hourly<br/>theo UTC"]:::backend
    SEL --> OUT3["heatmap: ô ~11 m, ≤ 5000 ô<br/>routes: ≤ 30 phiên<br/>không trả session_id"]:::backend
    OUT1 & OUT2 & OUT3 --> HD{"has_data?"}:::decision
    HD -- "false" --> NO["🖥️ CMS: Không có dữ liệu"]:::warn
    HD -- "true" --> YES["🖥️ CMS: KPI, biểu đồ, bản đồ"]:::ok
    classDef backend fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef bad fill:#FEE2E2,stroke:#DC2626,stroke-width:2px,color:#7F1D1D
    classDef data fill:#F1F5F9,stroke:#475569,stroke-width:2px,color:#0F172A
    classDef decision fill:#FFF7ED,stroke:#EA580C,stroke-width:2px,color:#7C2D12
    classDef ok fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef startend fill:#1E3A8A,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef warn fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F
```

*Hình: Cách backend dựng báo cáo thống kê từ bộ lọc tới các khối dữ liệu trả về*

