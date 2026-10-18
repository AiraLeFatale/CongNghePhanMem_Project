# Installation and Deployment Guide

**Project:** Multilingual Automatic Narration System
**Document version:** 1.0 (18/10/2026)

Repository layout:

```text
narration-system/
├── backend/   Express 5 REST API + SQLite (complete)
├── cms/       Admin web (Vite 8 + React 19 + TypeScript)
├── mobile/    Tourist app (Expo SDK 58, React Native 0.88, TypeScript)
└── docs/      Project documentation
```

---

## 1. Backend

### 1.1 Requirements
- Node.js **22.13 or newer** (the backend uses the built-in `node:sqlite` module; check with `node --version`).
- npm (bundled with Node.js).
- Internet access from the server only if machine translation and server-side TTS are used.

No separate database server is needed: the database is a single SQLite file created on first start.

### 1.2 Install and run locally

```bash
cd backend
npm install
npm run seed        # sample content: admin account, 8 POIs in District 4, 2 tours, 5 bus-stop QR codes
npm run dev         # start with auto-reload (or: npm start)
```

The API is then available at `http://localhost:4000/api` (check: `curl http://localhost:4000/api/health`).

Seed commands **delete all existing data** in the configured database before inserting:

| Command | Effect |
|---|---|
| `npm run seed` | Admin account `admin` (password `admin123`, or the value of `ADMIN_PASSWORD`), sample POIs with Vietnamese and English narration, tours and QR codes |
| `npm run seed:demo` | Same as above plus 30 days of **simulated** usage and location logs, so the analytics dashboard can be demonstrated. Do not use on a production database |

Sample POI coordinates are approximate; verify them on a map before real use.

### 1.3 Run the tests

```bash
cd backend
npm test            # node --test tests/ ; 43 tests, in-memory database, no network needed
```

### 1.4 Environment variables
All variables are optional for local development. They are read in `backend/src/config.js`.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP port (the server binds to `0.0.0.0`) |
| `DB_FILE` | `backend/data/narration.db` | Path of the SQLite database file (directory is created if missing) |
| `UPLOAD_DIR` | `backend/uploads` | Directory for uploaded/generated audio and images, served at `/uploads` |
| `JWT_SECRET` | `dev-only-secret-change-me` | Secret for signing admin tokens. **Required in production**: with `NODE_ENV=production` the server exits if it is not set |
| `JWT_EXPIRES_IN` | `8h` | Admin token lifetime (jsonwebtoken format, e.g. `2h`, `1d`) |
| `CORS_ORIGIN` | `*` | Allowed origins for browsers; comma-separated list (e.g. `https://cms.example.org`) |
| `TRANSLATE_PROVIDER` | `google-free` | `google-free` (unofficial Google Translate endpoint), `libretranslate`, or `none` (disables auto-translate) |
| `LIBRETRANSLATE_URL` | `https://libretranslate.com` | LibreTranslate server when `TRANSLATE_PROVIDER=libretranslate` |
| `LIBRETRANSLATE_KEY` | empty | API key for LibreTranslate, if the server requires one |
| `TTS_PROVIDER` | `google-free` | `google-free` (Google Translate TTS endpoint) or `none` (disables server TTS; the app still uses on-device TTS) |
| `NODE_ENV` | unset | Set to `production` on the server to enforce the `JWT_SECRET` check |
| `ADMIN_PASSWORD` | `admin123` | Used only by `npm run seed` / `seed:demo` for the initial admin password |

Fixed in code (not environment variables): supported languages `vi, en, zh, ko, ja, fr`, default language `vi`, upload limit 15 MB, JSON body limit 1 MB, login limit 20 attempts / 15 min / IP, log endpoints 120 requests / min / IP.

Example for a shell session:

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
export CORS_ORIGIN="http://localhost:5173"
npm start
```

---

## 2. CMS web

### 2.1 Requirements
- Node.js **22.22 or newer** (`engines` in `cms/package.json`).
- The backend running (default `http://localhost:4000`) with seed data.

### 2.2 Run in development

```bash
cd cms
npm install
npm run dev          # http://localhost:5173 ; log in with admin / admin123 (seed data)
```

In development, Vite proxies `/api` and `/uploads` to the backend, so no CORS configuration is needed.

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with proxy |
| `npm run build` | Type check (`tsc -b`) and production build into `cms/dist/` |
| `npm run preview` | Serve the production build locally (also proxied) |
| `npm test` | Unit tests (Vitest): API client, validation, formatting, Excel export (36 tests) |
| `npm run typecheck` | Type check only |

### 2.3 Environment variables
Copy `cms/.env.example` to `cms/.env` when needed.

| Variable | Used by | Description |
|---|---|---|
| `VITE_API_URL` | `npm run build` | Backend origin without `/api`, e.g. `https://api.example.org`. Leave empty when the CMS and backend share one domain (reverse proxy routes `/api` and `/uploads`). Audio/image URLs (`/uploads/...`) are prefixed with this origin. Read at build time |
| `DEV_PROXY_TARGET` | `npm run dev`, `npm run preview` | Backend the proxy forwards to; default `http://localhost:4000` |

If the CMS is served from a different domain than the backend, set the backend's `CORS_ORIGIN` to the CMS origin. `cms/dist/` is a single-page application: the web server must return `index.html` for every path that is not a file (see the nginx example in §4).

---

## 3. Mobile app

### 3.1 Requirements
- Node.js 20 or newer; the backend running and reachable from the phone (port 4000 open in the firewall).
- A phone with **Expo Go** (SDK 58) on the same Wi-Fi network as the computer, or an Android emulator / iOS simulator.

### 3.2 Run with Expo Go

```bash
cd mobile
npm install            # if npm reports ERESOLVE about react-dom, use: npm install --legacy-peer-deps
cp .env.example .env   # then set EXPO_PUBLIC_API_URL (see below)
npx expo start         # scan the QR code shown in the terminal with Expo Go
```

The `--legacy-peer-deps` note comes from a peer-dependency mismatch between `react-dom` (optional peer of `@expo/router-server`) and the `react` version pinned by SDK 58; the app does not use the web target.

### 3.3 Backend address
On a phone, `localhost` refers to the phone itself. The app chooses the backend address in this order (`mobile/src/config.ts`):

1. The URL entered in the app under **Settings → Server → Server address** (stored on the device).
2. `EXPO_PUBLIC_API_URL` in `mobile/.env` (restart `expo start` after editing), e.g. `http://192.168.1.10:4000`, without `/api`.
3. Automatic: the LAN IP of the computer running Metro (from Expo's `hostUri`) plus port 4000. When phone and laptop are on the same Wi-Fi, this usually needs no configuration.
4. Defaults: `http://10.0.2.2:4000` on the Android emulator, `http://localhost:4000` on the iOS simulator.

Find the LAN IP on macOS with `ipconfig getifaddr en0`. The backend already listens on `0.0.0.0`. Campus Wi-Fi networks often block device-to-device traffic (client isolation); in that case use a phone hotspot. Plain `http://` to a LAN IP is allowed (`usesCleartextTraffic` on Android, ATS exceptions on iOS in `app.json`); production builds should use the HTTPS backend URL.

### 3.4 Expo Go versus development build

| Feature | Expo Go | Development or store build |
|---|---|---|
| Map, tours, QR, TTS, audio, SQLite, sync | Yes | Yes |
| Foreground GPS | Yes | Yes |
| Background GPS / screen off | No (the app falls back to foreground GPS and Settings shows a note) | Yes, enable "Keep running in background" in Settings and grant "Always" |

Development build:

```bash
npx expo install expo-dev-client
npx expo run:android                       # requires Android Studio / SDK
# or
npx eas-cli@latest build --profile development --platform android
```

### 3.5 Tests and checks

```bash
npm test                                              # unit tests (62)
LIVE_API=http://localhost:4000 npx jest backend.live  # 5 read-only tests against a running seeded backend
npm run typecheck                                     # tsc --noEmit
npm run doctor                                        # expo-doctor
npm run export:android                                # bundle compiles (output in dist-android/)
npm run gen:leaflet                                   # regenerate embedded Leaflet after upgrading leaflet
```

### 3.6 Classroom demo without GPS or camera
1. **Settings → Demo mode → Location simulation**: on (real GPS is ignored).
2. On the **Map** tab, tap inside a POI circle; narration starts. Or open **Tours → a tour → Simulate walking this tour**; speed ×1–×30 in Settings.
3. QR without a camera: **Scan QR → Enter code manually** and paste a code from the CMS **QR** page (e.g. `NARR:…`).
4. Offline: disable the network after the first sync; map circles, tours, synced QR codes and TTS keep working and logs are uploaded later.

Emulators can also fake GPS: Android Emulator → Extended controls → Location; iOS Simulator → Features → Location.

---

## 4. Production deployment notes

### 4.1 Topology
One Linux server runs the Node.js backend behind a reverse proxy; the CMS is a static bundle served by the same proxy. See the deployment diagram in `02-design.md` §7.

### 4.2 Checklist
1. Install Node.js ≥ 22.13. Copy `backend/` and run `npm ci --omit=dev`.
2. Set environment variables: `NODE_ENV=production`, a random `JWT_SECRET` (at least 32 bytes), `CORS_ORIGIN` restricted to the CMS origin, and `DB_FILE` / `UPLOAD_DIR` pointing to a persistent data directory outside the code directory.
3. Create the first admin with `ADMIN_PASSWORD=<strong password> npm run seed`, then replace the sample content in the CMS; or prepare the content database elsewhere and copy it. Change the password after first login. Never run `seed` again on the production database (it deletes all data).
4. Run the backend as a service (systemd or pm2) bound to localhost only (firewall port 4000), restart on failure.
5. Put a reverse proxy (nginx or Caddy) in front with HTTPS (e.g. Let's Encrypt). The app sets `trust proxy = 1`, so the rate limiters use the client IP from the proxy's `X-Forwarded-For` header; exactly one proxy hop is assumed.
6. Set the proxy's maximum request body size to at least 16 MB so audio uploads (≤ 15 MB) are not rejected by the proxy.
7. Build the CMS with `VITE_API_URL` empty (same domain) or set to the API origin, and serve `cms/dist/` as static files; route `/api` and `/uploads` to the backend.
8. Build the mobile app with `EXPO_PUBLIC_API_URL` set to the production HTTPS origin (EAS build or `expo run`), so background location is available.

Example nginx server block (adapt paths and domain):

```nginx
server {
    listen 443 ssl;
    server_name narration.example.org;
    # ssl_certificate / ssl_certificate_key managed by certbot
    client_max_body_size 16m;

    root /srv/narration/cms/dist;
    location / { try_files $uri /index.html; }

    location /api/     { proxy_pass http://127.0.0.1:4000; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header Host $host; }
    location /uploads/ { proxy_pass http://127.0.0.1:4000; }
}
```

### 4.3 Backups
Data to back up: the SQLite database (`DB_FILE`) and the uploads directory (`UPLOAD_DIR`). Both are needed: the database stores audio paths, the directory stores the files.

- The database runs in WAL mode, so copying only `narration.db` while the server is writing can produce an inconsistent copy. Use SQLite's online backup, for example `sqlite3 /srv/narration/data/narration.db ".backup '/backup/narration-$(date +%F).db'"`, or stop the service briefly and copy `narration.db`, `narration.db-wal` and `narration.db-shm` together.
- Copy the uploads directory with `rsync -a` after the database backup.
- Schedule daily backups (cron), keep at least 7 daily and 4 weekly copies, and store one copy off the server.
- Test restoration once: restore to a separate directory, start the backend with `DB_FILE`/`UPLOAD_DIR` pointing there, and check that POIs and audio load.

### 4.4 Operations
- Logs: the backend prints errors to stdout/stderr; collect them with journald or pm2 logs.
- Health check: `GET /api/health`.
- Upgrades: stop service, back up, deploy new code, `npm ci --omit=dev`, start. The schema uses `CREATE TABLE IF NOT EXISTS`; changes to existing tables would need a migration script (none exist yet).
- If the free translate/TTS endpoints fail or are blocked, set `TRANSLATE_PROVIDER=none` / `TTS_PROVIDER=none`, or switch to a self-hosted LibreTranslate. Content editing and the app keep working.
