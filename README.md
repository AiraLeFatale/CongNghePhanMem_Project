# CongNghePhanMem_Project

# Hệ thống thuyết minh tự động đa ngôn ngữ

*Multilingual Automatic Narration System*

Khách du lịch (tourist) và hành khách xe buýt (bus passenger) tại Quận 4, TP. Hồ Chí Minh (các phường Khánh Hội, Vĩnh Hội, Xóm Chiếu) được nghe thuyết minh (narration) tự động bằng ngôn ngữ của mình về các điểm tham quan (POI) ở gần. Thuyết minh bắt đầu khi người dùng đi vào bán kính (radius) GPS của một điểm hoặc quét mã QR tại trạm xe buýt (bus stop). Quản trị viên nội dung (content administrator) quản lý điểm tham quan, bản dịch (translation), audio, tour và mã QR trên CMS web, đồng thời xem thống kê (analytics) sử dụng ẩn danh.

| Thành phần | Thư mục | Công nghệ |
|---|---|---|
| Backend API (3 lớp) | [`backend/`](backend/) | Node.js ≥ 22.13, Express 5, SQLite (`node:sqlite`), JWT |
| CMS web | [`cms/`](cms/) | Vite, React, TypeScript, Leaflet, Chart.js |
| Ứng dụng di động | [`mobile/`](mobile/) | Expo SDK 58 (React Native, TypeScript), SQLite ngoại tuyến (offline) |
| Tài liệu báo cáo | [`docs/`](docs/) | SRS, thiết kế, kế hoạch kiểm thử (test plan), cài đặt, hướng dẫn sử dụng, API |

Ca sử dụng (use case) được mô tả trong tài liệu Đặc tả ca sử dụng (Focused Use Cases UC1–UC5, v1.0, 20/09/2026).

## Bắt đầu nhanh

```bash
# 1. Backend: http://localhost:4000/api
cd backend && npm install && npm run seed:demo && npm run dev

# 2. CMS: http://localhost:5173  (đăng nhập admin / admin123, chỉ dùng cho demo trên máy)
cd cms && npm install && npm run dev

# 3. Ứng dụng di động: dùng Expo Go quét mã QR mà Expo hiển thị
cd mobile && npm install && npx expo start
```

Trên điện thoại thật, đặt địa chỉ máy chủ trong màn hình **Cài đặt** của ứng dụng (hoặc biến `EXPO_PUBLIC_API_URL`) thành IP LAN của máy tính, ví dụ `http://192.168.1.10:4000`. Khi demo trên lớp mà không cần đi bộ, bật chế độ **Mô phỏng vị trí** rồi chạm vào bản đồ hoặc cho ứng dụng tự đi bộ theo một tour. Chi tiết: [`docs/04-installation.md`](docs/04-installation.md).

## Kiểm thử

| Thành phần | Lệnh | Kết quả (18/10/2026) |
|---|---|---|
| Backend | `cd backend && npm test` | Đạt 43/43 |
| CMS | `cd cms && npm test` | Đạt 36/36, kèm một lượt chạy end-to-end trên trình duyệt với API thật |
| Mobile | `cd mobile && npx jest` | Đạt 62/62 kiểm thử đơn vị (unit test); chưa chạy trên thiết bị thật |

---

# Sơ đồ thiết kế ban đầu

## 1. Tổng quan hệ thống (sơ đồ thành phần)

```mermaid
flowchart TB
    QR["Mã QR<br/>Trạm xe buýt"]
    MOBILE["Ứng dụng di động<br/>Geofence, QR, phát audio"]
    CMS["CMS web<br/>Công cụ quản trị nội dung"]
    BACKEND["Backend API<br/>Nội dung, đồng bộ, thống kê"]
    EXT["API bên ngoài<br/>Dịch, TTS"]
    DB[("Cơ sở dữ liệu<br/>POI, người dùng, nhật ký")]
    FS[("Lưu trữ tệp<br/>File audio")]

    QR -.-> MOBILE
    MOBILE <--> BACKEND
    CMS --> BACKEND
    BACKEND --> EXT
    BACKEND --> DB
    BACKEND --> FS
```

## 2. Bên trong ứng dụng di động

```mermaid
flowchart LR
    subgraph MOBILE["Ứng dụng di động"]
        LOC["Dịch vụ vị trí<br/>GPS chạy nền"]
        QR["Trình quét QR<br/>Camera"]
        GEO["Bộ máy geofence<br/>Bán kính, độ ưu tiên"]
        NAR["Bộ máy thuyết minh<br/>TTS, hàng đợi audio"]
        UI["Giao diện (UI/UX)<br/>Bản đồ và cài đặt"]
        CONTENT[("Lớp nội dung<br/>SQLite, ngoại tuyến")]
    end
    API["Backend API<br/>Đồng bộ POI, audio"]

    LOC --> GEO
    GEO --> NAR
    QR --> NAR
    CONTENT --> GEO
    CONTENT --> UI
    CONTENT --> NAR
    CONTENT <--> API
```

## 3. Bên trong Backend (3 lớp)

```mermaid
flowchart TB
    MOBILE["Ứng dụng di động<br/>Geofence, QR, phát audio"]
    CMS["CMS web<br/>Công cụ quản trị nội dung"]

    subgraph BACKEND["Backend (3 lớp)"]
        CTRL["Lớp điều khiển (controller)<br/>REST endpoint, kiểm tra dữ liệu"]
        SVC["Lớp nghiệp vụ (service)<br/>Logic nghiệp vụ, quy tắc geofence"]
        REPO["Lớp truy cập dữ liệu (repository)<br/>Truy cập dữ liệu, truy vấn"]
    end

    TR["API dịch"]
    TTS["API TTS"]
    DB[("Cơ sở dữ liệu<br/>POI, người dùng, nhật ký")]
    FS[("Lưu trữ tệp<br/>File audio")]

    MOBILE --> CTRL
    CMS --> CTRL
    CTRL --> SVC
    SVC --> REPO
    SVC --> TR
    SVC --> TTS
    REPO --> DB
    REPO --> FS
```

## 4. Bên trong CMS web

```mermaid
flowchart LR
    subgraph CMS["CMS web"]
        LOGIN["Đăng nhập<br/>Xác thực quản trị viên"]
        POI["Quản lý POI<br/>Toạ độ, audio, bản dịch"]
        TOUR["Quản lý tour<br/>Lộ trình POI có thứ tự"]
        QRGEN["Tạo mã QR<br/>Gắn QR với POI"]
        DASH["Bảng thống kê<br/>Biểu đồ, bản đồ nhiệt, xuất file"]
    end
    API["Backend API<br/>REST endpoint"]

    LOGIN --> API
    POI --> API
    TOUR --> API
    QRGEN --> API
    DASH --> API
```

## 5. Sơ đồ triển khai

```mermaid
flowchart TB
    subgraph PHONE["Điện thoại người dùng"]
        APP["Ứng dụng di động"]
        SQLITE[("SQLite<br/>Nội dung ngoại tuyến")]
    end
    subgraph ADMIN["Máy tính quản trị"]
        BROWSER["Trình duyệt<br/>CMS web"]
    end
    STOP["Mã QR<br/>Trạm xe buýt"]
    subgraph SERVER["Máy chủ ứng dụng"]
        API["Backend API<br/>3 lớp"]
    end
    DB[("Máy chủ cơ sở dữ liệu")]
    FS[("Lưu trữ tệp<br/>File audio")]
    EXT["API bên ngoài<br/>Dịch, TTS"]

    STOP -.->|"quét bằng camera"| APP
    APP --- SQLITE
    APP <-->|HTTPS| API
    BROWSER -->|HTTPS| API
    API --> DB
    API --> FS
    API --> EXT
```

## 6. ERD

```mermaid
erDiagram
    ADMIN_USER {
        int id PK
        string username
        string password_hash
    }
    POI {
        int id PK
        string name
        float latitude
        float longitude
        int radius_m
        int priority
    }
    POI_TRANSLATION {
        int id PK
        int poi_id FK
        string language_code
        text narration_text
        string audio_url
    }
    QR_CODE {
        int id PK
        int poi_id FK
        string payload
    }
    TOUR {
        int id PK
        string name
        text description
    }
    TOUR_POI {
        int tour_id PK, FK
        int poi_id PK, FK
        int visit_order
    }
    USAGE_LOG {
        int id PK
        int poi_id FK
        string session_id
        string trigger_method
        string language_code
        datetime played_at
        int listen_seconds
    }
    LOCATION_LOG {
        int id PK
        string session_id
        float latitude
        float longitude
        datetime recorded_at
    }

    ADMIN_USER ||--o{ POI : "quản lý"
    ADMIN_USER ||--o{ TOUR : "quản lý"
    POI ||--o{ POI_TRANSLATION : "có"
    POI ||--o{ QR_CODE : "gắn với"
    TOUR ||--|{ TOUR_POI : "gồm"
    POI ||--o{ TOUR_POI : "thuộc"
    POI ||--o{ USAGE_LOG : "kích hoạt"
```
