# Ứng dụng di động — Hệ thống thuyết minh tự động đa ngôn ngữ (Quận 4)

Ứng dụng Expo (SDK 58, React Native 0.88, TypeScript, Expo Router). Khách du lịch (tourist) hoặc hành khách xe buýt (bus passenger) ở các phường Khánh Hội, Vĩnh Hội, Xóm Chiếu nghe thuyết minh (narration) tự động khi đi vào bán kính (radius) của một điểm tham quan (POI), tức vùng kích hoạt (geofence) theo GPS, hoặc khi quét mã QR ở trạm xe buýt (bus stop).

## Kiến trúc (khớp sơ đồ "Bên trong ứng dụng di động" trong README gốc)

```
Location service ──► Geofence engine ──► Narration engine ──► expo-audio / expo-speech
(src/services/location)  (src/engine/geofence.ts)  (src/engine/narration.ts)
QR scanner ──────────────────────────────► Narration engine
(src/app/(tabs)/scan.tsx + src/services/qrResolver.ts)
Content layer (SQLite offline) ◄──► Backend API
(src/data/db.ts, sync.ts, syncLogic.ts, audioCache.ts, api.ts)
```

| Thư mục / file | Vai trò |
|---|---|
| `index.js` | Điểm vào: định nghĩa tác vụ định vị nền (background location) **trước** khi nạp `expo-router/entry` |
| `src/app/` | Màn hình (Expo Router): `(tabs)/index` Bản đồ, `tours`, `scan`, `settings`; `poi/[id]`, `tour/[id]` |
| `src/engine/` | Logic thuần, không phụ thuộc Expo, có kiểm thử đơn vị: `geo.ts` (haversine), `geofence.ts`, `cooldown.ts`, `narration.ts`, `language.ts`, `qr.ts` |
| `src/services/location/` | GPS tiền cảnh (`watchPositionAsync`) + nền (`startLocationUpdatesAsync` + TaskManager) |
| `src/services/pipeline.ts` | Nối Location → Geofence → Narration (+ ghi thống kê); dùng chung cho GPS thật, GPS nền và chế độ mô phỏng vị trí |
| `src/services/simulation.ts` | Chế độ "Mô phỏng vị trí": chạm bản đồ hoặc tự đi bộ theo tour |
| `src/services/analytics.ts` | `session_id` ẩn danh theo lần mở app, hàng đợi log trong SQLite, gửi theo lô |
| `src/services/qrResolver.ts` | Tra QR: bảng QR đồng bộ trên máy → bộ nhớ đệm → `GET /api/qr/:payload` |
| `src/data/` | SQLite (`db.ts`), đồng bộ (`sync.ts` + `syncLogic.ts` thuần), tải audio ngoại tuyến (offline), cài đặt |
| `src/components/map/` | Bản đồ WebView + Leaflet (Leaflet nhúng sẵn, sinh bằng `npm run gen:leaflet`) |
| `src/i18n/` | Chuỗi giao diện tiếng Việt / tiếng Anh |
| `src/__tests__/` | Kiểm thử đơn vị (jest-expo) + kiểm thử tích hợp với backend thật |

**Vì sao bản đồ dùng WebView + Leaflet thay vì react-native-maps:** chạy giống nhau trong Expo Go trên cả Android và iOS, development build hay bản build độc lập; không cần Google Maps API key. Leaflet được nhúng vào bundle nên khi ngoại tuyến vẫn thấy vòng POI và vị trí (chỉ thiếu ảnh nền bản đồ CARTO/OSM).

## Chạy thử

Yêu cầu: Node 20+, backend đang chạy ở cổng 4000 (xem `../backend`).

```bash
cd mobile
npm install            # .npmrc đã bật legacy-peer-deps (xem mục Ghi chú)
cp .env.example .env   # sửa EXPO_PUBLIC_API_URL (xem dưới)
npx expo start         # quét mã QR bằng app Expo Go trên điện thoại
```

### Địa chỉ máy chủ (quan trọng)

Trên điện thoại, `localhost` là chính điện thoại, không phải máy tính chạy backend. Thứ tự app chọn địa chỉ:

1. URL nhập trong **Cài đặt → Máy chủ** (lưu trên máy).
2. `EXPO_PUBLIC_API_URL` trong `.env` (cần khởi động lại `expo start` sau khi sửa).
3. Tự động: IP LAN của máy đang chạy Metro (lấy từ `hostUri` của Expo) + cổng `4000`. Khi điện thoại và laptop cùng Wi-Fi thì thường không phải cấu hình gì.
4. Mặc định: Android emulator `http://10.0.2.2:4000`, iOS simulator `http://localhost:4000`.

Xem IP LAN trên macOS: `ipconfig getifaddr en0`, ví dụ `http://192.168.1.10:4000`. Backend phải nghe ở `0.0.0.0` (đã đúng) và tường lửa phải mở cổng 4000. Mạng Wi-Fi trường học thường chặn các máy nhìn thấy nhau (client isolation); khi đó hãy phát hotspot từ điện thoại.

### Expo Go và development build

| Tính năng | Expo Go | Development build / bản build |
|---|---|---|
| Bản đồ, tour, QR, TTS, audio, SQLite, đồng bộ | Có | Có |
| GPS khi mở app (tiền cảnh) | Có | Có |
| GPS khi chạy nền / tắt màn hình | **Không** (app tự chuyển về GPS tiền cảnh, Cài đặt hiện ghi chú) | Có, bật "Tiếp tục khi chạy nền" trong Cài đặt |
| Gọi `http://` tới IP LAN | Có | Có (đã bật `usesCleartextTraffic` cho Android và ATS cho iOS) |

Tạo development build để dùng GPS nền:

```bash
npx expo install expo-dev-client
npx expo run:android      # cần Android Studio/SDK, hoặc:
npx eas-cli@latest build --profile development --platform android
```

Android sẽ hỏi quyền vị trí "Luôn cho phép" và hiện thông báo dịch vụ tiền cảnh khi đang theo dõi nền. iOS cần chọn "Luôn luôn".

## Demo trên lớp (emulator không có GPS / camera)

1. **Cài đặt → Chế độ demo → Mô phỏng vị trí**: bật. GPS thật bị bỏ qua.
2. Mở tab **Bản đồ**, chạm vào một chỗ bất kỳ để đặt vị trí giả. Chạm vào trong vòng tròn của một điểm → app tự thuyết minh (vòng chuyển xanh lá, rồi cam khi đang phát).
3. Hoặc vào **Tour → chọn tour → Mô phỏng đi bộ theo tour**: chấm tím tự đi từ ngoài điểm đầu qua từng điểm; khi đang thuyết minh thì dừng bước để nghe hết. Chỉnh tốc độ (×1–×30) trong Cài đặt.
4. Muốn thấy luồng A1 (bỏ qua vì vừa nghe): đi ra khỏi vùng rồi chạm lại vào vùng trong vòng 10 phút → thông báo "Bỏ qua … vừa nghe". Đặt thời gian chờ phát lại = 0 để tắt.
5. QR không có camera: tab **Quét QR → Nhập mã thủ công**, dán chuỗi in trên mã (ví dụ `NARR:VSdMICEvK7Ln`, lấy ở CMS → QR). Gõ chuỗi sai để thấy E1 "Mã QR không hợp lệ".
6. Thử ngoại tuyến: tắt mạng emulator sau lần đồng bộ đầu. Bản đồ, tour, QR (đã đồng bộ) và TTS vẫn chạy; log được giữ lại rồi gửi khi có mạng lại.

Trên emulator thật cũng có thể giả GPS: Android Emulator → Extended controls → Location; iOS Simulator → Features → Location.

## Hành vi chính theo ca sử dụng (use case)

- **UC1 Vùng kích hoạt (geofence)**: xin quyền vị trí; bị từ chối thì hiện giải thích, nút "Mở Cài đặt" và "Thử lại", dừng tính năng tự động (E1). Lần đầu chưa có dữ liệu mà đang ngoại tuyến thì hiện thông báo đề nghị kết nối mạng (E2). Bỏ qua các lần định vị GPS có độ chính xác kém hơn 60 m. Vào vùng khi khoảng cách ≤ bán kính, ra khi > bán kính × 1,2 (hysteresis). Trong các vùng đang đứng, chọn điểm có độ ưu tiên (priority) cao nhất rồi gần nhất. Mỗi lượt vào vùng chỉ kích hoạt một lần.
- **Bộ máy thuyết minh (narration engine)**: lượt kích hoạt (trigger) bằng GPS bị bỏ qua nếu đang phát bài khác hoặc cùng điểm đã phát trong thời gian chờ phát lại (cooldown, mặc định 10 phút, chỉnh được) — A1. Nghe thủ công và quét QR được ưu tiên: bỏ qua thời gian chờ phát lại, dừng bài đang phát. Nguồn phát: file audio đã tải trên máy → `audio_url` của máy chủ (ghép `/uploads/...` với địa chỉ máy chủ) khi có mạng → chuyển văn bản thành giọng nói (TTS) trên máy (`expo-speech`) đúng ngôn ngữ. Audio lỗi thì tự chuyển sang TTS. Chưa có bản dịch (translation) thì phát bản tiếng Việt và báo cho người dùng. Mỗi lượt nghe được ghi nhật ký sử dụng (usage log) `poi_id, played_at, trigger_method, language_code, listen_seconds`.
- **UC2 QR**: camera (`expo-camera`) chỉ đọc mã QR. Mã được chuẩn hoá (`NARR:<mã>`, mã trần hoặc URL `.../q/<mã>`). Thứ tự tra: bảng `qr_code` đồng bộ từ `/api/sync` (chạy được ngoại tuyến) → mã đã tra trước đó → `GET /api/qr/<encodeURIComponent(payload)>`. Kết quả 404 → "Mã QR không hợp lệ" (E1). Không tìm thấy trên máy và không có mạng → thông báo E2. Có thể chọn ngôn ngữ khác để nghe lại (A1).
- **Đồng bộ (sync)**: khi mở app, mỗi 5 phút, khi app quay lại tiền cảnh và khi có mạng lại: `GET /api/sync/version`; khác phiên bản trên máy thì tải `/api/sync` và thay toàn bộ bảng nội dung trong **một transaction** (lỗi giữa chừng thì giữ dữ liệu cũ). Sau đó tải sẵn audio của ngôn ngữ đang chọn và xoá audio không còn dùng.
- **Thống kê (analytics) ẩn danh**: `session_id` ngẫu nhiên sinh mỗi lần mở app, không gắn với thiết bị. Vị trí lấy mẫu tối đa mỗi ~30 giây hoặc khi đi được ≥ 25 m (không dày hơn 5 giây/mẫu). Log nằm trong SQLite, gửi theo lô 200 bản ghi khi có mạng. Nếu máy chủ trả 400 cho cả lô thì gửi lẻ từng bản ghi và bỏ bản ghi hỏng. Tắt "Gửi dữ liệu ẩn danh" thì app không ghi gì và xoá hàng đợi.

## Kiểm tra

```bash
npm test                                   # kiểm thử đơn vị: geofence, cooldown/narration, đồng bộ, QR, ngôn ngữ, thống kê, HTML bản đồ
LIVE_API=http://localhost:4000 npx jest backend.live   # tích hợp với backend thật (chỉ đọc, không ghi dữ liệu)
npm run typecheck                          # tsc --noEmit
npx expo-doctor
npm run export:android                     # chứng minh bundle biên dịch được (ra thư mục dist-android/)
```

## Ghi chú kỹ thuật

- Một số gói đòi `--legacy-peer-deps` khi cài: `react-dom@19.3.1` (peer tuỳ chọn của `@expo/router-server`) yêu cầu `react@^19.3.1`, trong khi SDK 58 ghim `react@19.3.0`. App không dùng web nên không ảnh hưởng.
- `react-native-webview@14` có khai báo kiểu xung đột với `@types/react@19.3`, nên `LeafletMap.tsx` ép kiểu tối thiểu. Runtime không đổi.
- Sau khi nâng phiên bản `leaflet`, chạy `npm run gen:leaflet` để sinh lại `src/components/map/leafletAssets.generated.ts`.
