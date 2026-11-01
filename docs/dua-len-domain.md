# Đưa website lên tên miền công khai

Mục tiêu: người khác mở `https://<tên-miền>` từ **mạng bất kỳ** (4G, nhà riêng, nước ngoài)
mà không cần cài gì, không cần chung Wi-Fi với máy bạn.

Cách làm trong tài liệu này:

```
Người xem ──https──> Cloudflare (DNS + HTTPS + tunnel)
                              │  đường hầm do máy bạn tự mở ra
                              ▼
                     Máy bạn: backend cổng 4000
                     (web/ + web/admin/ + SQLite)
```

- **DigitalPlat** chỉ cấp **tên miền** và trỏ nameserver — không host website.
- **Cloudflare** giữ DNS, cấp HTTPS và tạo **Tunnel** (đường hầm) về máy bạn.
- **Máy bạn** vẫn là nơi chạy server. Máy tắt / ngủ / mất mạng → website offline.

> Không cần mở cổng router, không cần IP tĩnh, vẫn chạy được sau CGNAT của nhà mạng.
> Cloudflare Tunnel + DNS + HTTPS đều nằm trong gói Free.

---

## Trạng thái hiện tại trên máy này (đã làm xong)

Phần dưới đây ghi lại **đúng những gì đã thiết lập**, để sau này xem lại hoặc làm lại từ đầu.

| Hạng mục | Giá trị |
|---|---|
| Tên miền | `cnpm.dpdns.org` (DigitalPlat, hạn 27/10/2027) |
| Nameserver | `ashton.ns.cloudflare.com`, `karina.ns.cloudflare.com` |
| Cloudflare account | `Tuanhungpham0987@gmail.com` — gói Free |
| Tunnel name / id | `cnpm-duan` / `227e858e-f1ce-....` (id đầy đủ trong `cloudflare/config.yml`) |
| File cấu hình tunnel | `cloudflare/config.yml` (đã gitignore) |
| Khóa tunnel | `C:\Users\ADMIN\.cloudflared\227e858e-....json` + `cert.pem` |
| DNS route | CNAME `cnpm.dpdns.org` → `227e858e-....cfargotunnel.com` (proxied) |
| Website | <https://cnpm.dpdns.org> |
| CMS | <https://cnpm.dpdns.org/admin> |

Vì đã có `cloudflare/config.yml`, `CHAY-CONG-KHAI.bat` chạy theo **chế độ cấu hình**
(`cloudflared tunnel --config ... run cnpm-duan`), **không hỏi token** nữa.
Chỉ khi không có `config.yml` (máy mới) script mới hỏi token như mục 3–4 bên dưới.

Mật khẩu CMS, tunnel id, khóa… nằm trong `cloudflare/THONG-TIN-DANG-NHAP.txt` (không commit).

---

## 0. Chuẩn bị

| Cần | Ghi chú |
|---|---|
| Tài khoản DigitalPlat | Đăng ký miễn phí tại <https://dash.domain.digitalplat.org/auth/register> |
| Tài khoản Cloudflare | Miễn phí tại <https://dash.cloudflare.com/sign-up> |
| Node.js trên máy | Đã có nếu chạy được `CHAY-WEBSITE.bat` |
| `cloudflared` | Đã cài sẵn trong máy này (winget `Cloudflare.cloudflared`) |

Tài liệu này dùng tên miền thật của dự án: **`cnpm.dpdns.org`**. Nếu bạn dùng tên khác, thay tương ứng.

---

## 1. Đăng ký tên miền ở DigitalPlat (~5 phút)

1. Mở <https://dash.domain.digitalplat.org/> → đăng ký / đăng nhập.
2. Chọn **Register a domain** (hoặc **Get started**).
3. Nhập phần tên bạn muốn, chọn đuôi:
   - `.dpdns.org`, `.us.kg`, `.qzz.io`, `.qd.je`, `.xx.kg` — tất cả đều miễn phí.
   - Ví dụ: tên `thuyetminh` + đuôi `.dpdns.org` → `cnpm.dpdns.org`.
4. Ở phần **nameservers**, bạn có thể:
   - để mặc định của DigitalPlat (đổi sau), hoặc
   - điền luôn 2 nameserver Cloudflare ở **bước 2** (làm bước 2 trước rồi quay lại đây).
5. Hoàn tất đăng ký, xác nhận email nếu có.

> Tên miền miễn phí có thể cần **gia hạn định kỳ** (DigitalPlat gửi email nhắc).
> Đặt lịch nhắc để không mất tên.

Kiểm tra tên miền đã trỏ đúng nameserver:

```powershell
nslookup -type=ns cnpm.dpdns.org
```

---

## 2. Đưa tên miền vào Cloudflare (~10 phút + chờ)

1. Vào <https://dash.cloudflare.com/> → **Add a site** (Thêm trang web).
2. Nhập **đầy đủ** tên miền: `cnpm.dpdns.org` → **Continue**.
3. Chọn gói **Free** → **Continue**.
4. Cloudflare quét DNS (có thể bỏ qua) → hiện **2 nameserver**, dạng:
   ```
   xxxx.ns.cloudflare.com
   yyyy.ns.cloudflare.com
   ```
5. Quay lại DigitalPlat → domain vừa tạo → **Nameservers / DNS** → dán đúng 2 dòng trên → **Save**.
6. Chờ Cloudflare báo **Active**. Thường 5–30 phút, tối đa 24 giờ.

Kiểm tra:

```powershell
nslookup -type=ns cnpm.dpdns.org
```

Kết quả phải là 2 nameserver `*.ns.cloudflare.com`.

> **Vì sao thêm được tên miền con vào Cloudflare?** `dpdns.org`, `us.kg`, `qzz.io`…
> nằm trong [Public Suffix List](https://publicsuffix.org/), nên `ten.dpdns.org` được coi là
> một tên miền riêng và dùng được gói Free như bình thường.
>
> Nếu Cloudflare báo *"not a registrable domain"*: kiểm tra bạn đã nhập **đủ cả đuôi**
> (`ten.dpdns.org`), và đang dùng đuôi có trong danh sách trên.

---

## 3. Tạo Tunnel (chọn 1 trong 2 cách)

### Cách A — bằng dòng lệnh (đã dùng cho máy này, nhanh và ổn định hơn)

```powershell
# 1. Đăng nhập Cloudflare: trình duyệt mở ra, bấm Authorize và chọn zone cnpm.dpdns.org
cloudflared tunnel login

# 2. Tạo tunnel tên cnpm-duan (sinh ra file khóa .json trong C:\Users\<ban>\.cloudflared\)
cloudflared tunnel create cnpm-duan

# 3. Trỏ tên miền vào tunnel (tự tạo bản ghi CNAME đã bật proxy)
cloudflared tunnel route dns cnpm-duan cnpm.dpdns.org
```

Rồi tạo `cloudflare/config.yml` (thay `<tunnel-id>` bằng id ở bước 2):

```yaml
tunnel: <tunnel-id>
credentials-file: C:\Users\<ten-may>\.cloudflared\<tunnel-id>.json
protocol: http2        # mạng chặn UDP 7844 thì HTTP/2 ổn định hơn QUIC
no-autoupdate: true
ingress:
  - hostname: cnpm.dpdns.org
    service: http://localhost:4000
  - service: http_status:404
```

### Cách B — bằng Dashboard (nếu không quen dòng lệnh)

1. Vào <https://dash.cloudflare.com/> → **Networking → Tunnels**
   (giao diện cũ: **Zero Trust → Networks → Tunnels**).
2. **Create a tunnel** → chọn **Cloudflared** → đặt tên, ví dụ `thuyetminh-local` → **Save tunnel**.
3. Màn hình **Install connector** hiện một lệnh dài, dạng:
   ```
   cloudflared.exe service install eyJhIjoi...
   ```
   Phần bắt đầu bằng `eyJ...` chính là **token**. Bấm **Copy** cả token đó.
   (Không cần chạy lệnh này bằng tay — file `CHAY-CONG-KHAI.bat` sẽ dùng token.)
4. Chuyển sang tab **Routes** (hoặc **Public Hostname**) → **Add route → Published application**:
   - **Subdomain**: `@` (nếu tên miền Cloudflare của bạn chính là `cnpm.dpdns.org`)
   - **Domain**: chọn `cnpm.dpdns.org`
   - **Path**: để trống
   - **Service URL**: `http://localhost:4000`
5. **Add route**. Đợi tunnel hiện **Healthy** (sau khi chạy bước 4).

> Nếu bạn muốn `www.cnpm.dpdns.org` song song, thêm một route nữa với
> Subdomain = `www`, cùng Service URL.

---

## 4. Chạy website công khai trên máy này

Nhấp đúp **`CHAY-CONG-KHAI.bat`** ở thư mục gốc dự án.

Script tự kiểm tra theo thứ tự:

1. **Nếu có `cloudflare/config.yml`** (trường hợp máy này) → chạy luôn, không hỏi gì.
2. **Nếu chưa có** → hỏi **token tunnel** (dán token ở bước 3B) và **tên miền**.

Sau đó script tự:

- tạo/sửa `backend/.env` với `JWT_SECRET` ngẫu nhiên 48 byte (bắt buộc khi mở ra Internet),
- cài thư viện / nạp dữ liệu nếu máy chưa có,
- khởi động lại server ở cổng 4000 để đọc cấu hình mới,
- mở tunnel và in ra địa chỉ công khai.

Khi thấy:

```
WEBSITE CONG KHAI : https://cnpm.dpdns.org
QUAN TRI          : https://cnpm.dpdns.org/admin
```

thì gửi link đó cho người khác. **Giữ cửa sổ này mở** — đóng cửa sổ là mất tunnel.

Dừng: nhấp đúp **`TAT-CONG-KHAI.bat`** (tắt cả tunnel và server cổng 4000).

**Sửa code backend hoặc `backend/.env`:** nhấp đúp **`KHOI-DONG-LAI-SERVER.bat`**.
File này chỉ tắt/mở lại server cổng 4000, **giữ nguyên tunnel** nên website chỉ gián đoạn
khoảng 3 giây (không phải đóng/mở lại Cloudflare, không phải chờ DNS).
Sửa `cms/src` thì vẫn phải build lại rồi chép vào `web/admin/` như mục 6 của
[`code-map.md`](code-map.md).

Thông tin được lưu ở:

```
cloudflare/config.yml             ← cách A: cấu hình tunnel (đã gitignore)
cloudflare/tunnel-token.txt       ← cách B: token (đã gitignore)
cloudflare/domain.txt             ← cách B: tên miền
cloudflare/THONG-TIN-DANG-NHAP.txt← mật khẩu CMS + tunnel id (đã gitignore)
```

Muốn đổi tên miền/token: sửa/xoá các file trên rồi chạy lại.

### Chạy tự động khi bật máy (tuỳ chọn)

Nếu muốn tunnel tự bật cùng Windows, mở **PowerShell bằng quyền Administrator** và chạy:

```powershell
cloudflared service install <token>
```

Sau đó chỉ cần `CHAY-WEBSITE.bat` để bật server; tunnel do Windows service lo.
Gỡ: `cloudflared service uninstall` (cũng cần Administrator).

> Khi dùng Windows service, `TAT-CONG-KHAI.bat` chỉ tắt server, không tắt tunnel.
> Muốn tắt hẳn thì dừng service trong `services.msc` hoặc chạy lệnh uninstall.

---

## 5. Bảo vệ CMS trước khi công khai (bắt buộc)

Khi website đã ra Internet, **ai cũng mở được** `/admin` và gọi `/api/admin/*`.
Làm tối thiểu 3 việc sau:

### 5.1. Đổi mật khẩu admin

**Đã làm** trên máy này: mật khẩu `admin123` đã được thay bằng mật khẩu mạnh
(xem `cloudflare/THONG-TIN-DANG-NHAP.txt`), và `ADMIN_PASSWORD` trong `backend/.env`
đã đặt cùng giá trị để lần `npm run seed:demo` sau không quay lại `admin123`.

Muốn đổi lần nữa: đăng nhập <https://cnpm.dpdns.org/admin> → menu tài khoản →
**Đổi mật khẩu** → nhập mật khẩu mới ≥ 8 ký tự, không dùng lại ở nơi khác.
Nhớ cập nhật lại `ADMIN_PASSWORD` trong `backend/.env` cho khớp.

### 5.2. Kiểm tra `JWT_SECRET`

`CHAY-CONG-KHAI.bat` đã tự tạo `backend/.env` với secret ngẫu nhiên (48 byte).
Mở file để chắc chắn có dòng:

```
JWT_SECRET=<chuỗi dài ngẫu nhiên>
```

Nếu secret còn là `dev-only-secret-change-me` hoặc `change-me`, **người khác có thể tự tạo
token admin** — phải đổi trước khi công khai.

### 5.3. Chặn `/admin` bằng Cloudflare Access (khuyến nghị)

Cách này cho phép khách xem website tự do, nhưng muốn vào CMS phải đăng nhập qua email:

1. Cloudflare Dashboard → **Zero Trust** → **Access → Applications** → **Add an application**
   → **Self-hosted**.
2. Application name: `CMS`.
3. Public hostname: `cnpm.dpdns.org`, path: `admin`.
4. Thêm một public hostname nữa (hoặc tạo application thứ hai):
   cùng domain, path `api/admin`.
5. Policy: **Allow** → **Emails** → nhập email của bạn.
6. Login method: bật **One-time PIN** (miễn phí).
7. Save.

Lần sau vào CMS, Cloudflare hỏi email → gửi mã 6 số → nhập là vào.
Người lạ không có email của bạn thì không qua được lớp này, dù biết mật khẩu admin.

### 5.4. Quyết định về thanh toán

Mặc định backend dùng **tài khoản ngân hàng của bản deploy gốc** (`PHAM VAN HUNG`).
Khi công khai, người lạ có thể chuyển tiền vào đó. Chọn một trong hai:

- **Dùng tài khoản của bạn**: sửa `PAYMENT_BANK_BIN`, `PAYMENT_BANK_NAME`,
  `PAYMENT_ACCOUNT`, `PAYMENT_ACCOUNT_NAME` trong `backend/.env`, rồi khởi động lại server.
- **Tắt thanh toán** (an toàn nhất cho demo): đặt `PAYMENT_ACCOUNT=` (rỗng) trong `.env`,
  và vào CMS đặt **Phí nghe = 0** cho tất cả điểm thuyết minh. Nếu còn điểm có phí mà
  thanh toán đã tắt, khách bấm "Nghe toàn bộ" sẽ nhận lỗi.

Ngoài ra, luồng hiện tại cho phép khách bấm **"Tôi đã chuyển khoản"** là nghe được ngay
(admin xác nhận sau). Đây là hành vi giống bản deploy; đừng dùng nó để thu tiền thật
nếu chưa kiểm soát được.

### 5.5. Các mục nên xem thêm

| Mục | Ở đâu | Ghi chú |
|---|---|---|
| Tự chuyển HTTP → HTTPS | `PUBLIC_HOST` trong `backend/.env` | Đang đặt `cnpm.dpdns.org`; khách gõ thiếu `https://` vẫn vào đúng bản bảo mật |
| Số người trực tuyến | `LIVE_DEMO_FACTOR` trong `backend/.env` | Đang đặt `1` = số thật; đổi `2` nếu muốn nhân đôi để demo |
| Nhịp cập nhật bảng live | `LIVE_SSE_INTERVAL_MS` trong `backend/.env` | Đang đặt `1000` = cập nhật mỗi 1 giây (mặc định trong mã 3000) |
| Dữ liệu demo | `backend/data/narration.db` | Có đơn thanh toán mẫu + log nghe/GPS giả (log GPS cũ đã dọn, chỉ giữ 7 ngày gần nhất). Nạp lại bằng `npm run seed` nếu muốn sạch |
| Bản dump SQL | `backend/data/narration.sql` | Sinh bằng `sqlite3 narration.db .dump > narration.sql`; nạp lại: `sqlite3 db-moi.db < narration.sql` |
| Tiết kiệm pin | Windows → Power & sleep | Đặt **Never** để máy không ngủ, website luôn online |
| Sao lưu | `backend/data/` + `backend/uploads/` | Copy định kỳ; đây là toàn bộ nội dung + audio |

---

## 6. Kiểm tra sau khi công khai

| Việc | Cách kiểm tra |
|---|---|
| DNS đã trỏ Cloudflare | `nslookup cnpm.dpdns.org` |
| HTTPS hoạt động | Mở `https://cnpm.dpdns.org` trên điện thoại dùng 4G |
| API sống | `https://cnpm.dpdns.org/api/health` trả `{"status":"ok"}` |
| CMS | `https://cnpm.dpdns.org/admin` |
| Ảnh/audio | Mở một điểm có audio, nghe được |
| Tunnel | Cloudflare → Networking → Tunnels → `cnpm-duan` phải **Healthy** |
| Máy chủ | Cửa sổ `CHAY-CONG-KHAI.bat` vẫn mở, log không có lỗi đỏ |
| Mã QR in ra | Quét thử: phải mở `https://cnpm.dpdns.org/q/...` (không phải localhost) |

---

## 7. Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Cloudflare không nhận tên miền | Nhập thiếu đuôi, hoặc đuôi không có trong danh sách DigitalPlat. Dùng `ten.dpdns.org`. |
| Cloudflare mãi **Pending** | Nameserver ở DigitalPlat chưa đúng / chưa lưu. So lại từng ký tự, chờ tối đa 24h. |
| Tunnel **Inactive** | Chưa chạy `CHAY-CONG-KHAI.bat`. Nếu chạy chế độ token: token sai/hết hiệu lực → xoá `cloudflare/tunnel-token.txt` rồi chạy lại. Nếu chạy chế độ `config.yml`: kiểm tra file khóa trong `C:\Users\<ban>\.cloudflared\` còn tồn tại. |
| **502 Bad Gateway** / lỗi 1033 | Tunnel sống nhưng server local chết. Kiểm tra `http://localhost:4000/api/health`, chạy lại script. |
| Trang trắng, asset 404 | `web/` bị thiếu/di chuyển. Chạy lại `CHAY-WEBSITE.bat` để kiểm tra local trước. |
| Vào `/admin` bị Cloudflare chặn | Đúng như thiết lập Access. Đăng nhập bằng email đã khai báo, hoặc tạm tắt Access app. |
| Điện thoại vào được, máy tính không | DNS cache. Chạy `ipconfig /flushdns` hoặc đổi DNS 1.1.1.1. |
| Website chậm | Tốc độ upload của mạng nhà. Kiểm tra bằng cách mở từ mạng ngoài. |
| Máy ngủ → web sập | Power & sleep → Never; hoặc dùng VPS. |
| Token lộ | Cloudflare → Tunnel → **Refresh token** (hoặc xoá tunnel tạo lại), cập nhật `cloudflare/tunnel-token.txt`. |

---

## 8. Phương án khác

| Cách | Ưu | Nhược |
|---|---|---|
| **Cloudflare Tunnel** (khuyến nghị) | Miễn phí, HTTPS, không mở cổng, chạy sau CGNAT | Máy phải bật + có mạng |
| **VPS + tên miền** | Chạy 24/7, không phụ thuộc máy nhà | Tốn tiền thuê VPS, phải cài lại Node/DB |
| **Mở cổng router (port forward)** | Không cần Cloudflare | Cần IP công khai, nhiều nhà mạng dùng CGNAT; rủi ro bảo mật cao |
| **Quick tunnel** `cloudflared tunnel --url http://localhost:4000` | Thử nhanh 30 giây | URL `*.trycloudflare.com` đổi mỗi lần chạy; **không dùng để in QR** |

Nếu mục tiêu là bản demo ổn định cho hội đồng / người ngoài xem trong vài tuần,
Cloudflare Tunnel + máy này là đủ. Nếu cần chạy lâu dài, nên chuyển backend lên VPS:
chỉ cần copy `backend/`, `web/`, `package.json`, chạy `npm ci && npm run seed`, rồi trỏ
tunnel (hoặc Nginx) vào cổng 4000.

---

## 9. Vì sao nên dùng tên miền cố định?

Mã QR trong CMS được sinh từ **origin đang mở**. Nếu dùng quick tunnel
(`abc-random.trycloudflare.com`), mỗi lần khởi động lại URL đổi → mã QR đã in sẽ sai.
Với tên miền DigitalPlat cố định, QR in ra dùng được lâu dài.

Sau khi đổi sang tên miền thật, vào CMS → **Mã QR** tải lại/ in lại các mã cần thiết.
