# Sơ đồ vận hành và hướng dẫn tham gia hệ thống

**Phiên bản tài liệu:** 1.0 (20/10/2026)
**Tài liệu liên quan:** `00-PRD.md`, `05-user-guide.md` (hướng dẫn sử dụng đầy đủ), `04-installation.md` (cài đặt)

Tài liệu này dành cho người mới: hệ thống chạy thế nào, ai làm việc gì, và muốn bắt đầu dùng thì làm những bước nào. Bản ảnh của hai sơ đồ chính nằm trong `diagrams/` để dán vào báo cáo Word.

---

## 1. Tham gia hệ thống

Có hai loại người dùng và cách tham gia khác nhau:

- **Du khách, hành khách xe buýt:** chỉ cần cài app. Không đăng ký, không đăng nhập.
- **Quản trị viên:** phải được nhóm kỹ thuật cấp tài khoản. Không có trang tự đăng ký.

![Sơ đồ tham gia hệ thống](diagrams/van-hanh-01-tham-gia.png)

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart LR
    subgraph QTV["Quản trị viên (cần tài khoản)"]
        direction LR
        A1["Nhóm kỹ thuật<br/>cài máy chủ"]:::backend --> A2["Tạo admin đầu tiên<br/>(lệnh seed)"]:::backend --> A3["Giao tên đăng nhập<br/>+ mật khẩu"]:::actor --> A4["🖥️ Đăng nhập CMS&emsp;"]:::cms --> A5["Đổi mật khẩu<br/>(≥ 8 ký tự)"]:::cms --> A6(["Vào trang Tổng quan"]):::startend
    end
    subgraph DK["Du khách (không cần tài khoản)"]
        direction LR
        B1["📱 Cài app"]:::mobile --> B2["Mở lần đầu khi có mạng<br/>(tải nội dung về máy)"]:::mobile --> B3{"Cho phép<br/>vị trí?"}:::decision
        B3 -->|Có| B4["🛰️ Tự phát khi<br/>đi tới gần điểm"]:::ok
        B3 -->|Không| B5["Nghe thủ công:<br/>quét QR, bấm bản đồ"]:::warn
        B4 --> B6["Chọn ngôn ngữ<br/>(mặc định theo máy)"]:::mobile
        B5 --> B6
        B6 --> B7(["🎧 Bắt đầu nghe"]):::startend
    end
    style QTV fill:#F8FAFC,stroke:#CBD5E1
    style DK fill:#F8FAFC,stroke:#CBD5E1
    classDef actor fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F
    classDef mobile fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
    classDef cms fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95
    classDef backend fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef decision fill:#FFF7ED,stroke:#EA580C,stroke-width:2px,color:#7C2D12
    classDef startend fill:#1E3A8A,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef ok fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef warn fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F
```

*Hình: Hai cách tham gia hệ thống: quản trị viên cần tài khoản do nhóm kỹ thuật cấp, du khách chỉ cần cài app.*

### 1.1 Du khách, hành khách xe buýt

| Bước | Việc cần làm | Ghi chú |
|---|---|---|
| 1 | Cài app lên điện thoại | App chưa có trên Google Play, App Store. Khi demo, cài theo mục 1.3 |
| 2 | Mở app lần đầu khi có mạng | App tải toàn bộ bài thuyết minh về máy, sau đó mất mạng vẫn nghe được. Mở khi chưa có mạng thì app báo chưa có dữ liệu, chỉ cần bật mạng một lần |
| 3 | Cho phép truy cập vị trí | Đồng ý: app tự phát khi tới gần điểm. Từ chối: app giải thích lý do, có nút *Mở Cài đặt* và *Thử lại*; vẫn quét QR và bấm nghe trên bản đồ được |
| 4 | Kiểm tra ngôn ngữ | Mặc định theo ngôn ngữ điện thoại nếu hỗ trợ, không thì tiếng Việt. Đổi ở *Cài đặt → Ngôn ngữ thuyết minh* (Việt, Anh, Trung, Hàn, Nhật, Pháp) |
| 5 | Bắt đầu nghe | Đi bộ qua các điểm để app tự phát; hoặc mở tab *Quét QR* quét mã ở trạm; hoặc mở tab *Tour*, chọn tour, bấm *Đi theo tour này* |
| 6 | (Tuỳ chọn) Nghe khi tắt màn hình | Bật *Tiếp tục khi chạy nền*, cho vị trí ở chế độ *Luôn luôn*; Android nên tắt tối ưu pin cho app. Cần bản cài riêng, Expo Go không hỗ trợ |

**Quyền riêng tư:** app chỉ gửi lượt nghe ẩn danh (điểm nào, ngôn ngữ gì, nghe bao lâu, mở bằng cách nào) kèm một mã phiên ngẫu nhiên đổi mỗi lần mở app. Vị trí làm tròn khoảng 11 m. Tắt hẳn ở *Cài đặt → Gửi dữ liệu ẩn danh*.

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
journey
    title Du khách bắt đầu dùng app
    section Chuẩn bị
      Cài app: 3: Du khách
      Mở lần đầu khi có mạng: 4: Du khách, App
      Cho phép vị trí: 3: Du khách
      Kiểm tra ngôn ngữ: 4: Du khách
    section Nghe
      Đi tới gần điểm, tự phát: 5: Du khách, App
      Quét QR ở trạm: 5: Du khách, App
      Đi theo tour: 5: Du khách, App
    section Tuỳ chọn
      Bật chạy nền: 3: Du khách
```

*Hình: Hành trình du khách từ lúc cài app đến lúc nghe (điểm 1–5: mức thuận tiện).*

### 1.2 Quản trị viên nội dung

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart LR
    subgraph KT["⚙️ Nhóm kỹ thuật"]
        direction TB
        K1["Cài Node ≥ 22.13<br/>npm ci --omit=dev"]:::backend --> K2["NODE_ENV&emsp;&emsp;<br/>JWT_SECRET&emsp;&emsp;"]:::backend --> K3["ADMIN_PASSWORD=…&emsp;&emsp;<br/>npm run seed (một lần)"]:::warn --> K4["Gửi tài khoản"]:::backend
    end
    subgraph QT["👤 Quản trị viên"]
        direction TB
        Q1["Đăng nhập"]:::cms --> Q2["Đổi mật khẩu<br/>≥ 8 ký tự"]:::cms --> Q3["Tổng quan<br/>Việc cần làm"]:::cms --> Q4["Làm việc<br/>theo mục 2"]:::cms --> Q5(["Đăng xuất"]):::startend
    end
    KT --> QT
    QT -. "quên mật khẩu,<br/>thêm quản trị viên" .-> KT
    style KT fill:#F8FAFC,stroke:#CBD5E1
    style QT fill:#F8FAFC,stroke:#CBD5E1
    classDef cms fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95
    classDef backend fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef startend fill:#1E3A8A,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef warn fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F
```

*Hình: Phân việc giữa nhóm kỹ thuật và quản trị viên khi tham gia hệ thống.*

| Bước | Việc cần làm | Ghi chú |
|---|---|---|
| 1 | Nhận tài khoản | Nhóm kỹ thuật gửi địa chỉ trang web, tên đăng nhập, mật khẩu ban đầu |
| 2 | Đăng nhập | Nhập *Tên đăng nhập*, *Mật khẩu*, bấm *Đăng nhập*. Chạy thử trên máy: `http://localhost:5173`, tài khoản mẫu `admin` / `admin123` |
| 3 | Đổi mật khẩu ngay | Bấm tên mình ở cuối thanh menu → *Đổi mật khẩu*; mật khẩu mới từ 8 ký tự |
| 4 | Xem trang Tổng quan | Danh sách *Việc cần làm* cho biết điểm thiếu audio, thiếu ngôn ngữ, chưa có mã QR |
| 5 | Làm việc theo sơ đồ ở mục 2 | Nhập điểm, dịch, tạo giọng đọc, tạo tour và mã QR, theo dõi thống kê |
| 6 | Đăng xuất khi xong | Nút *Đăng xuất* cuối thanh menu. Phiên tự hết sau 8 giờ, đăng nhập lại sẽ quay về đúng trang đang làm |

**Gặp sự cố:**

- Sai mật khẩu 20 lần trong 15 phút thì bị khoá đăng nhập 15 phút.
- Quên mật khẩu: CMS chưa có chức năng lấy lại, nhờ nhóm kỹ thuật đặt lại.
- Cần thêm quản trị viên thứ hai: CMS chưa có trang thêm tài khoản, hiện phải nhờ nhóm kỹ thuật thêm vào cơ sở dữ liệu. Chức năng này nằm trong kế hoạch bản 2 (`00-PRD.md` §11).

**Dành cho nhóm kỹ thuật, tạo tài khoản đầu tiên** (chi tiết ở `04-installation.md` §4.2):

1. Cài Node.js ≥ 22.13, chép thư mục `backend/`, chạy `npm ci --omit=dev`.
2. Đặt biến môi trường `NODE_ENV=production` và `JWT_SECRET` ngẫu nhiên dài ít nhất 32 byte.
3. Tạo admin: `ADMIN_PASSWORD=<mật khẩu mạnh> npm run seed`. Tên đăng nhập là `admin`.
4. Gửi tài khoản cho quản trị viên, nhắc đổi mật khẩu ở lần đăng nhập đầu.

> **Cảnh báo:** `npm run seed` xoá sạch dữ liệu cũ rồi mới tạo lại. Chỉ chạy một lần lúc cài, không bao giờ chạy lại trên máy chủ đang dùng thật.

### 1.3 Cài app để demo ở lớp

1. Điện thoại cài **Expo Go** (bản cho SDK 58), dùng chung Wi-Fi với laptop.
2. Chạy máy chủ trên laptop: `cd backend && npm install && npm run seed && npm start`
3. Mở cửa sổ terminal khác: `cd mobile && npm install && npx expo start`
4. Dùng Expo Go quét mã QR hiện trong terminal.
5. App không kết nối được máy chủ thì vào *Cài đặt → Máy chủ*, nhập `http://<IP laptop>:4000`. Xem IP trên macOS bằng `ipconfig getifaddr en0`.

Wi-Fi trường thường chặn các máy nói chuyện với nhau; gặp vậy thì phát hotspot từ điện thoại. Expo Go không chạy GPS nền, muốn có thì làm bản cài riêng (`04-installation.md` §3.4).

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
sequenceDiagram
    participant L as Laptop (backend :4000)
    participant M as Laptop (Metro / Expo)
    participant P as Điện thoại (Expo Go)
    L->>L: npm run seed, npm start
    M->>M: npx expo start, hiện mã QR
    P->>M: Quét mã QR, tải ứng dụng
    P->>L: Đồng bộ nội dung qua IP LAN :4000
    alt Không kết nối được
        P->>P: Cài đặt → Máy chủ, nhập http://IP-laptop:4000
        Note over L,P: Wi-Fi trường chặn → dùng hotspot điện thoại
    end
    L-->>P: Điểm, tour, mã QR
```

*Hình: Trình tự dựng demo trên lớp giữa laptop và điện thoại.*

---

## 2. Sơ đồ vận hành

Ba làn tương ứng ba bên: quản trị viên làm việc trên CMS, máy chủ chạy tự động, du khách dùng app. Đường nét đứt là vòng phản hồi: xem thống kê, thấy điểm nào ít người nghe thì quay lại sửa bài.

![Sơ đồ vận hành](diagrams/van-hanh-02-so-do-lan.png)

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
sequenceDiagram
    participant A as Quản trị viên (CMS)
    participant B as Máy chủ (tự động)
    participant C as Du khách (app)
    A->>B: Đăng nhập
    B-->>A: Kiểm tra tài khoản, cấp phiên 8 giờ
    A->>B: Nhập điểm: ghim, bán kính, bài tiếng Việt
    B-->>A: Lưu điểm, báo lỗi nếu thiếu
    A->>B: Dịch tự động, tạo giọng đọc
    B->>B: Dịch 5 ngôn ngữ, tạo file MP3
    A->>A: Tạo tour, in mã QR dán ở trạm
    C->>B: Mở app, hỏi bản mới (5 phút/lần)
    B-->>C: Gửi bản nội dung mới, app lưu trong máy
    C->>C: Nghe thuyết minh khi vào vùng GPS hoặc quét QR
    C->>B: Gửi lượt nghe
    B->>B: Ghi lượt nghe ẩn danh, tổng hợp theo điểm, ngày, giờ, ngôn ngữ
    B-->>A: Hiện lên CMS: biểu đồ, bản đồ nhiệt, Excel, PDF
    Note over A,B: Vòng phản hồi: điểm ít người nghe thì quay lại sửa bài
```

*Hình: Sơ đồ vận hành theo trình tự giữa ba bên: quản trị viên (CMS), máy chủ, du khách (app); ghi chú cuối là vòng phản hồi từ thống kê về sửa bài.*

| Giai đoạn | Bước | Ai làm | Diễn giải |
|---|---|---|---|
| 1. Chuẩn bị nội dung | Đăng nhập | Quản trị viên, máy chủ | Máy chủ kiểm tra mật khẩu, cấp phiên làm việc 8 giờ |
| | Nhập điểm | Quản trị viên | Cắm ghim trên bản đồ, đặt bán kính kích hoạt (thường 50–150 m), mức ưu tiên 0–100, viết bài tiếng Việt |
| | Lưu | Máy chủ | Kiểm tra dữ liệu; thiếu toạ độ, bán kính bằng 0 hoặc chưa có bài tiếng Việt thì báo lỗi ngay dưới ô nhập |
| | Dịch, tạo giọng | Quản trị viên, máy chủ | Bấm *Dịch tự động từ tiếng Việt*, đọc lại bản dịch; bấm *Tạo giọng đọc* để máy chủ tạo file MP3, hoặc tải file ghi âm lên |
| | Tour, mã QR | Quản trị viên | Ghép điểm thành tour; tạo mã QR cho từng trạm, in khổ A5 trở lên, ép plastic, dán ở trạm |
| 2. Du khách sử dụng | Đồng bộ | App, máy chủ | App hỏi phiên bản nội dung khi mở, mỗi 5 phút, khi có mạng lại; chỉ tải lại khi có bản mới |
| | Nghe | Du khách | Vào vùng của điểm thì tự phát; quét QR thì phát ngay. Cùng một điểm không phát lại trong 10 phút |
| | Ghi lượt nghe | App, máy chủ | App lưu lượt nghe trong máy, có mạng thì gửi lên theo đợt |
| 3. Đánh giá | Tổng hợp, xem thống kê | Máy chủ, quản trị viên | Xem điểm được nghe nhiều nhất, thời gian nghe trung bình, ngôn ngữ, giờ cao điểm, bản đồ nhiệt; xuất Excel hoặc PDF |
| | Sửa nội dung | Quản trị viên | Điểm ít người nghe hoặc nghe rất ngắn thì sửa bài, chỉnh bán kính, thêm mã QR |

---

## 3. Các mục trên thanh menu CMS

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart TB
    M["🖥️ Thanh menu CMS&emsp;"]:::cms
    M --> A["Tổng quan<br/>việc cần làm"]:::cms
    M --> B["Điểm thuyết minh<br/>thêm, sửa, dịch, giọng đọc"]:::cms
    M --> C["Mã QR&emsp;<br/>tạo, in bảng mã"]:::cms
    M --> D["Tour tham quan<br/>ghép điểm thành lộ trình"]:::cms
    M --> E["Thống kê<br/>biểu đồ, Excel, PDF&emsp;"]:::cms
    A -. "bấm việc cần làm" .-> B
    B -. "Tạo mã QR trong trang điểm" .-> C
    B -. "điểm dùng trong tour" .-> D
    classDef cms fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px,color:#4C1D95
```

*Hình: Năm mục trên thanh menu CMS và liên hệ giữa chúng.*

| Mục | Dùng để | Thao tác chính |
|---|---|---|
| Tổng quan | Xem nhanh việc cần làm | Số điểm, tour, mã QR; số liệu 7 ngày; danh sách *Việc cần làm* (bấm vào là tới thẳng điểm cần sửa) |
| Điểm thuyết minh | Thêm, sửa, xoá địa điểm và bài thuyết minh | *Thêm điểm* → cắm ghim → viết bài tiếng Việt → *Dịch tự động từ tiếng Việt* → lưu → *Tạo giọng đọc* hoặc tải file ghi âm |
| Mã QR | Mã dán ở trạm xe buýt | Trong trang điểm: nhập tên trạm, *Tạo mã QR*. Ở mục Mã QR: chọn mã, *In bảng mã* (4 mã mỗi tờ A4). Quét thử trước khi dán |
| Tour tham quan | Ghép nhiều điểm thành lộ trình | *Tạo tour*, chọn điểm, kéo thả để sắp thứ tự; tour phải có ít nhất 1 điểm |
| Thống kê | Biết điểm nào được nghe, nghe bao lâu | Chọn 7, 30 hoặc 90 ngày, lọc theo tour; xem biểu đồ, bản đồ nhiệt; xuất Excel hoặc PDF |

## 4. Câu hỏi thường gặp

```mermaid
%%{init: {"theme":"base","fontFamily":"Helvetica Neue, Arial, sans-serif","themeVariables":{"fontFamily":"Helvetica Neue, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFF6FF","primaryBorderColor":"#3B82F6","primaryTextColor":"#0F172A","lineColor":"#64748B","secondaryColor":"#F0FDF4","tertiaryColor":"#FFFFFF","clusterBkg":"#F8FAFC","clusterBorder":"#CBD5E1","edgeLabelBackground":"#FFFFFF","noteBkgColor":"#FEF9C3","noteBorderColor":"#EAB308","actorBkg":"#DBEAFE","actorBorder":"#2563EB","actorTextColor":"#1E3A8A","signalColor":"#475569","signalTextColor":"#0F172A","labelBoxBkgColor":"#F1F5F9","labelBoxBorderColor":"#94A3B8","activationBkgColor":"#E0F2FE","activationBorderColor":"#0284C7","sequenceNumberColor":"#FFFFFF","pie1":"#16A34A","pie2":"#F59E0B","pie3":"#94A3B8","pie4":"#DC2626","pie5":"#2563EB","pie6":"#7C3AED","pieStrokeColor":"#FFFFFF","pieSectionTextColor":"#FFFFFF","quadrant1Fill":"#FEE2E2","quadrant2Fill":"#FEF3C7","quadrant3Fill":"#DCFCE7","quadrant4Fill":"#FEF3C7","quadrantPointFill":"#1E3A8A","quadrantPointTextFill":"#0F172A","git0":"#1E3A8A","gitBranchLabel0":"#FFFFFF","cScale0":"#DBEAFE","cScale1":"#DCFCE7","cScale2":"#EDE9FE","cScale3":"#FEF3C7","cScale4":"#FFE4E6","cScale5":"#E0F2FE","cScale6":"#F1F5F9"},"flowchart":{"curve":"basis","padding":16,"nodeSpacing":40,"rankSpacing":50},"sequence":{"showSequenceNumbers":true,"mirrorActors":false}}}%%
flowchart TB
    A(["🛰️ Vào vùng của điểm"]):::startend --> B{"Đang phát<br/>bài khác?"}:::decision
    B -->|Có| X["Bỏ qua điểm mới<br/>bấm trên bản đồ để nghe"]:::warn
    B -->|Không| C{"Nhiều điểm<br/>cùng lúc?"}:::decision
    C -->|Có| D["Ưu tiên cao hơn,<br/>bằng nhau thì gần hơn"]:::mobile
    C -->|Không| E{"Có bản ngôn ngữ<br/>đã chọn?"}:::decision
    D --> E
    E -->|Không| F["Phát bản tiếng Việt<br/>và báo người nghe"]:::warn
    E -->|Có| G{"Có file audio?"}:::decision
    F --> G
    G -->|Có| H(["🎧 Phát file audio"]):::ok
    G -->|Không| I(["🎧 Điện thoại đọc<br/>bằng giọng máy"]):::ok
    classDef mobile fill:#DBEAFE,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
    classDef decision fill:#FFF7ED,stroke:#EA580C,stroke-width:2px,color:#7C2D12
    classDef startend fill:#1E3A8A,stroke:#1E3A8A,stroke-width:2px,color:#FFFFFF
    classDef ok fill:#DCFCE7,stroke:#16A34A,stroke-width:2px,color:#14532D
    classDef warn fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F
```

*Hình: Cách app chọn điểm và nguồn âm thanh, tóm tắt các câu hỏi thường gặp.*

- **Sửa xong sao điện thoại chưa thấy?** App lấy bản mới khi mở, mỗi 5 phút một lần, hoặc khi có mạng trở lại.
- **Chưa dịch ngôn ngữ đó thì sao?** App phát bản tiếng Việt và báo cho người nghe. Chưa có file audio thì điện thoại tự đọc bằng giọng máy.
- **Hai điểm gần nhau thì phát cái nào?** Điểm có mức ưu tiên cao hơn; bằng nhau thì điểm gần hơn.
- **Đang phát mà đi vào điểm khác?** Điểm mới bị bỏ qua để không cắt ngang. Muốn nghe thì bấm vào điểm đó trên bản đồ.
