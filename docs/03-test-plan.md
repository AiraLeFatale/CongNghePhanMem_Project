# Test Plan and Test Cases

**Project:** Multilingual Automatic Narration System
**Document version:** 1.0 (18/10/2026)
**Related documents:** `01-SRS.md` (FR/NFR IDs), `02-design.md`

---

## 1. Scope and objectives
- Verify that every functional requirement FR-01 to FR-39 is covered by at least one test case.
- Automate all backend business rules (validation, sync versioning, QR resolution, anonymisation, analytics).
- Verify the client behaviour that cannot be automated (GPS, background execution, camera, audio) on real devices at real POIs.

Not tested: load/performance at production scale, penetration testing, availability of the free Google translate/TTS endpoints.

## 2. Strategy

| Level | Target | Tool | Approach |
|---|---|---|---|
| Unit | Backend pure functions: `splitText`, `extractPayload`, `validatePoiInput`, translator adapter | `node:test`, `node:assert` | Direct calls; network replaced by an injected `fetchImpl` |
| Unit | Mobile pure modules: geofence, cooldown, narration, language, QR parsing, sync logic, analytics policy | Jest (`jest-expo`) | Synthetic fixes, fake clock, injected audio/speech adapters; no device needed |
| Unit | CMS libraries: API client, validation, formatting, Excel export | Vitest | Mocked `fetch`; no browser needed |
| Integration (mobile ↔ backend) | Sync, QR resolution, log validation, simulated tour walk | Jest `backend.live.test.ts` with `LIVE_API` | Read-only calls against a running seeded backend |
| Integration (API) | All REST endpoints through the real Express app | `node:test` + `fetch` | Each test file starts the app on a random port with an in-memory SQLite DB seeded with the sample data; translate/TTS replaced by fakes (`tests/helpers.js`) |
| System / E2E | CMS against a running backend | Scripted headless Chrome run | TC-73 to TC-92 |
| System (device) | Mobile app on emulator/simulator or phone against the backend | Manual | Cases marked "Pending (device)" in §5.2 |
| Field test | Mobile app on real phones in Khanh Hoi, Vinh Hoi, Xom Chieu | Manual checklist (§6) | FT-01 to FT-09 |
| Acceptance | UC1–UC5 basic, alternative and exception paths | Demo with the lecturer | Uses seed data and simulation mode |

Entry criteria: backend tests pass; seed data loaded; clients build without errors.
Exit criteria: all automated tests pass; all M-priority client cases pass or have an accepted defect; field checklist completed at least at 3 POIs.

Defects are recorded as GitHub issues with the TC/FT ID, steps, expected and actual result, device/OS and severity (blocker, major, minor).

## 3. Test environment

| Item | Value |
|---|---|
| Backend runtime | Node.js ≥ 22.13 (results below obtained with Node v26.11.1 on macOS) |
| Database for automated tests | SQLite `:memory:`, seeded by `db/seed.js` (8 POIs, 2 tours, 5 QR codes, admin `admin` / `admin123`) |
| External services in automated tests | Fake translator (`[src->dst] text`) and fake TTS (fixed bytes); rate limits disabled |
| CMS | Unit: Vitest on Node; E2E: headless Chrome against the live seeded backend (TODO: record browser version) |
| Mobile | Unit and live tests on Node (jest-expo). Device testing: at least one Android and one iOS device with GPS (TODO: record models and OS versions); no device or emulator was available on 18/10/2026 |
| Field area | District 4 POIs from the seed data. Seed coordinates are approximate and must be verified on a map before field tests |

Commands: `cd backend && npm test`; `cd cms && npm test`; `cd mobile && npm test`; `cd mobile && LIVE_API=http://localhost:4000 npx jest backend.live` (backend running with seed data).

## 4. Automated test results

All runs on 18/10/2026.

| Suite | Command | Result |
|---|---|---|
| Backend (`backend/tests`) | `npm test` | **43 passed, 0 failed** (≈ 1.1 s) |
| CMS unit (`cms/src/lib/*.test.ts`) | `npm test` | **36 passed, 0 failed** (3 files) |
| Mobile unit (`mobile/src/__tests__`) | `npm test` | **62 passed, 0 failed** (5 suites, live suite excluded) |
| Mobile live-backend | `LIVE_API=… npx jest backend.live` | **5 passed, 0 failed** (against a freshly seeded backend) |

Backend tests per file:

| Test file | Tests | Passed |
|---|---|---|
| `tests/auth.test.js` | 6 | 6 |
| `tests/poi.test.js` | 14 | 14 |
| `tests/qr-tour.test.js` | 10 | 10 |
| `tests/analytics.test.js` | 9 | 9 |
| `tests/services.test.js` | 4 | 4 |

## 5. Test cases

Status values: **Pass**, **Fail**, **Partial**, **Pending** (not yet executed), **Pending (device)** (requires a phone or emulator), **Blocked**. Backend test names in the source code are in Vietnamese; the English title is given here with the file reference.

### 5.1 Backend automated test cases

| ID | Title (file) | Steps / input | Expected result | UC | FR | Status |
|---|---|---|---|---|---|---|
| TC-01 | Login with valid credentials (auth) | POST `/auth/login` admin/admin123 | 200, token returned, user has no `password_hash` | UC3 | FR-20 | Pass |
| TC-02 | Login with wrong password (auth) | POST `/auth/login` admin/wrong | 401 | UC3 | FR-20 | Pass |
| TC-03 | Login with missing fields (auth) | POST `/auth/login` `{}` | 400 | UC3 | FR-20 | Pass |
| TC-04 | Admin API without token (auth) | GET `/admin/pois` without header | 401 | UC3 | FR-20 | Pass |
| TC-05 | Admin API with forged token (auth) | GET `/admin/pois` with `Bearer abc.def.ghi` | 401 | UC3 | FR-20 | Pass |
| TC-06 | Change password (auth) | Wrong current password; new password of 4 chars; valid change; login with new password | 400, 400, 204, 200 | UC3 | FR-20 | Pass |
| TC-07 | List sample POIs (poi) | GET `/admin/pois` | 200, 8 items, languages include `vi` | UC3 | FR-21 | Pass |
| TC-08 | Search POI by name (poi) | GET `/admin/pois?q=Vĩnh Khánh` | Exactly 1 item | UC3 | FR-21 | Pass |
| TC-09 | Create valid POI bumps sync version (poi) | Read `/sync/version`; POST valid POI; read version again | 201, 1 translation; new version > old | UC3 | FR-22, FR-28, FR-03 | Pass |
| TC-10 | Reject radius 0, missing latitude, no content (poi) | POST with `radius_m:0, latitude:'', translations:[]` | 400 with `details.radius_m`, `details.latitude`, `details.translations` | UC3 E1 | FR-25 | Pass |
| TC-11 | Reject out-of-range coordinates (poi) | POST with lat 91, lng 200 | 400 with `details.latitude` and `details.longitude` | UC3 E1 | FR-25 | Pass |
| TC-12 | Reject POI without default language (poi) | POST with English text only | 400 | UC3 E1 | FR-25 | Pass |
| TC-13 | Reject unsupported or duplicate language (poi) | POST with `xx`; POST with `vi` twice | 400, 400 | UC3 E1 | FR-25 | Pass |
| TC-14 | Edit POI and drop a language (poi) | Create POI with vi+en; PUT with new name, radius 75, vi only | 200, name and radius updated, translations = [vi] | UC3 | FR-22 | Pass |
| TC-15 | Delete POI (poi) | DELETE; GET; DELETE again | 204, 404, 404 | UC3 A1 | FR-26 | Pass |
| TC-16 | Invalid id parameter (poi) | GET `/admin/pois/abc` | 400 | UC3 | FR-25 | Pass |
| TC-17 | Upload audio, serve it, remove it (poi) | POST multipart `audio` (audio/mpeg) to POI 1 `vi`; GET file URL; DELETE audio | 200, `audio_url` `/uploads/audio-*.mp3`, `audio_source` upload; file 200; `audio_url` null after delete | UC3 | FR-24 | Pass |
| TC-18 | Reject non-audio upload (poi) | POST multipart `application/x-php` | 400 | UC3 | FR-24, NFR-10 | Pass |
| TC-19 | Generate TTS audio from saved text (poi) | POST `/admin/pois/2/tts/en` | 200, `en` translation has `audio_source` tts | UC3 | FR-24 | Pass |
| TC-20 | Auto-translate (poi) | POST `/admin/translate` vi→en "Xin chào"; then empty text | 200 with translated text; 400 | UC3 | FR-23 | Pass |
| TC-21 | Create QR for POI and resolve it (qr-tour) | POST `/admin/pois/3/qrcodes`; GET `/qr/<content>` without auth | 201, content starts with `NARR:`; 200, `poi.id` = 3 with translations | UC2, UC3 A2 | FR-14, FR-27 | Pass |
| TC-22 | Unknown QR code (qr-tour) | GET `/qr/NARR:khongtontai` | 404 | UC2 E1 | FR-16 | Pass |
| TC-23 | Payload extraction from URL and prefix (qr-tour) | `extractPayload('https://example.com/q/abcDEF123')`, `extractPayload('NARR:xyz12345')` | `abcDEF123`, `xyz12345` | UC2 | FR-14 | Pass |
| TC-24 | Delete QR code (qr-tour) | Create QR; DELETE; resolve payload | 204; 404 | UC3 A2 | FR-27 | Pass |
| TC-25 | Create tour in given order (qr-tour) | POST tour `poi_ids [3,1,2]` | 201, POIs [3,1,2], visit_order [1,2,3] | UC4 | FR-29, FR-30 | Pass |
| TC-26 | Reject empty tour (qr-tour) | POST tour `poi_ids []` | 400 with `details.poi_ids` | UC4 E1 | FR-31 | Pass |
| TC-27 | Reject duplicate or unknown POI in tour (qr-tour) | `poi_ids [1,1]`; `poi_ids [999]` | 400, 400 | UC4 E1 | FR-31 | Pass |
| TC-28 | Edit and delete tour (qr-tour) | Create; PUT name B, `[2,1]`; DELETE; GET | Updated order [2,1]; 204; 404 | UC4 A1 | FR-30, FR-32 | Pass |
| TC-29 | Sync snapshot content (qr-tour) | GET `/sync` without auth | version ≥ 1, ≥ 8 POIs with translations, ≥ 2 tours with `poi_ids`, ≥ 5 `qrcodes` with payload and `poi_id`, default language `vi` | UC1, UC2, UC4 | FR-02, FR-14, FR-33 | Pass |
| TC-30 | Deleting a POI removes it from tours (qr-tour) | Create POI; tour [1, new]; delete POI; GET tour | Tour POIs = [1] | UC3 A1 | FR-26 | Pass |
| TC-31 | Record usage log, single and batch (analytics) | POST one object; POST array of 2 (qr, manual) | 201; `inserted` = 2 | UC1, UC2 | FR-10, FR-18 | Pass |
| TC-32 | Reject invalid usage log (analytics) | Single record with unknown POI; session id `x`; method `bay` | 400 each | UC1 | FR-10 | Pass |
| TC-33 | Location samples are rounded (analytics) | POST lat 10.761234567, lng 106.703987654 | 201; stored 10.7612, 106.704 | UC5 | FR-34, NFR-07 | Pass |
| TC-34 | Analytics report (analytics) | GET `/admin/analytics?from=2020-01-01` after TC-31 to TC-33 | `has_data` true; plays 3; sessions 1; top POI 2 with 2 plays, avg 25 s; heatmap not empty; 1 route without `session_id` | UC5 | FR-36, NFR-07 | Pass |
| TC-35 | Filter report by tour (analytics) | GET `?tour_id=2&from=2020-01-01` | plays = 2 (only POIs of tour 2) | UC5 | FR-35, FR-36 | Pass |
| TC-36 | No data in date range (analytics) | GET `?from=2000-01-01&to=2000-01-31` | 200, `has_data` false, plays 0 | UC5 E1 | FR-37 | Pass |
| TC-37 | Invalid filters (analytics) | `from=abc`; `from` after `to`; `tour_id=999` | 400 each | UC5 | FR-35 | Pass |
| TC-38 | Demo data feeds charts (analytics) | Start server with `--demo` seed; GET report | plays > 300; daily series > 10 days | UC5 | FR-36 | Pass |
| TC-39 | TTS text chunking (services) | `splitText` on long Vietnamese text + 400-char word | Every chunk ≤ 180 chars; no characters lost | UC3 | FR-24 | Pass |
| TC-40 | Translator joins segments, maps `zh` (services) | Fake fetch returns two segments | URL contains `tl=zh-CN`; result `你好世界` | UC3 | FR-23 | Pass |
| TC-41 | Translator network failure (services) | Fake fetch throws | Rejects with status 502 | UC3 | FR-23 | Pass |
| TC-42 | `validatePoiInput` normalisation (services) | Name with spaces, string numbers, radius 30.6, empty `en` row | Name trimmed; radius 31; priority 1; 1 translation kept | UC3 | FR-25 | Pass |
| TC-43 | Batch containing a deleted POI is partially accepted (analytics) | POST batch: one record with POI 999, one valid record | 201, `{inserted: 1, skipped: 1}` | UC1, UC5 | FR-10 | Pass |

### 5.2 Mobile app test cases

Evidence: **unit** = jest test in `mobile/src/__tests__/` (62 tests, run 18/10/2026); **live** = `backend.live.test.ts` against a running seeded backend (5 tests). **Pending (device)** = needs a phone, emulator or simulator; the app has not yet been run on any device.

| ID | Title | Steps | Expected result | UC | FR | Evidence | Status |
|---|---|---|---|---|---|---|---|
| TC-44 | Location permission denied | Fresh install; deny location | Explanation with "Open Settings" and "Retry"; automatic narration off; QR and manual play usable | UC1 E1 | FR-01 | – | Pending (device) |
| TC-45 | Sync decision and bundle validation | `planSync`, `validateBundle`, `diffBundles` with synthetic data | Download when no data, different version or old local format; skip when equal; malformed POIs and dangling tour/QR references removed; bundle without `qrcodes` accepted | UC1 | FR-02, FR-03 | unit (`sync-qr.test.ts`) | Pass |
| TC-46 | First sync on device | Fresh install, online; open app | Snapshot stored in SQLite; POIs on map; Settings shows content version | UC1 | FR-02 | – | Pending (device) |
| TC-47 | Version check matches server | Live: `/api/sync/version` vs `/api/sync` | Same version number | UC1 | FR-03 | live | Pass |
| TC-48 | Background location | Dev build; enable "Keep running in background"; grant "Always"; lock screen and move | Updates continue; narration on entry; Android shows foreground-service notification | UC1 | FR-04 | – | Pending (device) |
| TC-49 | Geofence entry once per visit | Fixes approaching a POI, then inside; exactly at radius | One trigger; distance = radius counts as inside | UC1 | FR-05 | unit (`geofence.test.ts`) | Pass |
| TC-50 | Accuracy filter | Fix inside radius with accuracy 80 m; accuracy unknown | First ignored; null accuracy processed | UC1 | FR-05 | unit | Pass |
| TC-51 | Priority, distance, tie-break | Overlapping POIs with different and equal priorities; leave the high-priority POI while still inside a lower one | Highest priority; then nearest; then lower id; lower POI triggered after leaving the higher | UC1 | FR-06 | unit | Pass |
| TC-52 | Exit hysteresis and boundary jitter | Oscillate around the boundary; exit beyond 1.2 × radius and re-enter | No repeated trigger while oscillating; new visit triggers again after a real exit | UC1 | FR-07 | unit | Pass |
| TC-53 | Discard while playing | Geofence trigger during playback | Rejected as `busy`, not queued | UC1 A1 | FR-08 | unit (`cooldown.test.ts`) | Pass |
| TC-54 | Cooldown window | Play POI A; trigger A inside and after the window; other POI; configured minutes; invalid value | Rejected inside window, allowed after; other POI unaffected; invalid value falls back to 10 min | UC1 A1 | FR-08 | unit | Pass |
| TC-55 | Source selection and audio failure | POI with downloaded file; with server URL online; offline without file; audio error | Local file; else server URL; else TTS in the right language; audio error switches to TTS with exactly one log | UC1 | FR-09, FR-10 | unit | Pass |
| TC-56 | Language fallback | Selected language missing; empty translation; only audio; no Vietnamese | Vietnamese used and flagged; empty rows ignored; audio-only valid; otherwise any language with content; TTS locale exists for all 6 languages | UC1, UC2 A1 | FR-09 | unit (`language.test.ts`) | Pass |
| TC-57 | Manual and QR interrupt | Manual play during a narration | Previous narration stopped and logged; new one plays without cooldown | UC2 | FR-15 | unit | Pass |
| TC-58 | Anonymous logging policy | Location samples at intervals/distances; session ID format; batching | First sample kept; ~30 s when still; ≥ 25 m but ≥ 5 s apart when moving; session ID matches server rule; batches ≤ size; server rejects bad session ID | UC5 | FR-10, FR-34 | unit, live | Pass |
| TC-59 | Offline log queue upload | Airplane mode; play 3 narrations; reconnect | Records queued, uploaded within ~60 s, removed after 201, visible in CMS | UC1, UC5 | FR-10, FR-34 | – | Pending (device) |
| TC-60 | No data and offline | Fresh install in airplane mode | "You are offline and no data is stored on this device…" | UC1 E2 | FR-11 | – | Pending (device) |
| TC-61 | Simulated tour walk triggers POIs in order | Live: run the simulation path for every seeded tour through the geofence engine | Every stop triggered in tour order | UC1 | FR-12 | live | Pass |
| TC-62 | Simulation mode on screen | Settings → Location simulation; tap map inside a circle; "Simulate walking this tour" | Narration starts; marker walks the tour and pauses while playing | UC1 | FR-12 | – | Pending (device) |
| TC-63 | QR payload parsing | `NARR:<code>`, URL `.../q/<code>`, bare code, garbage | Code extracted; garbage rejected (E1); API path URL-encoded | UC2 | FR-14, FR-16 | unit | Pass |
| TC-64 | QR codes resolve consistently | Live: resolve every synced QR via `/api/qr`; invalid code | Same POI as the snapshot; 404 for invalid | UC2 | FR-14, FR-16 | live | Pass |
| TC-65 | Camera scanning | Scan tab; allow camera; scan printed code; also "Enter code manually" | Code decoded and resolved | UC2 | FR-13 | – | Pending (device) |
| TC-66 | QR plays immediately in selected language | Select English; GPS off; scan seeded code | English narration starts at once; log method `qr` | UC2, A1 | FR-15, FR-18 | – | Pending (device) |
| TC-67 | Invalid QR on screen | Scan a QR with arbitrary text | "Invalid QR code" | UC2 E1 | FR-16 | – | Pending (device) |
| TC-68 | Offline QR | Airplane mode after sync: scan a synced code; scan an unknown code | Synced code plays ("Using saved data (offline)"); unknown code shows the offline message (E2) | UC2 E2 | FR-14, FR-17 | – | Pending (device) |
| TC-69 | Language setting | Change narration language; restart app | Setting persisted in SQLite; UI switches Vietnamese/English | UC2 A1 | FR-19 | – | Pending (device) |
| TC-70 | Tours in the app | Tours tab → tour → "Follow this tour" | Stops in order with next-stop distance; completion message | UC4 | FR-33 | – | Pending (device) |
| TC-71 | Map rendering | Map tab online and offline | Leaflet map with POI circles and legend; offline: circles without background tiles | UC1 | FR-04 | unit (HTML syntax only) | Pending (device) |

Static checks also passed on 18/10/2026 (reported by the mobile developer): `tsc --noEmit` clean, `expo-doctor` 20/20, `expo export` for Android and iOS succeeded.

### 5.3 CMS test cases

Evidence: **unit** = vitest in `cms/src/lib/*.test.ts` (36 tests, run 18/10/2026); **browser E2E** = scripted run in headless Chrome against the live backend with seed data, carried out by the CMS developer on 18/10/2026.

| ID | Title | Steps | Expected result | UC | FR | Evidence | Status |
|---|---|---|---|---|---|---|---|
| TC-72 | API client behaviour | Unit tests of `lib/api.ts` | Bearer token sent; JSON and multipart handled; 400 → `ApiError` with field details; 401 from admin API calls `onUnauthorized`, 401 from login does not; network error mapped | UC3–UC5 | FR-20, FR-25 | unit (`api.test.ts`) | Pass |
| TC-73 | Login, logout, redirect on 401 | Log in; open protected page with invalid token | Dashboard after login; redirect to `/login?next=…` and back after login | UC3 | FR-20 | browser E2E | Pass |
| TC-74 | POI create/edit with map | "Add POI"; click map, drag pin; fill fields; save; edit | Coordinates from map; POI saved, listed and editable | UC3 | FR-21, FR-22 | browser E2E | Pass |
| TC-75 | Client-side validation and server errors | Unit tests of `lib/validation.ts` | Range errors for coordinates, radius, priority; Vietnamese text required; server `details` mapped to fields | UC3 E1 | FR-25 | unit (`validation.test.ts`) | Pass |
| TC-76 | Auto-translate | "Translate from Vietnamese" and "Translate all empty languages" | Tabs filled with live machine translation, editable | UC3 | FR-23 | browser E2E | Pass |
| TC-77 | Audio upload, TTS, remove | Upload file; "Create voice"; preview; remove audio | Audio playable; source shown; removal reflected | UC3 | FR-24 | browser E2E | Pass |
| TC-78 | Image upload | Upload image in POI form; save | Image shown and stored in `image_url` | UC3 | FR-22 | browser E2E | Pass |
| TC-79 | Delete POI with confirmation | Delete; cancel; delete and confirm | Cancel keeps POI; confirm removes it | UC3 A1 | FR-26 | browser E2E (POI CRUD) | Pass |
| TC-80 | Unsaved-changes warning | Edit form; navigate away | Confirmation dialog shown | UC3 | NFR-13 | browser E2E | Pass |
| TC-81 | QR create and download | In POI page create QR with label; download PNG | QR listed with label; PNG downloaded | UC3 A2 | FR-27 | browser E2E | Pass |
| TC-82 | QR print sheet | QR page; select codes; "Print QR sheet"; print | A4 sheet, 4 codes per page with labels | UC3 A2 | FR-27 | – (print dialog not verified) | Pending |
| TC-83 | Tour create and reorder | New tour; add POIs; reorder by drag and by keyboard; save | Numbered polyline follows order; saved order matches | UC4 | FR-29, FR-30 | browser E2E | Pass |
| TC-84 | Empty tour blocked | Save tour without POIs | Error shown, not saved | UC4 E1 | FR-31 | unit + backend TC-26 | Pass |
| TC-85 | Delete tour with confirmation | Delete tour; confirm | Removed only after confirmation | UC4 A1 | FR-32 | – | Pending |
| TC-86 | Analytics dashboard | Seed `--demo`; open Analytics; change date presets and tour filter; toggle routes | KPIs, charts, heatmap and routes update; hourly chart in Vietnam time | UC5 | FR-35 to FR-37 | browser E2E; unit (`format.test.ts`) | Pass |
| TC-87 | No-data state | Filter an empty date range | "No data" message (UC5 E1) | UC5 E1 | FR-37 | browser E2E | Pass |
| TC-88 | Excel export | "Export Excel" | Multi-sheet .xlsx downloaded | UC5 A1 | FR-38 | browser E2E; unit (`reportSheets`) | Pass |
| TC-89 | PDF export | "Export PDF" → report page → "Print / Save as PDF" | Print-optimised report renders; browser saves PDF | UC5 A1 | FR-38 | browser E2E (report page only) | Partial: page Pass, real print dialog Pending |
| TC-90 | Change password in CMS | Account → change password with wrong and valid current password | Field errors for wrong input; success message; new password works | UC3 | FR-20 | unit (form rule); backend TC-06 | Pending |
| TC-91 | Responsive layout | 375 px wide viewport on all pages | No horizontal page scroll; menu collapses | – | NFR-12 | browser E2E | Pass |
| TC-92 | Production build behind proxy | `npm run build` with `VITE_API_URL`; serve `dist/` behind reverse proxy | Pages load; API and `/uploads` reach the backend | – | – | – | Pending |

Not yet verified for the CMS: real print dialog, successful password change through the UI, screen-reader use, production build behind `VITE_API_URL`.

## 6. Manual field-test checklist (GPS at real POIs)

No field test has been carried out yet. Record date, device, OS, weather and tester for each run.

Preparation:
- [ ] Verify each seed POI coordinate on a map (seed values are approximate) and correct it in the CMS.
- [ ] Production or LAN backend reachable from phones; content synced on every test device.
- [ ] Print the bus-stop QR codes from the CMS (A5 or larger) and take them to the stops.
- [ ] Charge devices; note battery level at start.
- [ ] Simulation mode OFF.

| ID | Check | Procedure | Pass criterion | FR / NFR | Result |
|---|---|---|---|---|---|
| FT-01 | Permissions on real devices | Fresh install on Android and iOS; grant "while using" then "always" location; camera | Prompts appear with clear purpose text; app works in both modes | FR-01, FR-04, FR-13 | Pending (device) |
| FT-02 | Entry trigger distance | Walk towards each of at least 3 POIs from 200 m away at normal pace; note GPS distance when narration starts | Narration starts within radius and within 2 s of the app detecting entry; record actual trigger distance | FR-05, NFR-01, NFR-02 | Pending (device) |
| FT-03 | Background and locked screen | Repeat FT-02 with app in background and screen locked | Narration still plays (record OS-specific limits if not) | FR-04 | Pending (device) |
| FT-04 | Boundary jitter | Stand at the radius boundary for 3 minutes | At most one narration | FR-07 | Pending (device) |
| FT-05 | Cooldown | Leave a POI and come back within 10 minutes; again after 10 minutes | No replay; then replay | FR-08 | Pending (device) |
| FT-06 | QR at bus stops | Scan the installed codes at Khanh Hoi, Vinh Hoi and Xom Chieu stops in daylight and in the evening | Narration starts immediately; method recorded as `qr` | FR-15, FR-18 | Pending (device) |
| FT-07 | Offline operation | Sync, enable airplane mode, walk to two POIs, then reconnect | Narration works offline; logs appear in CMS after reconnect | NFR-04, FR-10 | Pending (device) |
| FT-08 | Overlapping POIs | Walk where two geofences overlap (e.g. Vinh Khanh food street and Vinh Hoi bus stop, if overlapping after coordinate check) | Higher-priority POI plays; the other is not queued | FR-06, FR-08 | Pending (device) |
| FT-09 | Battery and data use | Run the app for 1 hour of walking | Record battery drop and mobile data used; no crash | NFR (usability) | Pending (device) |

## 7. Traceability summary
Every FR in `01-SRS.md` §4 has at least one test case. Server-side behaviour is covered by the 43 passing backend tests. Mobile logic (geofence, cooldown, narration, language fallback, QR parsing, sync decisions, logging policy) is covered by passing unit and live tests; everything that needs the device runtime (permissions, GPS, background location, camera, audio/TTS output, map, on-device SQLite) is Pending (device). CMS behaviour is covered by unit tests and a browser E2E run, except the items listed at the end of §5.3.
