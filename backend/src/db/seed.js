/**
 * Nạp dữ liệu mẫu: tài khoản admin, POI ở Quận 4 (Khánh Hội, Vĩnh Hội, Xóm Chiếu), mã QR trạm xe buýt, tour.
 *   npm run seed        → dữ liệu nội dung
 *   npm run seed:demo   → thêm lượt nghe + vị trí GIẢ LẬP để xem thử màn thống kê
 * Chạy lại sẽ xoá sạch DB cũ. Chỉ dùng ở máy local / môi trường demo.
 * Toạ độ là gần đúng, lấy để demo; kiểm tra lại trên bản đồ trước khi dùng thật.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { openDatabase, transaction } from './database.js';

export const SAMPLE_POIS = [
  {
    name: 'Bến Nhà Rồng – Bảo tàng Hồ Chí Minh', address: '1 Nguyễn Tất Thành, Phường Xóm Chiếu', latitude: 10.7681, longitude: 106.7068, radius_m: 80, priority: 10,
    vi: ['Bến Nhà Rồng', 'Bạn đang đến Bến Nhà Rồng. Toà nhà được người Pháp xây năm 1863 làm trụ sở hãng vận tải biển, mái có hai con rồng nên người dân gọi là Nhà Rồng. Ngày 5 tháng 6 năm 1911, người thanh niên Nguyễn Tất Thành rời bến cảng này ra đi tìm đường cứu nước. Hiện nay đây là Bảo tàng Hồ Chí Minh, mở cửa từ thứ Ba đến Chủ nhật.'],
    en: ['Nha Rong Wharf', 'You are approaching Nha Rong Wharf. The French built this house in 1863 as the head office of a shipping company; the two dragons on its roof gave it the name "Dragon House". On 5 June 1911, the young Nguyen Tat Thanh left from this port to seek a path for national independence. Today it is the Ho Chi Minh Museum, open Tuesday to Sunday.'],
  },
  {
    name: 'Phố ẩm thực Vĩnh Khánh', address: 'Đường Vĩnh Khánh, Phường Vĩnh Hội', latitude: 10.7605, longitude: 106.7036, radius_m: 120, priority: 8,
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
    name: 'Cảng Sài Gòn – khu Khánh Hội', address: 'Đường Nguyễn Tất Thành, Phường Khánh Hội', latitude: 10.7645, longitude: 106.7093, radius_m: 150, priority: 4,
    vi: ['Cảng Sài Gòn', 'Dọc đường Nguyễn Tất Thành là khu cảng Khánh Hội, một phần của cảng Sài Gòn có lịch sử hơn 150 năm. Nơi đây từng là cửa ngõ giao thương đường biển quan trọng nhất miền Nam. Hiện khu cảng đang được chuyển đổi thành khu đô thị và dịch vụ ven sông.'],
    en: ['Saigon Port', 'Along Nguyen Tat Thanh street lies the Khanh Hoi port area, part of the over 150-year-old Saigon port. It was once the most important maritime trade gateway of southern Vietnam. The area is now being redeveloped into a riverside urban and service district.'],
  },
  {
    name: 'Công viên Khánh Hội', address: 'Đường Hoàng Diệu, Phường Khánh Hội', latitude: 10.7622, longitude: 106.7012, radius_m: 80, priority: 3,
    vi: ['Công viên Khánh Hội', 'Bạn đang đi ngang công viên Khánh Hội, mảng xanh nhỏ giữa khu dân cư đông đúc của Quận 4. Sáng sớm và chiều tối, người dân đến đây tập thể dục, đi dạo và cho trẻ em vui chơi.'],
    en: ['Khanh Hoi Park', 'You are passing Khanh Hoi park, a small green space in the dense residential area of District 4. Early mornings and evenings, locals come here to exercise, stroll and let children play.'],
  },
  {
    name: 'Trạm xe buýt Vĩnh Hội', address: 'Đường Hoàng Diệu, Phường Vĩnh Hội', latitude: 10.7593, longitude: 106.7005, radius_m: 50, priority: 2,
    vi: ['Trạm xe buýt Vĩnh Hội', 'Đây là trạm xe buýt Vĩnh Hội. Từ đây bạn có thể đi bộ khoảng năm phút đến phố ẩm thực Vĩnh Khánh. Quét mã QR tại trạm để nghe giới thiệu các điểm tham quan gần đó.'],
    en: ['Vinh Hoi Bus Stop', 'This is Vinh Hoi bus stop. From here it is about a five-minute walk to Vinh Khanh food street. Scan the QR code at the stop to hear about nearby attractions.'],
  },
];

const TOURS = [
  { name: 'Di sản ven sông Quận 4', description: 'Theo dấu lịch sử bến cảng: Cầu Mống, Bến Nhà Rồng, Cảng Sài Gòn, Cầu Khánh Hội.', pois: [4, 0, 5, 3] },
  { name: 'Ẩm thực đêm Vĩnh Khánh', description: 'Từ trạm xe buýt Vĩnh Hội đi bộ qua công viên, phố ốc và chợ Xóm Chiếu.', pois: [7, 6, 1, 2] },
];

const QR_STOPS = [
  { poi: 0, label: 'Trạm xe buýt Bến Nhà Rồng (Xóm Chiếu)' },
  { poi: 1, label: 'Trạm xe buýt Vĩnh Khánh (Vĩnh Hội)' },
  { poi: 2, label: 'Trạm xe buýt Chợ Xóm Chiếu' },
  { poi: 7, label: 'Trạm xe buýt Vĩnh Hội' },
  { poi: 3, label: 'Trạm xe buýt Cầu Khánh Hội' },
];

export function seed(db, { demo = false, adminPassword = 'admin123' } = {}) {
  db.exec('DELETE FROM usage_log; DELETE FROM location_log; DELETE FROM tour_poi; DELETE FROM tour; DELETE FROM qr_code; DELETE FROM poi_translation; DELETE FROM poi; DELETE FROM admin_user;');
  db.exec("DELETE FROM sqlite_sequence; UPDATE meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'content_version';");

  return transaction(db, () => {
    const adminId = Number(
      db.prepare('INSERT INTO admin_user (username, password_hash, full_name) VALUES (?, ?, ?)').run('admin', bcrypt.hashSync(adminPassword, 10), 'Quản trị nội dung').lastInsertRowid,
    );
    const insPoi = db.prepare('INSERT INTO poi (name, address, latitude, longitude, radius_m, priority, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insTr = db.prepare('INSERT INTO poi_translation (poi_id, language_code, title, narration_text) VALUES (?, ?, ?, ?)');
    const ids = SAMPLE_POIS.map((p) => {
      const id = Number(insPoi.run(p.name, p.address, p.latitude, p.longitude, p.radius_m, p.priority, adminId).lastInsertRowid);
      insTr.run(id, 'vi', p.vi[0], p.vi[1]);
      insTr.run(id, 'en', p.en[0], p.en[1]);
      return id;
    });
    for (const q of QR_STOPS) {
      db.prepare('INSERT INTO qr_code (poi_id, payload, label) VALUES (?, ?, ?)').run(ids[q.poi], crypto.randomBytes(9).toString('base64url'), q.label);
    }
    for (const t of TOURS) {
      const tid = Number(db.prepare('INSERT INTO tour (name, description, created_by) VALUES (?, ?, ?)').run(t.name, t.description, adminId).lastInsertRowid);
      t.pois.forEach((pi, i) => db.prepare('INSERT INTO tour_poi (tour_id, poi_id, visit_order) VALUES (?, ?, ?)').run(tid, ids[pi], i + 1));
    }
    if (demo) seedDemoUsage(db, ids);
    return { adminId, poiIds: ids };
  });
}

/** Sinh dữ liệu sử dụng GIẢ LẬP 30 ngày gần nhất (chỉ để demo màn thống kê). */
function seedDemoUsage(db, ids) {
  let s = 42;
  const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const insU = db.prepare('INSERT INTO usage_log (poi_id, session_id, trigger_method, language_code, played_at, listen_seconds) VALUES (?, ?, ?, ?, ?, ?)');
  const insL = db.prepare('INSERT INTO location_log (session_id, latitude, longitude, recorded_at) VALUES (?, ?, ?, ?)');
  const weights = [10, 9, 5, 3, 6, 3, 2, 4];
  const langs = ['vi', 'vi', 'vi', 'en', 'en', 'zh', 'ko', 'ja'];
  const now = Date.now();
  for (let n = 0; n < 400; n++) {
    const session = crypto.randomBytes(8).toString('hex');
    const start = now - Math.floor(rand() * 30) * 86400000 - Math.floor(rand() * 14 + 7) * 3600000;
    const lang = langs[Math.floor(rand() * langs.length)];
    const stops = 1 + Math.floor(rand() * 4);
    let lat = 10.757 + rand() * 0.013;
    let lng = 106.700 + rand() * 0.01;
    for (let k = 0; k < stops; k++) {
      const total = weights.reduce((a, b) => a + b, 0);
      let r = rand() * total;
      const pi = weights.findIndex((w) => (r -= w) < 0);
      const p = SAMPLE_POIS[pi];
      const t = start + k * 600000;
      for (let step = 0; step < 6; step++) {
        lat += (p.latitude - lat) / (6 - step) + (rand() - 0.5) * 0.0003;
        lng += (p.longitude - lng) / (6 - step) + (rand() - 0.5) * 0.0003;
        insL.run(session, Math.round(lat * 1e4) / 1e4, Math.round(lng * 1e4) / 1e4, new Date(t - (6 - step) * 60000).toISOString());
      }
      const method = rand() < 0.65 ? 'geofence' : rand() < 0.8 ? 'qr' : 'manual';
      insU.run(ids[pi], session, method, lang, new Date(t).toISOString(), Math.floor(15 + rand() * 75));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const demo = process.argv.includes('--demo');
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const db = openDatabase();
  const pw = process.env.ADMIN_PASSWORD || 'admin123';
  const { poiIds } = seed(db, { demo, adminPassword: pw });
  console.log(`Đã nạp ${poiIds.length} POI, ${TOURS.length} tour, ${QR_STOPS.length} mã QR${demo ? ' + dữ liệu thống kê giả lập' : ''}.`);
  console.log(`Tài khoản CMS: admin / ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD)' : 'admin123'}`);
}
