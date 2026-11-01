/**
 * Nạp dữ liệu cho website/CMS.
 *   npm run seed        → nội dung thật của website đang chạy (deployed-snapshot.json)
 *   npm run seed:demo   → như trên + lượt nghe/vị trí GIẢ LẬP cho màn thống kê
 *   npm run seed:sample → 8 POI mẫu tối giản trong repo (dùng cho test/không có mạng)
 * Chạy lại sẽ xoá sạch DB cũ (kể cả đơn thanh toán). Chỉ dùng ở máy local / demo.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { openDatabase, transaction } from './database.js';

// Snapshot nội dung của website đang chạy, do scripts/fetch-deployed.mjs tải về.
const SNAPSHOT_FILE = new URL('./deployed-snapshot.json', import.meta.url);

// Dữ liệu 8 POI mẫu ở Quận 4: thông tin toạ độ/bán kính và bản thuyết minh vi + en.
export const SAMPLE_POIS = [
  {
    name: 'Bến Nhà Rồng – Bảo tàng Hồ Chí Minh', address: '1 Nguyễn Tất Thành, Phường Xóm Chiếu', latitude: 10.7681, longitude: 106.7068, radius_m: 80, priority: 10, price: 5000,
    vi: ['Bến Nhà Rồng', 'Bạn đang đến Bến Nhà Rồng. Toà nhà được người Pháp xây năm 1863 làm trụ sở hãng vận tải biển, mái có hai con rồng nên người dân gọi là Nhà Rồng. Ngày 5 tháng 6 năm 1911, người thanh niên Nguyễn Tất Thành rời bến cảng này ra đi tìm đường cứu nước. Hiện nay đây là Bảo tàng Hồ Chí Minh, mở cửa từ thứ Ba đến Chủ nhật.'],
    en: ['Nha Rong Wharf', 'You are approaching Nha Rong Wharf. The French built this house in 1863 as the head office of a shipping company; the two dragons on its roof gave it the name "Dragon House". On 5 June 1911, the young Nguyen Tat Thanh left from this port to seek a path for national independence. Today it is the Ho Chi Minh Museum, open Tuesday to Sunday.'],
  },
  {
    name: 'Phố ẩm thực Vĩnh Khánh', address: 'Đường Vĩnh Khánh, Phường Vĩnh Hội', latitude: 10.7605, longitude: 106.7036, radius_m: 120, priority: 8, price: 5000,
    vi: ['Phố ẩm thực Vĩnh Khánh', 'Chào mừng bạn đến phố ẩm thực Vĩnh Khánh, con đường ốc nổi tiếng nhất Sài Gòn. Từ chiều tối, hai bên đường kín quán ốc, hải sản nướng và các món ăn vặt. Bạn nên thử ốc hương xào bơ tỏi, sò điệp nướng mỡ hành và nhớ hỏi giá trước khi gọi món.'],
    en: ['Vinh Khanh Food Street', 'Welcome to Vinh Khanh food street, the most famous snail street in Saigon. From late afternoon, both sides of the road fill with snail, grilled seafood and street snack stalls. Try the butter-garlic sea snails and grilled scallops with scallion oil, and remember to ask for prices before ordering.'],
  },
  {
    name: 'Chợ Xóm Chiếu', address: 'Đường Tôn Đản, Phường Xóm Chiếu', latitude: 10.7578, longitude: 106.7071, radius_m: 70, priority: 6,
    vi: ['Chợ Xóm Chiếu', 'Đây là chợ Xóm Chiếu, một trong những khu chợ lâu đời của Quận 4. Tên Xóm Chiếu bắt nguồn từ nghề dệt chiếu của cư dân vùng này từ thế kỷ trước. Buổi sáng chợ đông nhất, bày bán rau củ, hải sản tươi và nhiều món ăn sáng bình dân.'],
    en: ['Xom Chieu Market', 'This is Xom Chieu market, one of the oldest markets in District 4. The name "Mat Village" comes from the mat-weaving craft of local residents in the last century. The market is busiest in the morning, with vegetables, fresh seafood and many affordable breakfast dishes.'],
  },
  {
    name: 'Cầu Khánh Hội', address: 'Nối Quận 1 và Phường Khánh Hội', latitude: 10.7655, longitude: 106.7032, radius_m: 90, priority: 5,
    vi: ['Cầu Khánh Hội', 'Bạn đang ở gần cầu Khánh Hội bắc qua kênh Bến Nghé, nối Quận 1 với Quận 4. Cây cầu cũ thời Pháp đã được thay bằng cầu mới để phục vụ lượng xe ngày càng đông. Từ trên cầu, bạn có thể ngắm dòng kênh và các toà nhà cao tầng bên bờ Quận 1.'],
    en: ['Khanh Hoi Bridge', 'You are near Khanh Hoi bridge over the Ben Nghe canal, linking District 1 and District 4. The old French-era bridge was replaced by a new one to carry growing traffic. From the bridge you can view the canal and the high-rise buildings on the District 1 bank.'],
  },
  {
    name: 'Cầu Mống', address: 'Bắc qua kênh Bến Nghé, Phường Khánh Hội', latitude: 10.7699, longitude: 106.7049, radius_m: 60, priority: 7,
    vi: ['Cầu Mống', 'Đây là cầu Mống, cây cầu thép hình vòng cung do người Pháp xây dựng năm 1894. Chữ Mống trong tiếng Nam Bộ có nghĩa là cầu vồng, gợi đúng hình dáng của cầu. Ngày nay cầu chỉ dành cho người đi bộ và là điểm chụp ảnh quen thuộc của người Sài Gòn.'],
    en: ['Mong Bridge', 'This is Mong bridge, an arched steel bridge built by the French in 1894. "Mong" means rainbow in the southern dialect, matching the shape of the bridge. Today it is reserved for pedestrians and is a popular photo spot for Saigon residents.'],
  },
  {
    name: 'Cảng Sài Gòn – khu Khánh Hội', address: 'Đường Nguyễn Tất Thành, Phường Khánh Hội', latitude: 10.7645, longitude: 106.7093, radius_m: 150, priority: 4, price: 5000,
    vi: ['Cảng Sài Gòn', 'Dọc đường Nguyễn Tất Thành là khu cảng Khánh Hội, một phần của cảng Sài Gòn có lịch sử hơn 150 năm. Nơi đây từng là cửa ngõ giao thương đường biển quan trọng nhất miền Nam. Hiện khu cảng đang được chuyển đổi thành khu đô thị và dịch vụ ven sông.'],
    en: ['Saigon Port', 'Along Nguyen Tat Thanh street lies the Khanh Hoi port area, part of the over 150-year-old Saigon port. It was once the most important maritime trade gateway of southern Vietnam. The area is now being redeveloped into a riverside urban and service district.'],
  },
  {
    name: 'Công viên Khánh Hội', address: 'Đường Hoàng Diệu, Phường Khánh Hội', latitude: 10.7622, longitude: 106.7012, radius_m: 80, priority: 3, price: 5000,
    vi: ['Công viên Khánh Hội', 'Bạn đang đi ngang công viên Khánh Hội, mảng xanh nhỏ giữa khu dân cư đông đúc của Quận 4. Sáng sớm và chiều tối, người dân đến đây tập thể dục, đi dạo và cho trẻ em vui chơi.'],
    en: ['Khanh Hoi Park', 'You are passing Khanh Hoi park, a small green space in the dense residential area of District 4. Early mornings and evenings, locals come here to exercise, stroll and let children play.'],
  },
  {
    name: 'Trạm xe buýt Vĩnh Hội', address: 'Đường Hoàng Diệu, Phường Vĩnh Hội', latitude: 10.7593, longitude: 106.7005, radius_m: 50, priority: 2,
    vi: ['Trạm xe buýt Vĩnh Hội', 'Đây là trạm xe buýt Vĩnh Hội. Từ đây bạn có thể đi bộ khoảng năm phút đến phố ẩm thực Vĩnh Khánh. Quét mã QR tại trạm để nghe giới thiệu các điểm tham quan gần đó.'],
    en: ['Vinh Hoi Bus Stop', 'This is Vinh Hoi bus stop. From here it is about a five-minute walk to Vinh Khanh food street. Scan the QR code at the stop to hear about nearby attractions.'],
  },
];

// Hai tour mẫu; `pois` là chỉ số (index) trỏ vào SAMPLE_POIS theo thứ tự tham quan.
const TOURS = [
  { name: 'Di sản ven sông Quận 4', description: 'Theo dấu lịch sử bến cảng: Cầu Mống, Bến Nhà Rồng, Cảng Sài Gòn, Cầu Khánh Hội.', pois: [4, 0, 5, 3] },
  { name: 'Ẩm thực đêm Vĩnh Khánh', description: 'Từ trạm xe buýt Vĩnh Hội đi bộ qua công viên, phố ốc và chợ Xóm Chiếu.', pois: [7, 6, 1, 2] },
];

// Các trạm xe buýt được gắn mã QR, mỗi trạm trỏ tới một POI trong SAMPLE_POIS.
const QR_STOPS = [
  { poi: 0, label: 'Trạm xe buýt Bến Nhà Rồng (Xóm Chiếu)' },
  { poi: 1, label: 'Trạm xe buýt Vĩnh Khánh (Vĩnh Hội)' },
  { poi: 2, label: 'Trạm xe buýt Chợ Xóm Chiếu' },
  { poi: 7, label: 'Trạm xe buýt Vĩnh Hội' },
  { poi: 3, label: 'Trạm xe buýt Cầu Khánh Hội' },
];

// Nạp lại toàn bộ dữ liệu mẫu (xoá sạch bảng trước), trả về id admin và danh sách id POI.
// Tham số: demo = true để sinh thêm log giả lập; adminPassword là mật khẩu tài khoản admin.
export function seed(db, { demo = false, adminPassword = 'admin123' } = {}) {
  // Xoá dữ liệu cũ theo thứ tự an toàn với khoá ngoại, rồi tăng content_version cho app đồng bộ lại.
  db.exec('DELETE FROM payment_order; DELETE FROM usage_log; DELETE FROM location_log; DELETE FROM tour_poi; DELETE FROM tour; DELETE FROM qr_code; DELETE FROM poi_translation; DELETE FROM poi; DELETE FROM admin_user;');
  db.exec("DELETE FROM sqlite_sequence; UPDATE meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'content_version';");

  return transaction(db, () => {
    // Tạo tài khoản admin với mật khẩu băm bằng bcrypt (cost 10).
    const adminId = Number(
      db.prepare('INSERT INTO admin_user (username, password_hash, full_name) VALUES (?, ?, ?)').run('admin', bcrypt.hashSync(adminPassword, 10), 'Quản trị nội dung').lastInsertRowid,
    );
    const insPoi = db.prepare('INSERT INTO poi (name, address, latitude, longitude, radius_m, priority, price, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insTr = db.prepare('INSERT INTO poi_translation (poi_id, language_code, title, narration_text) VALUES (?, ?, ?, ?)');
    // Chèn từng POI kèm 2 bản dịch (vi, en); giữ lại id để các bảng khác tham chiếu.
    const ids = SAMPLE_POIS.map((p) => {
      const id = Number(insPoi.run(p.name, p.address, p.latitude, p.longitude, p.radius_m, p.priority, p.price ?? 0, adminId).lastInsertRowid);
      insTr.run(id, 'vi', p.vi[0], p.vi[1]);
      insTr.run(id, 'en', p.en[0], p.en[1]);
      return id;
    });
    // Sinh payload QR ngẫu nhiên không đoán được cho từng trạm.
    for (const q of QR_STOPS) {
      db.prepare('INSERT INTO qr_code (poi_id, payload, label) VALUES (?, ?, ?)').run(ids[q.poi], crypto.randomBytes(9).toString('base64url'), q.label);
    }
    // Tạo tour rồi gắn danh sách POI theo visit_order 1..n.
    for (const t of TOURS) {
      const tid = Number(db.prepare('INSERT INTO tour (name, description, created_by) VALUES (?, ?, ?)').run(t.name, t.description, adminId).lastInsertRowid);
      t.pois.forEach((pi, i) => db.prepare('INSERT INTO tour_poi (tour_id, poi_id, visit_order) VALUES (?, ?, ?)').run(tid, ids[pi], i + 1));
    }
    if (demo) seedDemoUsage(db, SAMPLE_POIS.map((p, i) => ({ id: ids[i], latitude: p.latitude, longitude: p.longitude })), [10, 9, 5, 3, 6, 3, 2, 4]);
    // Trả id để script CLI in thống kê sau khi nạp.
    return { adminId, poiIds: ids };
  });
}

/**
 * Nạp nguyên trạng nội dung của website đang chạy (src/db/deployed-snapshot.json).
 *
 * Snapshot do scripts/fetch-deployed.mjs tạo từ /api/sync, gồm 9 POI, 3 tour, 6 mã QR,
 * đủ 6 ngôn ngữ, giá và cờ is_auto. Hàm giữ nguyên id để đường dẫn/QR đang in không đổi.
 * Audio tương ứng nằm trong backend/uploads/ (cũng do script tải về).
 */
export function seedFromSnapshot(db, { demo = false, adminPassword = 'admin123', snapshot } = {}) {
  const data = snapshot ?? JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
  // Xoá đơn thanh toán trước vì nó tham chiếu poi; sau đó xoá nội dung như seed thường.
  db.exec('DELETE FROM payment_order; DELETE FROM usage_log; DELETE FROM location_log; DELETE FROM tour_poi; DELETE FROM tour; DELETE FROM qr_code; DELETE FROM poi_translation; DELETE FROM poi; DELETE FROM admin_user;');
  db.exec('DELETE FROM sqlite_sequence;');

  return transaction(db, () => {
    const adminId = Number(
      db.prepare('INSERT INTO admin_user (username, password_hash, full_name) VALUES (?, ?, ?)').run('admin', bcrypt.hashSync(adminPassword, 10), 'Quản trị nội dung').lastInsertRowid,
    );

    const insPoi = db.prepare(
      `INSERT INTO poi (id, name, address, latitude, longitude, radius_m, priority, image_url, price, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`,
    );
    const insTr = db.prepare(
      `INSERT INTO poi_translation (poi_id, language_code, title, narration_text, audio_url, audio_source, is_auto)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const p of data.pois ?? []) {
      insPoi.run(
        p.id,
        p.name,
        p.address ?? null,
        p.latitude,
        p.longitude,
        p.radius_m,
        p.priority ?? 1,
        p.image_url ?? null,
        Number(p.price) || 0,
        adminId,
        p.created_at ?? p.updated_at ?? null,
        p.updated_at ?? null,
      );
      for (const t of p.translations ?? []) {
        insTr.run(p.id, t.language_code, t.title ?? null, t.narration_text ?? '', t.audio_url ?? null, t.audio_source ?? null, t.is_auto ? 1 : 0);
      }
    }

    for (const t of data.tours ?? []) {
      db.prepare(
        "INSERT INTO tour (id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))",
      ).run(t.id, t.name, t.description ?? null, adminId, t.created_at ?? t.updated_at ?? null, t.updated_at ?? null);
      (t.poi_ids ?? []).forEach((poiId, i) => {
        db.prepare('INSERT INTO tour_poi (tour_id, poi_id, visit_order) VALUES (?, ?, ?)').run(t.id, poiId, i + 1);
      });
    }

    for (const q of data.qrcodes ?? []) {
      if (q.id != null) {
        db.prepare('INSERT INTO qr_code (id, poi_id, payload, label) VALUES (?, ?, ?, ?)').run(q.id, q.poi_id, q.payload, q.label ?? null);
      } else {
        db.prepare('INSERT INTO qr_code (poi_id, payload, label) VALUES (?, ?, ?)').run(q.poi_id, q.payload, q.label ?? null);
      }
    }

    // Giữ đúng version của bản deploy để app đã cài không phải tải lại vô ích.
    if (Number.isFinite(Number(data.version))) {
      db.prepare("UPDATE meta SET value = ? WHERE key = 'content_version'").run(String(data.version));
    }

    const ids = (data.pois ?? []).map((p) => p.id);
    if (demo) {
      const rows = (data.pois ?? []).map((p) => ({ id: p.id, latitude: p.latitude, longitude: p.longitude }));
      seedDemoUsage(db, rows, rows.map((_, i) => Math.max(1, 10 - i)));
      seedDemoPayments(db);
    }
    return { adminId, poiIds: ids };
  });
}

/** Vài đơn thanh toán mẫu để màn "Thanh toán" của CMS có dữ liệu ngay sau khi seed. */
function seedDemoPayments(db) {
  const now = Date.now();
  const stamp = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  const specs = [
    { poiId: 1, status: 'paid', confirmed: 'admin', ageDays: 3, paidAgeDays: 2, claimedAgeDays: 3 },
    { poiId: 2, status: 'pending', claimedAgeDays: 1, ageDays: 1 },
    { poiId: 6, status: 'pending', ageDays: 0 },
  ];
  const ins = db.prepare(
    `INSERT INTO payment_order
       (code, token, poi_id, amount, status, transfer_note, bank_bin, bank_name, bank_account, bank_account_name,
        claimed_at, paid_at, confirmed_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const s of specs) {
    const poi = db.prepare('SELECT id, price FROM poi WHERE id = ?').get(s.poiId);
    if (!poi || !(Number(poi.price) > 0)) continue;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = `TM${Array.from({ length: 6 }, () => chars[crypto.randomInt(0, chars.length)]).join('')}`;
    ins.run(
      code,
      crypto.randomBytes(24).toString('base64url'),
      poi.id,
      poi.price,
      s.status,
      code,
      config.paymentBankBin,
      config.paymentBankName,
      config.paymentAccount,
      config.paymentAccountName,
      s.claimedAgeDays === undefined ? null : stamp(now - s.claimedAgeDays * 86400000),
      s.paidAgeDays === undefined ? null : stamp(now - s.paidAgeDays * 86400000),
      s.confirmed ?? null,
      stamp(now - s.ageDays * 86400000),
    );
  }
}

/** Sinh dữ liệu sử dụng GIẢ LẬP 30 ngày gần nhất (chỉ để demo màn thống kê). */
function seedDemoUsage(db, pois, weights) {
  let s = 42;
  // Bộ sinh số giả ngẫu nhiên tất định (LCG) để mỗi lần seed:demo cho cùng dữ liệu.
  const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const insU = db.prepare('INSERT INTO usage_log (poi_id, session_id, trigger_method, language_code, played_at, listen_seconds) VALUES (?, ?, ?, ?, ?, ?)');
  const insL = db.prepare('INSERT INTO location_log (session_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, ?)');
  const langs = ['vi', 'vi', 'vi', 'en', 'en', 'zh', 'ko', 'ja'];
  const now = Date.now();
  for (let n = 0; n < 400; n++) {
    // Mỗi vòng là một phiên nghe trong 30 ngày gần nhất, có 1-4 điểm dừng.
    const session = crypto.randomBytes(8).toString('hex');
    const start = now - Math.floor(rand() * 30) * 86400000 - Math.floor(rand() * 14 + 7) * 3600000;
    const lang = langs[Math.floor(rand() * langs.length)];
    const stops = 1 + Math.floor(rand() * 4);
    let lat = 10.757 + rand() * 0.013;
    let lng = 106.700 + rand() * 0.01;
    for (let k = 0; k < stops; k++) {
      // Chọn POI theo trọng số (weights) để dữ liệu tập trung ở vài điểm nổi bật.
      const total = weights.reduce((a, b) => a + b, 0);
      let r = rand() * total;
      const pi = Math.max(0, weights.findIndex((w) => (r -= w) < 0));
      const p = pois[pi];
      const t = start + k * 600000;
      for (let step = 0; step < 6; step++) {
        // Nội suy dần từ vị trí hiện tại về POI, thêm nhiễu nhỏ để giống dấu GPS thật.
        lat += (p.latitude - lat) / (6 - step) + (rand() - 0.5) * 0.0003;
        lng += (p.longitude - lng) / (6 - step) + (rand() - 0.5) * 0.0003;
        insL.run(session, Math.round(lat * 1e4) / 1e4, Math.round(lng * 1e4) / 1e4, new Date(t - (6 - step) * 60000).toISOString());
      }
      const method = rand() < 0.65 ? 'geofence' : rand() < 0.8 ? 'qr' : 'manual';
      // Ghi log nghe: 65% geofence, phần còn lại chia cho qr/manual; thời lượng nghe 15-90 giây.
      insU.run(p.id, session, method, lang, new Date(t).toISOString(), Math.floor(15 + rand() * 75));
    }
  }
}

// Chạy trực tiếp bằng CLI thì mở DB và nạp dữ liệu.
// Mặc định dùng snapshot của website đang chạy (nếu đã tải); --sample để dùng 8 POI mẫu.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const demo = process.argv.includes('--demo');
  const forceSample = process.argv.includes('--sample');
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const db = openDatabase();
  const pw = process.env.ADMIN_PASSWORD || 'admin123';
  const useSnapshot = !forceSample && fs.existsSync(SNAPSHOT_FILE);
  const { poiIds } = useSnapshot
    ? seedFromSnapshot(db, { demo, adminPassword: pw })
    : seed(db, { demo, adminPassword: pw });
  const tours = db.prepare('SELECT COUNT(*) AS n FROM tour').get().n;
  const qr = db.prepare('SELECT COUNT(*) AS n FROM qr_code').get().n;
  console.log(`Đã nạp ${poiIds.length} POI, ${tours} tour, ${qr} mã QR${demo ? ' + dữ liệu thống kê giả lập' : ''}.`);
  console.log(`Nguồn dữ liệu: ${useSnapshot ? 'snapshot website đang chạy' : '8 POI mẫu'}`);
  // Cảnh báo nếu file audio chưa được tải về (thư mục uploads bị gitignore).
  const missing = db
    .prepare('SELECT audio_url FROM poi_translation WHERE audio_url IS NOT NULL')
    .all()
    .filter((r) => !fs.existsSync(path.join(config.uploadDir, path.basename(r.audio_url)))).length;
  if (missing) console.log(`⚠ Thiếu ${missing} file audio trong uploads/ — chạy: node scripts/fetch-deployed.mjs`);
  console.log(`Tài khoản CMS: admin / ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD)' : 'admin123'}`);
}
