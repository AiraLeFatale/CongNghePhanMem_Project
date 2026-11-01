/**
 * Tải bản sao nội dung/asset của website đang chạy để dùng cho bản local.
 *
 *   node scripts/fetch-deployed.mjs [baseUrl]
 *
 * Script làm 3 việc:
 *   1. Lưu /api/sync + bản đầy đủ từ CMS thành src/db/deployed-snapshot.json
 *      (POI, tour, QR, giá, bản dịch, audio của cả điểm trả phí).
 *   2. Tải các file audio trong snapshot về backend/uploads/ (giữ nguyên tên file).
 *   3. Tải HTML/JS/CSS/ảnh của website (web/) và CMS (web/admin/).
 *
 * Chỉ dùng cho môi trường demo/local. Không chạy script này trên production.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] || process.env.DEPLOYED_URL || 'https://thuyetminh.hmarketing.vn').replace(/\/+$/, '');
const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, '..');
const repo = path.resolve(backend, '..');
const web = path.join(repo, 'web');
const uploads = path.join(backend, 'uploads');
const snapshotFile = path.join(backend, 'src', 'db', 'deployed-snapshot.json');

fs.mkdirSync(uploads, { recursive: true });

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'narration-local-replica/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

async function save(url, file) {
  const res = await get(url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return buf.length;
}

const sync = await (await get(`${base}/api/sync`)).json();

// /api/sync ẩn audio_url của điểm có phí (chỉ trả khi đã mua), nên đăng nhập CMS để lấy
// bản đầy đủ. Nhờ vậy bản local có đủ audio cho cả điểm trả phí mà không phải tạo đơn thật.
const adminUser = process.env.DEPLOYED_ADMIN_USER || 'admin';
const adminPassword = process.env.DEPLOYED_ADMIN_PASSWORD || 'admin123';
try {
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'narration-local-replica/1.0' },
    body: JSON.stringify({ username: adminUser, password: adminPassword }),
  });
  if (!login.ok) throw new Error(`đăng nhập ${login.status}`);
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}`, 'User-Agent': 'narration-local-replica/1.0' };
  for (const poi of sync.pois ?? []) {
    const res = await fetch(`${base}/api/admin/pois/${poi.id}`, { headers });
    if (!res.ok) continue;
    const full = await res.json();
    // Giữ giá trị trong sync nếu bản admin thiếu trường, nhưng ưu tiên bản đầy đủ.
    Object.assign(poi, full, { locked: Number(full.price ?? poi.price) > 0 });
  }
  console.log('Đã bổ sung audio/is_auto từ API quản trị.');
  // Giữ id mã QR để thứ tự /api/sync và /api/admin/qrcodes giống bản deploy.
  const qrRes = await fetch(`${base}/api/admin/qrcodes`, { headers });
  if (qrRes.ok) {
    const { items } = await qrRes.json();
    const idByPayload = new Map(items.map((q) => [q.payload, q.id]));
    sync.qrcodes = (sync.qrcodes ?? []).map((q) => ({ id: idByPayload.get(q.payload), ...q }));
  }
} catch (err) {
  console.warn(`Không lấy được bản đầy đủ từ CMS (${err.message}); snapshot chỉ có dữ liệu /api/sync.`);
}

fs.writeFileSync(snapshotFile, `${JSON.stringify(sync, null, 2)}\n`, 'utf8');
console.log(`Đã lưu snapshot: ${path.relative(repo, snapshotFile)} (${sync.pois?.length ?? 0} POI, ${sync.tours?.length ?? 0} tour, ${sync.qrcodes?.length ?? 0} QR)`);

let audioBytes = 0;
let audioCount = 0;
for (const poi of sync.pois ?? []) {
  for (const t of poi.translations ?? []) {
    if (!t.audio_url?.startsWith('/uploads/')) continue;
    const file = path.join(uploads, path.basename(t.audio_url));
    if (!fs.existsSync(file)) audioBytes += await save(base + t.audio_url, file);
    audioCount++;
  }
}
console.log(`Đã tải ${audioCount} file audio (${Math.round(audioBytes / 1024 / 1024 * 10) / 10} MB mới)`);

const assets = [
  ['/', 'index.html'],
  ['/favicon.svg', 'favicon.svg'],
  ['/admin/', 'admin/index.html'],
  ['/admin/favicon.svg', 'admin/favicon.svg'],
];
// Lấy tên bundle từ HTML để không phụ thuộc hash thủ công.
const webHtml = await (await get(`${base}/`)).text();
const adminHtml = await (await get(`${base}/admin/`)).text();
for (const html of [webHtml, adminHtml]) {
  for (const m of html.matchAll(/(?:src|href)="(\/(?:admin\/)?assets\/[^"]+)"/g)) {
    assets.push([m[1], m[1].replace(/^\//, '')]);
  }
}
for (const n of ['nha-rong', 'nha-rong-dem', 'cau-mong', 'cau-khanh-hoi', 'cang-khanh-hoi', 'xom-chieu', 'song-sai-gon', 'rach-ben-nghe', 'tau-song']) {
  assets.push([`/images/${n}.jpg`, `images/${n}.jpg`]);
}
// Giữ nguyên thứ tự, bỏ trùng.
const seen = new Set();
let assetBytes = 0;
for (const [url, rel] of assets) {
  if (seen.has(rel)) continue;
  seen.add(rel);
  assetBytes += await save(base + url, path.join(web, rel));
}
console.log(`Đã tải ${seen.size} asset web/CMS (${Math.round(assetBytes / 1024 / 1024 * 10) / 10} MB)`);

// Tải nốt các chunk được nạp động (xlsx xuất Excel, leaflet-heat bản đồ nhiệt...).
async function fetchChunks(dir, urlBase) {
  let added = 0;
  for (let pass = 0; pass < 4; pass++) {
    let thisPass = 0;
    for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
      const text = fs.readFileSync(path.join(dir, name), 'utf8');
      for (const m of text.matchAll(/["'`]\.\/([A-Za-z0-9._-]+\.(?:js|css))["'`]/g)) {
        const chunk = m[1];
        const file = path.join(dir, chunk);
        if (fs.existsSync(file)) continue;
        try {
          await save(`${base}${urlBase}${chunk}`, file);
          added++;
          thisPass++;
        } catch {
          // Chunk không tồn tại trên server (import phòng hờ) - bỏ qua.
        }
      }
    }
    if (!thisPass) break;
  }
  return added;
}
const chunkCount = (await fetchChunks(path.join(web, 'assets'), '/assets/')) + (await fetchChunks(path.join(web, 'admin', 'assets'), '/admin/assets/'));
console.log(`Đã tải ${chunkCount} chunk nạp động`);
console.log('Xong. Chạy: npm run seed:demo && npm start');
