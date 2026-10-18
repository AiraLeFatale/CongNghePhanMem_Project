# Software Design Description

**Project:** Multilingual Automatic Narration System
**Document version:** 1.0 (18/10/2026)
**Related documents:** `01-SRS.md` (requirements FR/NFR), `api.md` (REST contract), `03-test-plan.md`

This document describes the implemented code: `backend/src` (Express API), `cms/src` (admin web) and `mobile/src` (Expo app). File and module names below match the repository on 18/10/2026.

---

## 1. Architecture

### 1.1 System context and components
The system follows a client–server architecture with two clients (mobile app, CMS web) sharing one REST backend. The mobile app is offline-first: it keeps a local copy of content (including QR codes) and only needs the network for sync, map background tiles, audio streaming of files not yet downloaded, and log upload.

```mermaid
flowchart TB
    QR["QR codes<br/>Bus stops"]
    MOBILE["Mobile app (Expo)<br/>Geofence, QR, playback"]
    CMS["CMS web (React)<br/>Admin content tools"]
    BACKEND["Backend API (Express 5)<br/>Content, sync, analytics"]
    EXT["External services<br/>Google Translate, Google TTS"]
    DB[("SQLite database<br/>POIs, admins, logs")]
    FS[("uploads/ directory<br/>Audio and images")]
    TILES["Map tiles<br/>OpenStreetMap, CARTO"]

    QR -. "camera scan" .-> MOBILE
    MOBILE -.-> TILES
    CMS -.-> TILES
    MOBILE <-->|"HTTPS / JSON"| BACKEND
    CMS -->|"HTTPS / JSON + JWT"| BACKEND
    BACKEND --> EXT
    BACKEND --> DB
    BACKEND --> FS
```

Refinements compared with the team's original component diagram (README §1): the database is a single SQLite file accessed through `node:sqlite`; file storage is a local `uploads/` directory served statically at `/uploads`; translate/TTS APIs are used only by the backend on behalf of the CMS, never by the mobile app (the app uses on-device TTS). Both clients load map background tiles directly from public tile servers (CMS: OpenStreetMap; app: CARTO Voyager).

### 1.2 Backend: layered architecture

```mermaid
flowchart TB
    MOBILE["Mobile app"]
    CMS["CMS web"]

    subgraph BACKEND["Backend (backend/src)"]
        MW["Middleware<br/>helmet, cors, json 1 MB, rate limit,<br/>requireAdmin (JWT), multer upload, error handler"]
        CTRL["Controller layer<br/>routes/index.js, controllers/*"]
        SVC["Service layer<br/>services/* : validation, business rules"]
        REPO["Repository layer<br/>repositories/* : SQL"]
    end

    TR["Translate provider<br/>google-free, libretranslate, none"]
    TTS["TTS provider<br/>google-free, none"]
    DB[("SQLite<br/>data/narration.db")]
    FS[("uploads/")]

    MOBILE --> MW
    CMS --> MW
    MW --> CTRL
    CTRL --> SVC
    SVC --> REPO
    SVC --> TR
    SVC --> TTS
    REPO --> DB
    SVC --> FS
```

Rules applied:
- Controllers only parse HTTP input (`idParam`, `req.body`, `req.file`) and format responses; they contain no business rules.
- Services own validation and business rules (UC3 E1, UC4 E1, log validation, coordinate rounding, content versioning) and open transactions.
- Repositories own SQL and return plain objects. They never throw business errors.
- Composition happens once in `app.js` (`createRepositories(db)` → `createServices(repos, {translator, tts})` → `createRouter(services)`). Translate and TTS providers are injected, which lets tests replace them with fakes.
- Errors are raised as `AppError(status, code, message, details)` and converted to JSON by `middleware/error.js`.

Files are written by the service/middleware layer (multer disk storage, `saveBuffer`, `removeAudioFile`) rather than by repositories; the original diagram's "Repository → File storage" edge is therefore drawn from the service layer here.

### 1.3 Backend module list

| Layer | Module | Responsibility | UC |
|---|---|---|---|
| Entry | `server.js` | Opens DB, ensures upload dir, refuses production start with the default JWT secret, listens on `PORT` | all |
| Entry | `app.js` | Wires layers, security middleware, static `/uploads`, `/api` router | all |
| Config | `config.js` | Environment variables, language list, default language `vi` | all |
| Routes | `routes/index.js` | Public routes, `/auth/login`, `/admin/*` guarded by `requireAdmin`, rate limiters | all |
| Controller | `publicController` | health, languages, sync, QR resolve, log ingestion | UC1, UC2, UC5 |
| Controller | `authController` | login, me, change password | UC3–UC5 |
| Controller | `poiController` | POI CRUD, audio upload/remove, TTS, images, translate, QR | UC3 |
| Controller | `tourController` | Tour CRUD | UC4 |
| Controller | `analyticsController` | Report | UC5 |
| Service | `authService` | bcrypt verification, JWT issue/verify, password change | UC3–UC5 |
| Service | `poiService` | `validatePoiInput`, transactional create/update/delete, audio attach/remove, clean-up of replaced audio and image files, version bump | UC3 |
| Service | `tourService` | Tour validation (≥ 1 POI, unique, existing), ordered save, version bump | UC4 |
| Service | `qrService` | Random payload generation, `extractPayload`, resolve to POI; create/delete bump the content version | UC2, UC3 A2 |
| Service | `syncService` | Content version, full snapshot (POIs with translations, QR codes, tours) | UC1, UC2, UC4 |
| Service | `logService` | Validate and insert usage/location batches; skip usage records of deleted POIs (`{inserted, skipped}`); 4-decimal rounding | UC1, UC2, UC5 |
| Service | `analyticsService` | Filter parsing, tour bounding box, report assembly | UC5 |
| Service | `translateService` | Provider adapter (Google free endpoint, LibreTranslate, none), input limits | UC3 |
| Service | `ttsService` | Text chunking (≤ 180 chars), Google TTS calls, MP3 concatenation | UC3 |
| Repository | `adminRepository`, `poiRepository`, `translationRepository`, `qrRepository`, `tourRepository`, `logRepository`, `metaRepository`, `analyticsRepository` | SQL per aggregate | all |
| DB | `db/database.js` | Schema DDL, `openDatabase`, `transaction()` helper | all |
| DB | `db/seed.js` | Sample data (8 POIs in District 4, 2 tours, 5 bus-stop QR codes); `--demo` adds 30 days of simulated logs | demo |
| Middleware | `auth.js`, `upload.js`, `error.js` | Bearer token guard; MIME/size-checked uploads with random names; error mapping | all |

### 1.4 Mobile app (`mobile/`, Expo SDK 58, React Native 0.88, TypeScript, Expo Router)

```mermaid
flowchart LR
    subgraph MOBILE["Mobile app (mobile/src)"]
        LOC["Location service<br/>services/location"]
        SIM["Simulation<br/>services/simulation.ts"]
        PIPE["Pipeline<br/>services/pipeline.ts"]
        GEO["Geofence engine<br/>engine/geofence.ts, geo.ts"]
        GATE["Cooldown gate<br/>engine/cooldown.ts"]
        NAR["Narration engine<br/>engine/narration.ts, language.ts"]
        OUT["Audio output<br/>services/audioOutput.ts<br/>expo-audio, expo-speech"]
        QRS["QR scanner<br/>app/(tabs)/scan.tsx, engine/qr.ts"]
        QRR["QR resolver<br/>services/qrResolver.ts"]
        UI["Screens<br/>app/, components/"]
        CONTENT[("Content layer<br/>data/db.ts (SQLite)")]
        SYNC["Sync<br/>data/sync.ts, syncLogic.ts, audioCache.ts"]
        LOGQ["Analytics queue<br/>services/analytics.ts"]
    end
    API["Backend API<br/>data/api.ts"]

    LOC --> PIPE
    SIM --> PIPE
    PIPE --> GEO
    GEO --> PIPE
    PIPE --> NAR
    NAR --> GATE
    NAR --> OUT
    QRS --> QRR
    QRR --> CONTENT
    QRR -. "unknown code, online" .-> API
    QRR --> NAR
    CONTENT --> PIPE
    CONTENT --> UI
    SYNC --> CONTENT
    SYNC <--> API
    NAR --> LOGQ
    PIPE --> LOGQ
    LOGQ --> API
```

| Module (file) | Design as implemented |
|---|---|
| Entry (`index.js`) | Defines the background location task before loading `expo-router/entry` (required by TaskManager). |
| Screens (`src/app/`) | Tabs `(tabs)/index.tsx` Map, `tours.tsx`, `scan.tsx`, `settings.tsx`; detail screens `poi/[id].tsx`, `tour/[id].tsx`. Shared `MiniPlayer`, `NoticeBanner`, `ui.tsx`. UI strings in `src/i18n` (Vietnamese UI when the narration language is `vi`, English otherwise). |
| Map (`src/components/map/`) | `LeafletMap.tsx`: `react-native-webview` hosting Leaflet, which is embedded in the bundle (`leafletAssets.generated.ts`), so POI circles and the user position render offline (only background tiles need the network). Chosen over `react-native-maps` because it behaves the same in Expo Go, dev builds and store builds and needs no Google Maps key. |
| Location service (`src/services/location/`) | Foreground `watchPositionAsync`; background `startLocationUpdatesAsync` + `expo-task-manager` (`backgroundTask.ts`) when the user enables "Keep running in background" and grants "Always" permission. Background mode is unavailable in Expo Go; the app falls back to foreground GPS. |
| Pipeline (`src/services/pipeline.ts`) | Single path Location → Geofence → Narration (+ location sampling) used by real GPS, background GPS and simulation. Holds the singleton `GeofenceEngine`, `CooldownGate`, `NarrationEngine`. |
| Geofence engine (`src/engine/geofence.ts`, `geo.ts`) | Pure TypeScript. Drops fixes with `accuracy > 60 m`; enters a POI when haversine distance ≤ `radius_m`; exits only when distance > `radius_m × 1.2`; among all POIs the user is inside, picks highest `priority`, then nearest, then lowest id; triggers each POI at most once per visit (a visit ends on exit). |
| Cooldown gate (`src/engine/cooldown.ts`) | For `geofence` triggers: rejects with `busy` while anything is playing and with `cooldown` if the same POI started playing less than the cooldown ago (default 10 min, configurable 0–240 in Settings). `manual` and `qr` triggers bypass the cooldown and interrupt the current playback. |
| Narration engine (`src/engine/narration.ts`, `language.ts`) | Resolves the translation: selected language → Vietnamese → any language with content (user is notified of the fallback). Source order: downloaded file → server `audio_url` when online → on-device TTS (`expo-speech`, locale from `TTS_LOCALE`). An audio error switches to TTS. On finish/stop logs `listen_seconds`. Audio/speech are injected adapters (`services/audioOutput.ts`), so the engine is unit-tested without a device. |
| QR (`src/engine/qr.ts`, `src/services/qrResolver.ts`, `app/(tabs)/scan.tsx`) | `expo-camera` reads QR codes only; a "Enter code manually" field supports emulators. `parseQrPayload` accepts `NARR:<code>`, bare code and `.../q/<code>`. Lookup order: synced `qr_code` table (offline) → `qr_cache` (codes resolved before) → `GET /api/qr/:payload`. 404/400 → "Invalid QR code" (E1); not found locally and offline → E2 message. A POI returned by the server but missing locally is stored so it plays offline next time. |
| Content layer (`src/data/db.ts`) | `expo-sqlite`, WAL. Content tables are replaced in one transaction on each sync (§6.2). |
| Sync (`src/data/sync.ts`, `syncLogic.ts`, `audioCache.ts`) | Runs on launch, every 5 min, when the app returns to foreground and when connectivity returns. `GET /api/sync/version`; if it differs from the local version (or no data / old local format) downloads `/api/sync`, validates it (`validateBundle` drops malformed POIs and tours/QRs pointing to missing POIs) and replaces content atomically; on error the old data is kept. Afterwards prunes unused audio files and pre-downloads audio of the selected language; "Download all audio" in Settings fetches the rest. |
| Analytics queue (`src/services/analytics.ts`, `analyticsPolicy.ts`) | `SESSION_ID` generated with `expo-crypto` per launch, kept in memory. Usage records and location samples (every ~30 s, or after ≥ 25 m but not more often than every 5 s) are stored in `usage_queue` / `location_queue` and flushed every 60 s in batches of 200. If the server rejects a batch with 400 the records are sent one by one and invalid ones dropped. Turning off "Send anonymous data" stops logging and clears the queues. |
| Simulation (`src/services/simulation.ts`) | "Location simulation" in Settings ignores real GPS: tap the map to place a fake position, or "Simulate walking this tour" moves a marker through the tour stops at ×1–×30 speed, pausing while narration plays. |
| Configuration (`src/config.ts`) | Server URL priority: Settings → `EXPO_PUBLIC_API_URL` → LAN IP of the Metro host (`hostUri`) + port 4000 → platform default (`10.0.2.2` Android emulator, `localhost` iOS simulator). |

Geofence algorithm per fix (as in `GeofenceEngine.update`):

```text
if fix.accuracy is known and > 60 m: ignore fix
for poi in pois:
    d = haversine(fix, poi)
    if poi not in inside and d <= poi.radius_m: inside.add(poi)
    else if poi in inside and d > poi.radius_m * 1.2:
        inside.remove(poi); triggeredThisVisit.remove(poi)
best = argmax over inside of (priority, -distance, -id)
if best exists and best not in triggeredThisVisit:
    triggeredThisVisit.add(best); emit trigger(best)      # cooldown/busy checked by the narration engine
```

A consequence of evaluating all POIs the user is inside (not only new entries): when the user leaves a high-priority POI but is still inside a lower-priority one, the lower one is triggered then.

### 1.5 CMS web (`cms/`, Vite 8, React 19, TypeScript)

```mermaid
flowchart LR
    subgraph CMS["CMS web (cms/src)"]
        AUTH["auth/AuthContext.tsx<br/>login, RequireAuth, 401 handling"]
        PAGES["pages/<br/>Login, Dashboard, PoiList, PoiEdit, Qr,<br/>TourList, TourEdit, Analytics,<br/>AnalyticsReport, Account"]
        COMP["components/<br/>Layout, maps, charts, QrImage,<br/>ConfirmDialog, Toast, States"]
        LIB["lib/<br/>api.ts, validation.ts, exportExcel.ts,<br/>format.ts, qr.ts, storage.ts"]
    end
    API["Backend API"]
    TILES["OpenStreetMap tiles"]

    PAGES --> AUTH
    PAGES --> COMP
    PAGES --> LIB
    AUTH --> LIB
    LIB --> API
    COMP -.-> TILES
```

| Module (file) | Design as implemented |
|---|---|
| Routing (`App.tsx`, react-router) | `/login`; protected layout with `/` (dashboard), `/pois`, `/pois/:id` (`new` for creation), `/tours`, `/tours/:id`, `/qr`, `/analytics`, `/account`; `/analytics/report` is a protected print layout without the sidebar. |
| API client (`lib/api.ts`) | Base URL from `VITE_API_URL` (empty = same origin; in dev Vite proxies `/api` and `/uploads`). Adds `Authorization: Bearer`, converts errors to `ApiError` with field `details`, calls `onUnauthorized` on 401 from admin APIs (not from login), maps network failures to `NETWORK_ERROR`. `fileUrl` prefixes `/uploads/...` with the backend origin. |
| Auth (`auth/AuthContext.tsx`, `lib/storage.ts`) | Token stored through a safe localStorage wrapper (in-memory fallback). On 401 the user is sent to `/login?next=<current page>`. |
| Validation (`lib/validation.ts`) | Mirrors backend rules (coordinates, radius 0–5000, priority 0–100, Vietnamese text required, secondary language with title but no text is an error, tour not empty) and maps server `details` to form fields (`mapServerErrors`). |
| POI editor (`pages/PoiEditPage.tsx`, `components/maps.tsx`) | react-leaflet map: click to place, draggable pin, radius circle, other POIs dimmed; manual lat/lng inputs; image upload; six language tabs with "Translate from Vietnamese" and "Translate all empty languages"; per-language audio: upload file, "Create voice" (TTS, asks to save first because TTS uses saved text), preview, remove; QR section (create with label, download PNG, print, delete). Unsaved-changes warning (`useUnsavedWarning`). |
| QR (`pages/QrPage.tsx`, `components/QrImage.tsx`, `lib/qr.ts`) | Lists all codes with POI filter; select codes and print an A4 sheet (4 per page) with stop label, POI name and "scan to listen" text. Images are generated in the browser with `qrcode` from `content` (`NARR:<payload>`). |
| Tours (`pages/TourEditPage.tsx`) | Add POIs, reorder by drag-and-drop or up/down buttons (keyboard accessible, screen-reader announcements), numbered route polyline; empty tour blocked (E1). |
| Analytics (`pages/AnalyticsPage.tsx`, `components/charts.tsx`) | Date presets (7/30/90 days, default 30) and tour filter; KPIs; Chart.js charts (top POIs, average listening time per POI, daily, trigger method, language, hourly converted from UTC to Vietnam time); `leaflet.heat` heatmap with toggle for anonymous routes; "No data" state when `has_data=false`. |
| Export (`lib/exportExcel.ts`, `pages/AnalyticsReportPage.tsx`) | "Export Excel": multi-sheet workbook with SheetJS (`xlsx` 0.20.3). "Export PDF": opens the print-optimised report page and the browser's print dialog ("Save as PDF"), because jsPDF cannot render Vietnamese diacritics without embedding a font. |
| Dashboard / Account | Counts of POIs, tours, QR codes; last-7-days figures; to-do list (POIs missing audio, languages or QR). Account page shows the admin and changes the password. |

## 2. Class diagram (backend services and repositories)

The backend uses factory functions returning objects rather than ES classes; each factory is modelled as a class below. Only the main public operations are shown.

```mermaid
classDiagram
    class AuthService {
        +login(username, password) TokenResult
        +verify(token) Admin
        +changePassword(userId, current, next)
        +hashPassword(pw)
    }
    class PoiService {
        +list(q) PoiSummary[]
        +get(id) Poi
        +create(body, adminId) Poi
        +update(id, body) Poi
        +delete(id)
        +attachAudio(id, lang, file, source) Poi
        +removeAudio(id, lang) Poi
    }
    class TourService {
        +list() TourSummary[]
        +get(id) Tour
        +create(body, adminId) Tour
        +update(id, body) Tour
        +delete(id)
    }
    class QrService {
        +listAll() QrCode[]
        +listForPoi(poiId) QrCode[]
        +create(poiId, label) QrCode
        +delete(id)
        +resolve(raw) QrResolution
    }
    class SyncService {
        +version() int
        +snapshot() Snapshot
    }
    class LogService {
        +recordUsage(body) int
        +recordLocations(body) int
    }
    class AnalyticsService {
        +report(query) Report
    }
    class Translator {
        +provider
        +translate(text, source, target) string
    }
    class Tts {
        +provider
        +synthesize(text, lang) Buffer
    }

    class AdminRepository {
        +findByUsername(username)
        +findById(id)
        +create(data)
        +updatePassword(id, hash)
    }
    class PoiRepository {
        +list(q)
        +findById(id)
        +listWithTranslations()
        +create(data, adminId)
        +update(id, data)
        +delete(id)
        +touch(id)
    }
    class TranslationRepository {
        +listForPoi(poiId)
        +find(poiId, lang)
        +upsertText(poiId, t)
        +deleteExcept(poiId, codes)
        +setAudio(poiId, lang, url, source)
        +clearAudio(poiId, lang)
    }
    class QrRepository {
        +listAll()
        +listForPoi(poiId)
        +findByPayload(payload)
        +create(poiId, payload, label)
        +delete(id)
    }
    class TourRepository {
        +list()
        +listWithPois()
        +findById(id)
        +create(data, adminId)
        +update(id, data)
        +setPois(id, poiIds)
        +delete(id)
    }
    class LogRepository {
        +insertUsage(rows)
        +insertLocations(rows)
    }
    class MetaRepository {
        +getContentVersion() int
        +bumpContentVersion() int
    }
    class AnalyticsRepository {
        +summary(f)
        +byMethod(f)
        +byLanguage(f)
        +perPoi(f)
        +daily(f)
        +hourly(f)
        +heatmap(f)
        +routes(f)
    }

    AuthService --> AdminRepository
    PoiService --> PoiRepository
    PoiService --> TranslationRepository
    PoiService --> QrRepository
    PoiService --> MetaRepository
    TourService --> TourRepository
    TourService --> PoiRepository
    TourService --> MetaRepository
    QrService --> QrRepository
    QrService --> PoiRepository
    SyncService --> PoiRepository
    SyncService --> TourRepository
    SyncService --> MetaRepository
    LogService --> LogRepository
    LogService --> PoiRepository
    AnalyticsService --> AnalyticsRepository
    AnalyticsService --> TourRepository
```

`Translator` and `Tts` are used by `poiController` (`/admin/translate`, `/admin/pois/:id/tts/:lang`); the TTS result is then stored through `PoiService.attachAudio`.

---

## 3. Activity diagrams

### 3.1 UC1: Trigger automatic narration via geofence

```mermaid
flowchart TD
    S(["Start: user opens app"]) --> D{"Local POI data available?"}
    D -- "No" --> N{"Server reachable?"}
    N -- "No" --> E2["Show: offline and no data, connect to download (E2)"] --> X2(["End"])
    N -- "Yes" --> SY["Download snapshot into SQLite"] --> P
    D -- "Yes" --> V["Check content version in background"] --> P
    P{"Location permission granted?"}
    P -- "No" --> E1["Show explanation, Open Settings and Retry; automatic narration off; QR and manual play still available (E1)"] --> X1(["End"])
    P -- "Yes" --> L["Receive location fix (GPS or simulation)"]
    L --> A{"Accuracy within 60 m?"}
    A -- "No" --> W["Show weak GPS notice"] --> L
    A -- "Yes" --> G["Update inside-set: enter at radius, exit beyond radius x 1.2"]
    G --> SEL["Best inside POI: highest priority, then nearest"]
    SEL --> NE{"Best POI not yet triggered in this visit?"}
    NE -- "No" --> L
    NE -- "Yes" --> BUSY{"Playing, or POI started within cooldown?"}
    BUSY -- "Yes" --> DIS["Discard trigger, show notice (A1)"] --> L
    BUSY -- "No" --> RES["Resolve content: selected language, else Vietnamese"]
    RES --> AU{"Audio file local, or online URL?"}
    AU -- "Yes" --> PA["Play audio file"]
    AU -- "No" --> PT["Read text with on-device TTS"]
    PA -- "audio error" --> PT
    PA --> LOG["On finish or stop: queue usage log with seconds listened"]
    PT --> LOG
    LOG --> L
```

The app syncs before asking for location permission, so E2 is checked first; this does not change the outcome of either exception path.

### 3.2 UC2: Trigger content via QR code scan

```mermaid
flowchart TD
    S(["Start: user opens Scan QR tab"]) --> C{"Camera permission granted?"}
    C -- "No" --> CE["Ask for camera; manual code entry remains available"] --> SC
    C -- "Yes" --> SC["Scan QR code at bus stop or enter code manually"]
    SC --> DEC{"Payload parses as NARR code, bare code or URL?"}
    DEC -- "No" --> E1
    DEC -- "Yes" --> LQ{"Code in synced qr_code table or qr_cache?"}
    LQ -- "Yes" --> LANG
    LQ -- "No" --> REQ["GET /api/qr/payload"]
    REQ --> R{"Response"}
    R -- "404 or 400" --> E1["Show: Invalid QR code (E1)"] --> X1(["End"])
    R -- "network error" --> E2["Show: offline and code not stored, retry when connected (E2)"] --> X2(["End"])
    R -- "200" --> CACHE["Save code in qr_cache; store POI if missing locally"] --> LANG
    LANG["Pick selected language (A1), else Vietnamese"]
    LANG --> PLAY["Stop current playback; play audio or on-device TTS immediately"]
    PLAY --> LOG["Queue usage log with method qr"] --> X3(["End"])
```

### 3.3 UC3: Manage POIs and narration content

```mermaid
flowchart TD
    S(["Start"]) --> LG["Login authentication"]
    LG --> DB["Show dashboard"] --> SEL["Open POI management"] --> LST["Show POI list"]
    LST --> ACT{"Action"}
    ACT -- "Delete (A1)" --> CF{"Confirm delete?"}
    CF -- "No" --> LST
    CF -- "Yes" --> DEL["Delete POI, translations, audio, QR codes; bump version"] --> LST
    ACT -- "Create or edit" --> F["Enter name, coordinates on map, radius, priority"]
    F --> T["Enter narration per language; optional auto-translate"]
    T --> SAVE["Save"]
    SAVE --> VAL{"Valid? coordinates, radius greater than 0, Vietnamese text"}
    VAL -- "No" --> ERR["Show field errors (E1)"] --> F
    VAL -- "Yes" --> STORE["Save POI and translations in one transaction; bump content version"]
    STORE --> OPT{"Add audio or QR?"}
    OPT -- "Upload audio" --> UP["Upload file per language"] --> OPT
    OPT -- "Generate TTS" --> TTS["Server TTS from saved text"] --> OPT
    OPT -- "Create QR (A2)" --> QR["Create QR code, print"] --> OPT
    OPT -- "Done" --> E(["End: available at next app sync"])
```

### 3.4 UC4: Manage tours

```mermaid
flowchart TD
    S(["Start"]) --> LG["Login authentication"] --> M["Open tour management"] --> L["Show tour list"]
    L --> ACT{"Action"}
    ACT -- "Delete (A1)" --> CF{"Confirm delete?"}
    CF -- "No" --> L
    CF -- "Yes" --> DEL["Delete tour; bump version"] --> L
    ACT -- "Create or edit" --> F["Enter name and description"]
    F --> P["Select POIs and order them; preview polyline on map"]
    P --> SAVE["Save"]
    SAVE --> V{"At least one POI, no duplicates, all exist?"}
    V -- "No" --> W["Show warning (E1)"] --> P
    V -- "Yes" --> ST["Save tour and ordered POIs in one transaction; bump version"]
    ST --> E(["End: tour available at next app sync"])
```

### 3.5 UC5: View usage analytics

```mermaid
flowchart TD
    S(["Start"]) --> LG["Login authentication"] --> M["Open analytics"] --> F["Show filters: date range, tour"]
    F --> Q["Select filters and request report"]
    Q --> V{"Filters valid?"}
    V -- "No" --> FE["Show filter error"] --> F
    V -- "Yes" --> C["Query anonymous logs: summary, per POI, method, language, daily, hourly, heatmap, routes"]
    C --> H{"Any data?"}
    H -- "No" --> ND["Show: No data available (E1)"] --> E1(["End"])
    H -- "Yes" --> R["Show charts, ranked table, heatmap and routes"]
    R --> X{"Export? (A1)"}
    X -- "Excel" --> XL["Generate multi-sheet .xlsx in browser (SheetJS)"] --> E2(["End"])
    X -- "PDF" --> PDF["Open print report page; browser Save as PDF"] --> E2
    X -- "No" --> E2
```

---

## 4. Sequence diagrams

### 4.1 UC1: Geofence trigger

```mermaid
sequenceDiagram
    autonumber
    participant OS as OS location (GPS)
    participant LOC as services/location
    participant PIPE as services/pipeline
    participant GEO as GeofenceEngine
    participant NAR as NarrationEngine
    participant GATE as CooldownGate
    participant OUT as expo-audio / expo-speech
    participant Q as services/analytics
    participant API as Backend API

    OS->>LOC: location update (lat, lng, accuracy)
    LOC->>PIPE: onFix(fix)
    PIPE->>Q: sampleLocation(fix) if 30 s or 25 m passed
    PIPE->>GEO: update(fix)
    GEO->>GEO: ignore if accuracy over 60 m, hysteresis, best of inside POIs
    GEO-->>PIPE: trigger(poi) once per visit
    PIPE->>NAR: play(poi, geofence, language)
    NAR->>GATE: check(poi, geofence, isPlaying)
    alt busy or cooldown
        GATE-->>NAR: rejected
        NAR-->>PIPE: discarded, show notice (UC1 A1)
    else accepted
        NAR->>NAR: resolve translation (selected, else vi)
        NAR->>GATE: markPlayed(poi, now)
        NAR->>OUT: play local file or server URL, else speak text
        OUT-->>NAR: finished
        NAR->>Q: logPlayback(listen_seconds)
    end
    opt every 60 s when online
        Q->>API: POST /api/logs/usage and /api/logs/location (batches of 200)
        API-->>Q: 201 inserted, skipped
        Q->>Q: delete sent records from queue
    end
```

### 4.2 UC2: QR scan

```mermaid
sequenceDiagram
    autonumber
    actor U as Passenger
    participant CAM as Scan QR screen
    participant RES as qrResolver
    participant DB as Local SQLite
    participant API as Backend publicController
    participant QS as qrService
    participant NAR as NarrationEngine

    U->>CAM: scan code at bus stop
    CAM->>RES: resolveQr(raw)
    RES->>RES: parseQrPayload(raw)
    RES->>DB: qr_code table (synced), then qr_cache
    alt found locally
        DB-->>RES: poi_id, label
    else not found locally
        RES->>API: GET /api/qr/NARR%3Acode
        alt network error
            RES-->>CAM: offline
            CAM-->>U: offline, code not stored (E2)
        else unknown payload
            API->>QS: resolve(raw)
            QS-->>API: AppError 404
            API-->>RES: 404 NOT_FOUND
            RES-->>CAM: invalid
            CAM-->>U: "Invalid QR code" (E1)
        else found
            API->>QS: resolve(raw)
            QS-->>API: qr and poi with translations
            API-->>RES: 200 JSON
            RES->>DB: save in qr_cache, store POI if missing
        end
    end
    CAM->>NAR: play(poi, qr, selected language)
    NAR->>NAR: bypass cooldown, stop current playback, play
```

### 4.3 UC3: Save POI and generate TTS audio

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrator
    participant CMS as CMS web
    participant MW as requireAdmin
    participant C as poiController
    participant S as poiService
    participant R as Repositories
    participant T as ttsService
    participant G as Google TTS
    participant FS as uploads/

    A->>CMS: fill form and click Save
    CMS->>MW: POST /api/admin/pois (Bearer token)
    MW->>MW: verify JWT, load admin
    MW->>C: create(req)
    C->>S: create(body, adminId)
    S->>S: validatePoiInput(body)
    alt invalid
        S-->>CMS: 400 VALIDATION_ERROR with field details
    else valid
        S->>R: transaction: poi.create, translation.upsertText per language, meta.bump
        S-->>CMS: 201 POI with translations
    end
    A->>CMS: click Generate voice (en)
    CMS->>C: POST /api/admin/pois/7/tts/en
    C->>S: get(7)
    C->>T: synthesize(narration_text, "en")
    T->>T: splitText into chunks of 180 chars or less
    loop each chunk
        T->>G: GET translate_tts
        G-->>T: MP3 bytes
    end
    T-->>C: concatenated MP3 buffer
    C->>FS: saveBuffer (tts-random.mp3)
    C->>S: attachAudio(7, "en", file, "tts")
    S->>R: transaction: translation.setAudio, poi.touch, meta.bump
    S->>FS: remove previous audio file if replaced
    S-->>CMS: 200 POI (audio_source tts)
```

### 4.4 Data sync

Triggered on launch, every 5 minutes, when the app returns to the foreground and when connectivity returns (`services/bootstrap.ts`), or by "Sync now" in Settings.

```mermaid
sequenceDiagram
    autonumber
    participant APP as data/sync.ts
    participant DB as Local SQLite
    participant API as Backend API
    participant SS as syncService
    participant FS as /uploads

    APP->>DB: read content_version, POI count, sync_format
    APP->>API: GET /api/sync/version
    API->>SS: version()
    SS-->>APP: version N
    alt N differs from local, or no data, or old local format
        APP->>API: GET /api/sync
        API->>SS: snapshot()
        SS-->>APP: version, languages, pois with translations, qrcodes, tours
        APP->>APP: validateBundle, diffBundles
        APP->>DB: transaction: replace content tables and qr_code, set version N
        APP->>APP: prune audio files no longer referenced
        loop each audio_url of the selected language not yet downloaded
            APP->>FS: GET /uploads/file
            FS-->>APP: audio bytes
            APP->>DB: record in audio_file
        end
    else same version
        APP->>APP: keep local data
    end
```

### 4.5 UC5: Analytics report

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrator
    participant CMS as CMS dashboard
    participant C as analyticsController
    participant S as analyticsService
    participant TR as tourRepository
    participant AR as analyticsRepository

    A->>CMS: choose date range and tour, click View
    CMS->>C: GET /api/admin/analytics?from&to&tour_id
    C->>S: report(query)
    S->>S: parseFilters (dates, from before to)
    opt tour_id given
        S->>TR: findById(tour_id)
        S->>S: bounding box of tour POIs plus about 300 m
    end
    S->>AR: summary, byMethod, byLanguage, perPoi, daily, hourly
    S->>AR: heatmap(bbox), routes(bbox)
    AR-->>S: aggregated rows (no session ids)
    S-->>CMS: report with has_data
    alt has_data is false
        CMS-->>A: "No data available" (E1)
    else
        CMS-->>A: charts, ranking, heatmap, routes
        opt export (A1)
            A->>CMS: Export Excel or Export PDF
            CMS-->>A: .xlsx download, or print page for Save as PDF
        end
    end
```

---

## 5. State diagrams: narration engine

The engine has one global playback state (`NarrationEngine`) and a per-POI state combining the geofence visit (`GeofenceEngine`) and the cooldown (`CooldownGate`). The cooldown is measured from the moment a POI **starts** playing (`markPlayed` is called when playback begins).

Engine playback state:

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Playing : trigger accepted / markPlayed, start audio or TTS
    Idle --> Idle : geofence trigger for POI in cooldown / discard
    Playing --> Playing : geofence trigger / discard, busy (A1)
    Playing --> Playing : manual or QR trigger / stop and log current, play new
    Playing --> Playing : audio error / switch to TTS
    Playing --> Idle : playback finished / log listen_seconds
    Playing --> Idle : user presses Stop / log listen_seconds
```

Per-POI state (geofence triggers only; manual and QR plays ignore it):

```mermaid
stateDiagram-v2
    [*] --> Ready
    Ready --> Inside : distance within radius, accuracy ok, best POI / emit trigger
    Inside --> Inside : jitter inside hysteresis band / no trigger
    Inside --> Cooldown : distance over radius x 1.2, started playing under cooldown ago
    Inside --> Ready : distance over radius x 1.2, not played (trigger discarded)
    Cooldown --> Inside : re-entered / trigger rejected by cooldown gate
    Cooldown --> Ready : cooldown elapsed (default 10 min)
```

A POI cannot re-trigger while the user stays inside its hysteresis band, so standing at the boundary produces at most one trigger; the cooldown additionally covers walking out and back in.

---

## 6. Data design

### 6.1 Server ERD (actual schema, `backend/src/db/database.js`)

```mermaid
erDiagram
    ADMIN_USER {
        int id PK
        string username UK
        string password_hash
        string full_name
        datetime created_at
    }
    POI {
        int id PK
        string name
        string address
        float latitude
        float longitude
        int radius_m
        int priority
        string image_url
        int created_by FK
        datetime created_at
        datetime updated_at
    }
    POI_TRANSLATION {
        int id PK
        int poi_id FK
        string language_code
        string title
        text narration_text
        string audio_url
        string audio_source
    }
    QR_CODE {
        int id PK
        int poi_id FK
        string payload UK
        string label
        datetime created_at
    }
    TOUR {
        int id PK
        string name
        text description
        int created_by FK
        datetime created_at
        datetime updated_at
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
    META {
        string key PK
        string value
    }

    ADMIN_USER |o--o{ POI : creates
    ADMIN_USER |o--o{ TOUR : creates
    POI ||--o{ POI_TRANSLATION : has
    POI ||--o{ QR_CODE : linked_to
    TOUR ||--|{ TOUR_POI : contains
    POI ||--o{ TOUR_POI : included_in
    POI |o--o{ USAGE_LOG : triggers
```

Constraints and indexes:
- `poi.latitude` CHECK −90..90, `poi.longitude` CHECK −180..180, `poi.radius_m` CHECK > 0.
- `poi_translation` UNIQUE (`poi_id`, `language_code`); `audio_source` CHECK IN (`upload`, `tts`).
- `usage_log.trigger_method` CHECK IN (`geofence`, `qr`, `manual`).
- ON DELETE: translations, QR codes and tour links CASCADE with the POI; `usage_log.poi_id` and `created_by` SET NULL.
- Indexes: `usage_log(played_at)`, `usage_log(poi_id)`, `location_log(recorded_at)`.
- `PRAGMA foreign_keys = ON`; WAL journal mode for file databases.
- Timestamps: `created_at`/`updated_at` are SQLite `datetime('now')` (UTC, `YYYY-MM-DD HH:MM:SS`); log timestamps are ISO-8601 UTC strings.

Differences from the team's original ERD (README §6):

| Change | Reason |
|---|---|
| `poi.address`, `poi.image_url` added | Shown in the CMS list and app detail screen |
| `poi.created_by`, `tour.created_by` (FK to `admin_user`, nullable) | Realise the "manages" relationship; SET NULL so deleting an admin keeps content |
| `created_at` / `updated_at` on `poi`, `tour`; `created_at` on `admin_user`, `qr_code` | Auditing; `updated_at` is included in the snapshot |
| `admin_user.full_name` added | Display name in the CMS |
| `poi_translation.title` added | Per-language display name of the POI |
| `poi_translation.audio_source` (`upload` / `tts`) added | CMS shows whether audio is recorded or synthesised |
| `qr_code.label`, UNIQUE `payload` | Identify the bus stop where the code is installed; payload lookup must be unambiguous |
| `meta` table with `content_version` | Drives version-based sync (§8, D1) |
| `usage_log.poi_id` nullable | Keep history when a POI is deleted |
| `location_log` is not related to any table | Anonymous by design; linking only via random `session_id` |

### 6.2 Mobile local database (`mobile/src/data/db.ts`)

| Table | Purpose |
|---|---|
| `poi`, `poi_translation`, `tour`, `tour_poi` | Copy of the snapshot; replaced in one transaction on each sync |
| `qr_code(payload, poi_id, label)` | QR codes from the snapshot, for offline resolution |
| `qr_cache(code, poi_id, label, resolved_at)` | Codes resolved online that were not in the snapshot |
| `audio_file(url, local_uri, bytes, downloaded_at)` | Audio files downloaded for offline playback |
| `usage_queue`, `location_queue` | Pending anonymous log records (JSON payload) until uploaded |
| `kv(key, value)` | Settings (language, auto narration, cooldown, server URL, anonymous data, background, simulation), `content_version`, `last_sync_at`, `sync_format` |

The schema version is tracked with `PRAGMA user_version`.

---

## 7. Deployment

```mermaid
flowchart TB
    subgraph PHONE["Tourist smartphone (Android / iOS)"]
        APP["Mobile app (Expo build)"]
        LDB[("SQLite<br/>content, cache, pending logs")]
        AFILES[("Downloaded audio files")]
    end
    subgraph ADMINPC["Administrator computer"]
        BROWSER["Web browser<br/>CMS static bundle"]
    end
    STOP["Printed QR codes<br/>Bus stops"]

    subgraph SERVER["Application server (Linux VPS)"]
        PROXY["Reverse proxy (nginx or Caddy)<br/>HTTPS termination, serves CMS dist/"]
        NODE["Node.js 22.13+ process<br/>backend/src/server.js, port 4000"]
        SDB[("data/narration.db<br/>SQLite WAL")]
        UP[("uploads/<br/>audio, images")]
    end
    GOOG["Google Translate / TTS endpoints"]

    STOP -. "camera scan" .-> APP
    APP --- LDB
    APP --- AFILES
    APP -->|"HTTPS"| PROXY
    BROWSER -->|"HTTPS"| PROXY
    PROXY -->|"HTTP localhost"| NODE
    NODE --> SDB
    NODE --> UP
    NODE -->|"HTTPS"| GOOG
```

The database server and file storage of the original deployment diagram are realised on the same host as the API (embedded SQLite, local directory). This is adequate for the expected load of a ward-level pilot; §8 D5 discusses the trade-off.

---

## 8. Key design decisions

| ID | Decision | Rationale | Consequences |
|---|---|---|---|
| D1 | **Full-snapshot, version-based sync.** One integer `content_version` is bumped inside the same transaction as every content change; the app compares versions and downloads the complete snapshot when it differs. | Content is small (tens of POIs, a few KB of text each). A full snapshot avoids delta bookkeeping, tombstones for deletions and clock problems. The check request is tiny, so it runs on launch, every 5 minutes and on reconnect. | Each change triggers a full re-download (acceptable at this size). Audio files are fetched separately by URL so the JSON stays small. If the data set grows to thousands of POIs, a delta endpoint by `updated_at` would be needed. |
| D2 | **Discard, do not queue, concurrent triggers** (UC1 A1). | UC1 A1 states the trigger is discarded. Queuing would play stale content after the user has walked past a POI, and could chain several narrations. | A POI passed during another narration is not narrated automatically; the user can open it from the map and press "Play narration" (`trigger_method = manual`). Manual and QR plays are explicit user actions and therefore interrupt the current narration instead of being discarded. |
| D3 | **Accuracy filter (60 m) and exit hysteresis (radius × 1.2)** in addition to cooldown. | Urban GPS fixes jitter by tens of metres; without hysteresis a user standing at the boundary would enter and exit repeatedly. Cooldown alone would hide but not fix this. | Slight delay in detecting exits; narration may not start when accuracy is poor (e.g. under tall buildings). Thresholds are configurable and must be tuned in field tests. |
| D4 | **Privacy by design.** No tourist accounts; random session ID per launch; coordinates rounded to 4 decimals at ingestion; heatmap aggregated in ~11 m cells; routes returned without session IDs. | UC5 business rule requires anonymous processing. Rounding at the server boundary guarantees that precise positions are never stored even if a client sends them. | Routes cannot be linked across days or app launches; analytics count sessions, not unique people. |
| D5 | **Embedded SQLite via `node:sqlite`, no ORM.** | No separate database server to install for the team or the lecturer; transactions and foreign keys are sufficient; zero native build dependencies. | Single-writer model and single-host deployment. Backups must copy the DB file safely (see `04-installation.md`). Migration to PostgreSQL would require rewriting repositories only. |
| D6 | **Two TTS paths.** Server-side TTS produces MP3 files stored with the content; the app falls back to on-device TTS (`expo-speech`) when no audio exists. | Pre-generated MP3 gives consistent voice quality and works offline after download; on-device TTS guarantees narration even when no audio was produced or the free TTS service is unavailable. | Voice quality differs between POIs with and without audio. Device voices for some languages may be missing on some phones. |
| D7 | **Pluggable free translate/TTS providers** (`TRANSLATE_PROVIDER`, `TTS_PROVIDER`, including `none`). | Free endpoints have no SLA and may be rate-limited. Providers are injected so they can be swapped (LibreTranslate) or disabled, and replaced by fakes in tests. | Machine translation is a draft; administrators must review text. Failures surface as 502 `UPSTREAM_ERROR` and never block saving a POI. |
| D8 | **Random, opaque QR payloads** (`NARR:` + 12-char base64url from 9 random bytes) instead of POI IDs. | Codes cannot be enumerated or guessed; a printed code can be revoked (deleted) and re-issued without changing the POI. A POI can have one code per bus stop. | The mapping lives on the server; the `/sync` snapshot carries `qrcodes: [{payload, poi_id, label}]` so the app resolves codes offline. |
| D9 | **Stateless JWT for the CMS** (8 h expiry), bcrypt password hashes, login rate limit. | Simple for a single-role admin system; no session store needed. | Tokens cannot be revoked before expiry except by rotating `JWT_SECRET`. Acceptable for a small admin group. |
| D10 | **Validation in the service layer, mirrored in the CMS.** | The backend is the authority (BR-02, BR-03); CMS checks give immediate feedback. Field-keyed `details` let the CMS place errors next to inputs. | Rules must be kept consistent in two places; backend tests are the reference. |

### 8.1 Open design issues
1. **Offline QR resolution (resolved).** `GET /sync` now includes `qrcodes: [{payload, poi_id, label}]` and QR create/delete bumps `content_version`, so codes resolve offline from SQLite; the online `/qr/:payload` lookup remains as a fallback.
2. **QR scan during playback (decided).** UC2 does not specify this case. The implementation lets QR and manual plays bypass the cooldown and stop the current narration, because they are explicit user requests; UC1 A1 (discard) applies only to geofence triggers.
3. **Background location limits.** iOS and Android may throttle or stop background updates; background mode also requires a development or store build (not Expo Go). The design keeps foreground operation as the reference behaviour (see risks in `06-project-management.md`).
4. **Device verification.** The mobile app has been verified by unit tests, live-backend tests, type checking and bundle export, but not yet on a phone, emulator or simulator; map, camera, audio, permissions and background location still need device testing (`03-test-plan.md`).
