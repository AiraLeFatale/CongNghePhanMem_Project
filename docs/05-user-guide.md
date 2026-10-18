# User Guide

**Project:** Multilingual Automatic Narration System
**Document version:** 1.0 (18/10/2026)

This guide follows use cases UC1–UC5. The CMS interface is in Vietnamese; labels are quoted as they appear, with an English translation in brackets. The mobile app shows a Vietnamese interface when the narration language is Vietnamese and an English interface otherwise; English labels are quoted. Screenshots are marked **TODO**.

---

## Part A. Content administrators (CMS web)

### A.1 Logging in and out
1. Open the CMS address in a browser (e.g. `https://<server>/`; in development `http://localhost:5173`).
2. Enter "Tên đăng nhập" [username] and "Mật khẩu" [password] and click "Đăng nhập" [Log in].
3. After 20 failed attempts within 15 minutes, login is blocked for 15 minutes from that network.
4. A session lasts 8 hours. When it expires, the CMS returns to the login page and, after logging in again, reopens the page you were on.
5. "Đăng xuất" [Log out] is at the bottom of the sidebar. Your name in the sidebar opens the account page, where "Đổi mật khẩu" [Change password] requires the current password and a new one of at least 8 characters.

The sidebar contains "Tổng quan" [Overview], "Điểm thuyết minh" [Points of interest], "Tour tham quan" [Tours], "Mã QR" [QR codes] and "Thống kê" [Analytics]. On a phone-sized screen it collapses into a menu button.

> Screenshot TODO: login page, sidebar.

### A.2 Overview
"Tổng quan" shows the number of POIs, tours and QR codes, figures for the last 7 days, and a "Việc cần làm" [To do] list of POIs missing audio, missing languages or without a QR code, with shortcuts such as "Thêm điểm thuyết minh" [Add POI].

> Screenshot TODO: overview page.

### A.3 Managing points of interest (UC3)
**View and search.** Open "Điểm thuyết minh". The list shows each POI's name, address, radius, priority, languages with text, languages with audio and number of QR codes. Type in "Tìm theo tên hoặc địa chỉ…" [Search by name or address] to filter.

**Create or edit a POI.**
1. Click "Thêm điểm" [Add POI], or click an existing POI.
2. Enter "Tên điểm" [name] and optionally "Địa chỉ" [address].
3. Set the location: click on the map to place the pin, or drag it; you can also type "Vĩ độ" [latitude] and "Kinh độ" [longitude]. Other POIs are shown faded so overlaps are visible.
4. Set "Bán kính kích hoạt (m)" [activation radius, greater than 0, at most 5000 m]. The circle on the map shows the area in which the app starts the narration. Typical values: 50–150 m.
5. Set "Mức ưu tiên" [priority, 0–100]. When a visitor is inside several POIs at once, the higher priority is played.
6. Optionally upload an image (JPG, PNG or WebP, up to 15 MB) with "Tải ảnh lên" [Upload image].
7. In the Vietnamese tab enter "Tiêu đề hiển thị" [display title] and "Nội dung thuyết minh" [narration text]. Vietnamese is mandatory and is played when a visitor's language has no text.
8. For other languages, open the language tab and type the text, or click "Dịch tự động từ tiếng Việt" [Translate from Vietnamese]; "Dịch tất cả ngôn ngữ còn trống" [Translate all empty languages] fills every empty tab at once. Machine translation is a draft: read and correct it.
9. Click "Tạo điểm" [Create POI] for a new POI or "Lưu thay đổi" [Save changes]. Invalid fields (missing coordinates, radius 0, no Vietnamese text) are marked with a message under the field and nothing is saved.

If you try to leave the page with unsaved changes, the CMS asks for confirmation.

**Audio for a language.** In each language tab:
- "Tải file audio" [Upload audio file]: mp3, m4a, aac, wav, ogg or webm, up to 15 MB, e.g. a recording by a guide;
- "Tạo giọng đọc" [Create voice]: generates an MP3 from the saved text with server text-to-speech. If the form has unsaved changes, the CMS offers "Lưu và tạo giọng đọc" [Save and create voice];
- listen to the audio in the built-in player, or "Gỡ audio" [Remove audio].

Without audio, the app reads the text with the phone's built-in voice.

**Delete a POI.** Click "Xoá điểm" [Delete POI] and confirm. This also deletes its translations, audio, image and QR codes and removes it from tours. Past statistics are kept.

Changes reach visitors' phones at their next sync (at app start, every 5 minutes while the app is open, or when the connection returns).

> Screenshots TODO: POI list, POI form with map, language tabs, audio panel.

### A.4 QR codes for bus stops (UC3 A2, used by UC2)
1. Open a POI and scroll to "Mã QR tại trạm xe buýt" [QR codes at bus stops].
2. Enter a label naming the stop (e.g. "Trạm xe buýt Khánh Hội") and click "Tạo mã QR" [Create QR code].
3. Click "PNG" to download the image, or "In mã QR của điểm này" [Print this POI's QR codes].
4. The "Mã QR" page lists all codes and can be filtered by POI ("Lọc theo điểm"). Select codes and click "In bảng mã" [Print code sheet] to print an A4 sheet with four codes per page, each with the stop label, POI name and an instruction to scan.
5. Print at least A5 size and laminate for outdoor use. Install at the stop and test with the app.
6. To withdraw a damaged or moved code, delete it ("Xoá mã QR"); after the next sync the app reports "Invalid QR code" for it. Create a new code if needed.

> Screenshot TODO: QR section of a POI, QR page, print sheet.

### A.5 Managing tours (UC4)
1. Open "Tour tham quan" and click "Tạo tour" [Create tour], or open an existing tour.
2. Enter "Tên tour" [name] and "Mô tả" [description].
3. Add POIs from the list, then order them by dragging or with the up/down buttons (also usable with the keyboard). The map draws the numbered route.
4. Click "Tạo tour" (new tour) or "Lưu tour" [Save tour]. A tour must contain at least one POI.
5. To delete a tour, click "Xoá tour" and confirm. The POIs themselves are not deleted.

> Screenshot TODO: tour editor with map.

### A.6 Usage analytics (UC5)
1. Open "Thống kê".
2. Choose a period with the presets "7 ngày", "30 ngày" (default) or "90 ngày", or with "Từ ngày" / "Đến ngày" [from / to], and optionally a tour (default "Tất cả tour" [all tours]); click "Xem báo cáo" [View report].
3. The report shows:
   - totals: plays, sessions (app launches), average and total listening time;
   - "Điểm được nghe nhiều nhất" [most-listened POIs] and average listening time per POI, with a detail table;
   - plays per day (UTC dates), by trigger method (automatic GPS, QR, manual), by language and by hour of day (Vietnam time);
   - "Bản đồ nhiệt vị trí người dùng" [visitor location heatmap]; tick "Hiện lộ trình ẩn danh" [Show anonymous routes] to draw sample routes.
4. If nothing was recorded for the filter, "Không có dữ liệu" [No data] is shown.
5. "Xuất Excel" [Export Excel] downloads a workbook with one sheet per table. "Xuất PDF" [Export PDF] opens a print-ready report; click "In / Lưu PDF" [Print / Save PDF] and choose "Save as PDF" in the browser's print dialog.

All data is anonymous: there are no visitor accounts, each app launch uses a new random session code, and locations are stored at about 11 m precision.

> Screenshots TODO: analytics page, heatmap, print report.

---

## Part B. Tourists and passengers (mobile app)

The app has four tabs: **Map**, **Tours**, **Scan QR** and **Settings**.

### B.1 First start
1. Open the app while connected to the internet. It downloads the narration content for the area; afterwards it works offline.
2. Allow **location** access so narration can start automatically. If you refuse, the app explains why it is needed and offers "Open Settings" and "Retry"; QR scanning and playing from the map still work.
3. The narration language starts as your phone's language if supported, otherwise Vietnamese. Change it in **Settings → Narration language** (Tiếng Việt, English, 中文, 한국어, 日本語, Français). If a place has no text in your language, you hear Vietnamese and a notice tells you so.
4. Without internet on first start, the map shows "You are offline and no data is stored on this device…"; connect once to download the content.

> Screenshots TODO: permission screen, settings.

### B.2 Automatic narration while walking (UC1)
- Walk or ride as usual. When you come close to a point of interest, its narration starts by itself and the mini player at the bottom shows "Now playing" with a "Stop playback" button.
- The map colours each circle by state: inside, playing, recently heard, next stop of a followed tour.
- If another narration is playing, the new place is skipped ("Skipped …: another narration is playing"). Tap the place on the map and press "Play narration" to hear it.
- The same place is not repeated within 10 minutes ("Skipped …: heard recently"). The time can be changed in Settings ("Do not replay the same point within (minutes)"); 0 turns the limit off.
- With weak GPS the map shows "Weak GPS (±… m) — ignored to avoid false triggers"; narration may start late. Use the map or a QR code instead.
- "Narrate automatically nearby" in Settings turns automatic narration on or off.
- To keep narration running with the screen off, enable "Keep running in background" and allow location "Always". This needs an installed build of the app; it is not available in Expo Go.

> Screenshot TODO: map with circles and mini player.

### B.3 Scanning a QR code at a bus stop (UC2)
1. Open **Scan QR** and allow the camera ("Allow camera"). The camera is only used to read QR codes.
2. Point the camera at the code on the bus stop sign. If the camera cannot be used, type the printed code in "Enter code manually" and tap "Open narration".
3. The narration starts at once in your language, stopping any narration already playing; GPS is not needed. You can choose another language to listen again.
4. "Invalid QR code" means the code is not part of the system or was withdrawn.
5. Codes are stored on the phone at each sync, so they also work offline. A code not yet stored cannot be checked without internet; connect and scan again.

> Screenshot TODO: scanner screen.

### B.4 Tours
Open **Tours** to see suggested routes. Open a tour to see its stops in order and tap "Follow this tour": the app shows the next stop and its distance, and "Tour … completed" at the end. "Skip this stop" moves to the next one.

> Screenshot TODO: tour screen.

### B.5 Settings and offline use
- **Data**: "Sync now", last sync time, content version, "Download all audio for offline use", "Clear cache".
- **Server**: the backend address (only needed for demos on a local network).
- **Privacy**: "Send anonymous data" on/off, number of records waiting to upload, current session ID.
- **Demo mode**: "Location simulation" ignores real GPS; tap the map to set a position, or open a tour and use "Simulate walking this tour".

### B.6 Privacy
The app does not ask for a name, phone number or account. It sends anonymous usage data (which place was played, in which language, for how long, how it was triggered) and occasional approximate locations, tied only to a random code that changes every time you open the app. You can switch this off in Settings.

### B.7 Troubleshooting

| Problem | What to do |
|---|---|
| No narration when arriving at a place | Check that location is allowed, "Narrate automatically nearby" is on and the volume is up; wait for a better GPS signal; play it from the map |
| "You are offline and no data is stored on this device" | Connect to the internet once so the app can download content |
| "Could not download data from …" | The backend address is wrong or unreachable; check **Settings → Server** |
| Narration stops when the screen is off | Use an installed build, enable "Keep running in background", allow location "Always", and disable battery optimisation for the app (Android) |
| Wrong language | Change it in **Settings → Narration language** |
