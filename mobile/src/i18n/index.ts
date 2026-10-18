/**
 * Chuỗi giao diện. Giao diện theo ngôn ngữ thuyết minh: "vi" → tiếng Việt, ngôn ngữ khác → tiếng Anh
 * (nội dung thuyết minh vẫn đúng ngôn ngữ đã chọn: zh, ko, ja, fr).
 */
import { store, useAppStore } from '../state/store';

const vi = {
  'tab.map': 'Bản đồ',
  'tab.tours': 'Tour',
  'tab.scan': 'Quét QR',
  'tab.settings': 'Cài đặt',

  'common.loading': 'Đang tải…',
  'common.retry': 'Thử lại',
  'common.close': 'Đóng',
  'common.cancel': 'Huỷ',
  'common.ok': 'Đồng ý',
  'common.back': 'Quay lại',
  'common.on': 'Bật',
  'common.off': 'Tắt',
  'common.never': 'Chưa bao giờ',
  'common.error': 'Đã xảy ra lỗi',

  'init.error': 'Không mở được cơ sở dữ liệu trên máy: {msg}',

  'perm.title': 'Cần quyền vị trí để thuyết minh tự động',
  'perm.body':
    'Ứng dụng dùng vị trí của bạn để tự phát thuyết minh khi bạn đến gần một điểm tham quan. Vị trí chỉ được gửi ẩn danh, làm tròn ~11 m. Bạn đã từ chối quyền nên tính năng tự động đã dừng — bạn vẫn có thể quét QR tại trạm xe buýt, chạm vào điểm trên bản đồ, hoặc bật chế độ mô phỏng.',
  'perm.openSettings': 'Mở Cài đặt',
  'perm.unavailable': 'Thiết bị không cung cấp dịch vụ vị trí.',

  'map.noData': 'Chưa có dữ liệu điểm tham quan',
  'map.noDataOffline': 'Bạn đang ngoại tuyến và máy chưa có dữ liệu. Hãy kết nối Internet (Wi-Fi hoặc 4G) để tải danh sách điểm thuyết minh lần đầu.',
  'map.noDataServer': 'Không tải được dữ liệu từ máy chủ {url}. Kiểm tra địa chỉ máy chủ trong Cài đặt.',
  'map.syncing': 'Đang tải dữ liệu điểm tham quan…',
  'map.waitingGps': 'Đang chờ tín hiệu GPS…',
  'map.weakGps': 'GPS yếu (±{acc} m) — bỏ qua để tránh kích hoạt nhầm',
  'map.simOn': 'Mô phỏng vị trí: chạm vào bản đồ để đặt vị trí',
  'map.walking': 'Đang đi bộ mô phỏng',
  'map.stopWalk': 'Dừng đi bộ',
  'map.nearest': 'Gần nhất: {title} · {dist}',
  'map.inside': 'Bạn đang ở: {title}',
  'map.offlineBadge': 'Ngoại tuyến',
  'map.autoOff': 'Thuyết minh tự động đang tắt',
  'map.legend.inside': 'Đang ở trong',
  'map.legend.playing': 'Đang phát',
  'map.legend.played': 'Vừa nghe',
  'map.legend.next': 'Điểm kế tiếp',
  'map.legend.idle': 'Điểm thuyết minh',

  'poi.play': 'Nghe thuyết minh',
  'poi.stop': 'Dừng',
  'poi.notFound': 'Không tìm thấy điểm thuyết minh này trên máy.',
  'poi.distance': 'Cách bạn {dist}',
  'poi.radius': 'Bán kính kích hoạt {r} m · Ưu tiên {p}',
  'poi.audio': 'Có audio thu sẵn',
  'poi.tts': 'Đọc bằng giọng máy (TTS)',
  'poi.fallbackNote': 'Chưa có bản {lang} — sẽ phát bản tiếng Việt.',
  'poi.languages': 'Ngôn ngữ có sẵn',
  'poi.setSim': 'Đặt vị trí mô phỏng tại đây',

  'tours.title': 'Tour tham quan',
  'tours.empty': 'Chưa có tour nào. Hãy đồng bộ dữ liệu trong Cài đặt.',
  'tours.stops': '{n} điểm dừng',
  'tour.follow': 'Đi theo tour này',
  'tour.unfollow': 'Ngừng đi theo',
  'tour.following': 'Đang đi theo tour',
  'tour.next': 'Điểm kế tiếp: {title}',
  'tour.nextDist': 'Điểm kế tiếp: {title} · {dist}',
  'tour.completed': 'Hoàn thành tour "{name}"',
  'tour.done': 'Đã hoàn thành',
  'tour.skip': 'Bỏ qua điểm này',
  'tour.simWalk': 'Mô phỏng đi bộ theo tour',
  'tour.simNeedsMode': 'Bật "Mô phỏng vị trí" trong Cài đặt để tự đi bộ theo tour.',
  'tour.notFound': 'Không tìm thấy tour.',

  'scan.title': 'Quét mã QR tại trạm xe buýt',
  'scan.hint': 'Đưa mã QR vào khung hình',
  'scan.permTitle': 'Cần quyền camera để quét QR',
  'scan.permBody': 'Camera chỉ dùng để đọc mã QR, không chụp hay lưu hình ảnh.',
  'scan.grant': 'Cho phép camera',
  'scan.manual': 'Nhập mã thủ công',
  'scan.manualPlaceholder': 'NARR:xxxxxxxx',
  'scan.submit': 'Mở thuyết minh',
  'scan.resolving': 'Đang tra mã…',
  'scan.invalid': 'Mã QR không hợp lệ',
  'scan.offline': 'Bạn đang ngoại tuyến và mã này chưa được lưu trên máy. Hãy kết nối mạng rồi quét lại.',
  'scan.again': 'Quét mã khác',
  'scan.found': 'Đã nhận mã: {label}',
  'scan.fromCache': 'Dùng dữ liệu đã lưu (ngoại tuyến)',
  'scan.chooseLang': 'Chọn ngôn ngữ để nghe',
  'scan.noCamera': 'Không mở được camera trên thiết bị này (emulator). Hãy dùng ô nhập mã bên dưới.',

  'player.playing': 'Đang phát',
  'player.stop': 'Dừng phát',
  'player.tts': 'TTS',
  'player.audio': 'Audio',

  'settings.title': 'Cài đặt',
  'settings.language': 'Ngôn ngữ thuyết minh',
  'settings.languageHint': 'Giao diện hiển thị tiếng Việt khi chọn Tiếng Việt, các ngôn ngữ khác dùng giao diện tiếng Anh.',
  'settings.narration': 'Thuyết minh',
  'settings.auto': 'Tự động thuyết minh khi đến gần',
  'settings.cooldown': 'Không phát lại cùng một điểm trong (phút)',
  'settings.background': 'Tiếp tục khi chạy nền',
  'settings.bgExpoGo': 'Expo Go không hỗ trợ vị trí nền — cần development build. App vẫn hoạt động khi mở màn hình.',
  'settings.bgDenied': 'Chưa được cấp quyền vị trí "Luôn luôn".',
  'settings.bgRunning': 'Đang theo dõi vị trí nền.',
  'settings.server': 'Máy chủ',
  'settings.serverUrl': 'Địa chỉ máy chủ',
  'settings.serverHint': 'Mặc định: {url}. Trên điện thoại thật không dùng được "localhost" — nhập IP LAN của máy chạy backend, ví dụ http://192.168.1.10:4000',
  'settings.save': 'Lưu',
  'settings.reset': 'Mặc định',
  'settings.data': 'Dữ liệu',
  'settings.syncNow': 'Đồng bộ ngay',
  'settings.lastSync': 'Lần đồng bộ cuối',
  'settings.version': 'Phiên bản nội dung',
  'settings.poiCount': '{p} điểm · {t} tour',
  'settings.downloadAudio': 'Tải tất cả audio để nghe offline',
  'settings.downloading': 'Đang tải {d}/{n}…',
  'settings.downloaded': 'Đã tải {n} file audio ({size})',
  'settings.noAudio': 'Nội dung hiện chưa có file audio thu sẵn — app sẽ đọc bằng giọng máy (TTS), không cần tải.',
  'settings.clearCache': 'Xoá bộ nhớ đệm',
  'settings.clearConfirm': 'Xoá dữ liệu offline, mã QR đã lưu và audio đã tải? Cài đặt được giữ nguyên.',
  'settings.cleared': 'Đã xoá bộ nhớ đệm',
  'settings.privacy': 'Quyền riêng tư',
  'settings.share': 'Gửi dữ liệu ẩn danh',
  'settings.privacyNote':
    'Ứng dụng không yêu cầu đăng nhập. Mỗi lần mở app tạo một mã phiên ngẫu nhiên, không gắn với thiết bị hay danh tính. Chỉ gửi lượt nghe (điểm, thời lượng, ngôn ngữ, cách kích hoạt) và vị trí lấy mẫu thưa (~30 giây/25 m), máy chủ làm tròn toạ độ ~11 m. Tắt mục này để không gửi gì.',
  'settings.pending': '{n} bản ghi chờ gửi',
  'settings.session': 'Mã phiên hiện tại',
  'settings.demo': 'Chế độ demo',
  'settings.sim': 'Mô phỏng vị trí',
  'settings.simHint': 'Bỏ qua GPS thật: chạm vào bản đồ để đặt vị trí, hoặc tự đi bộ dọc một tour. Dùng cho emulator/lớp học.',
  'settings.simSpeed': 'Tốc độ đi bộ mô phỏng (×)',
  'settings.online': 'Kết nối máy chủ',
  'settings.onlineYes': 'Đã kết nối',
  'settings.onlineNo': 'Không kết nối được',
  'settings.onlineUnknown': 'Chưa rõ',

  'sync.updated': 'Đã cập nhật nội dung (phiên bản {v})',
  'sync.upToDate': 'Nội dung đã mới nhất (phiên bản {v})',
  'sync.offline': 'Không kết nối được máy chủ — đang dùng dữ liệu offline',
  'sync.error': 'Đồng bộ lỗi: {msg}',

  'notice.fallback': '"{title}" chưa có bản dịch ngôn ngữ đã chọn — phát bản tiếng Việt',
  'notice.noContent': '"{title}" chưa có nội dung thuyết minh',
  'notice.discardBusy': 'Bỏ qua "{title}": đang phát bài khác',
  'notice.discardCooldown': 'Bỏ qua "{title}": vừa nghe (còn {min} phút)',

  'sim.walkDone': 'Đã đi hết tour mô phỏng',
  'method.geofence': 'Tự động (GPS)',
  'method.qr': 'Mã QR',
  'method.manual': 'Thủ công',
};

type Key = keyof typeof vi;

const en: Record<Key, string> = {
  'tab.map': 'Map',
  'tab.tours': 'Tours',
  'tab.scan': 'Scan QR',
  'tab.settings': 'Settings',

  'common.loading': 'Loading…',
  'common.retry': 'Retry',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.ok': 'OK',
  'common.back': 'Back',
  'common.on': 'On',
  'common.off': 'Off',
  'common.never': 'Never',
  'common.error': 'Something went wrong',

  'init.error': 'Could not open the on-device database: {msg}',

  'perm.title': 'Location permission needed for automatic narration',
  'perm.body':
    'The app uses your location to play narration automatically when you approach a point of interest. Location is only sent anonymously and rounded to ~11 m. You denied the permission, so automatic narration is stopped — you can still scan QR codes at bus stops, tap points on the map, or turn on simulation mode.',
  'perm.openSettings': 'Open Settings',
  'perm.unavailable': 'Location services are not available on this device.',

  'map.noData': 'No points of interest yet',
  'map.noDataOffline': 'You are offline and no data is stored on this device. Please connect to the Internet (Wi-Fi or mobile data) to download the points of interest for the first time.',
  'map.noDataServer': 'Could not download data from {url}. Check the server address in Settings.',
  'map.syncing': 'Downloading points of interest…',
  'map.waitingGps': 'Waiting for GPS…',
  'map.weakGps': 'Weak GPS (±{acc} m) — ignored to avoid false triggers',
  'map.simOn': 'Location simulation: tap the map to set your position',
  'map.walking': 'Simulated walk in progress',
  'map.stopWalk': 'Stop walk',
  'map.nearest': 'Nearest: {title} · {dist}',
  'map.inside': 'You are at: {title}',
  'map.offlineBadge': 'Offline',
  'map.autoOff': 'Automatic narration is off',
  'map.legend.inside': 'Inside',
  'map.legend.playing': 'Playing',
  'map.legend.played': 'Recently heard',
  'map.legend.next': 'Next stop',
  'map.legend.idle': 'Point of interest',

  'poi.play': 'Play narration',
  'poi.stop': 'Stop',
  'poi.notFound': 'This point of interest is not on this device.',
  'poi.distance': '{dist} from you',
  'poi.radius': 'Trigger radius {r} m · Priority {p}',
  'poi.audio': 'Pre-recorded audio available',
  'poi.tts': 'Read by device voice (TTS)',
  'poi.fallbackNote': 'No {lang} version yet — the Vietnamese version will play.',
  'poi.languages': 'Available languages',
  'poi.setSim': 'Set simulated location here',

  'tours.title': 'Tours',
  'tours.empty': 'No tours yet. Sync data in Settings.',
  'tours.stops': '{n} stops',
  'tour.follow': 'Follow this tour',
  'tour.unfollow': 'Stop following',
  'tour.following': 'Following tour',
  'tour.next': 'Next stop: {title}',
  'tour.nextDist': 'Next stop: {title} · {dist}',
  'tour.completed': 'Tour "{name}" completed',
  'tour.done': 'Completed',
  'tour.skip': 'Skip this stop',
  'tour.simWalk': 'Simulate walking this tour',
  'tour.simNeedsMode': 'Turn on "Location simulation" in Settings to auto-walk this tour.',
  'tour.notFound': 'Tour not found.',

  'scan.title': 'Scan the QR code at the bus stop',
  'scan.hint': 'Point the camera at the QR code',
  'scan.permTitle': 'Camera permission needed to scan QR codes',
  'scan.permBody': 'The camera is only used to read QR codes; no photos are taken or stored.',
  'scan.grant': 'Allow camera',
  'scan.manual': 'Enter code manually',
  'scan.manualPlaceholder': 'NARR:xxxxxxxx',
  'scan.submit': 'Open narration',
  'scan.resolving': 'Looking up code…',
  'scan.invalid': 'Invalid QR code',
  'scan.offline': 'You are offline and this code is not stored on the device. Connect to the Internet and scan again.',
  'scan.again': 'Scan another code',
  'scan.found': 'Code recognised: {label}',
  'scan.fromCache': 'Using saved data (offline)',
  'scan.chooseLang': 'Choose a language to listen',
  'scan.noCamera': 'The camera is not available on this device (emulator). Use the code field below.',

  'player.playing': 'Now playing',
  'player.stop': 'Stop playback',
  'player.tts': 'TTS',
  'player.audio': 'Audio',

  'settings.title': 'Settings',
  'settings.language': 'Narration language',
  'settings.languageHint': 'The interface is in Vietnamese when Tiếng Việt is selected and in English otherwise.',
  'settings.narration': 'Narration',
  'settings.auto': 'Narrate automatically nearby',
  'settings.cooldown': 'Do not replay the same point within (minutes)',
  'settings.background': 'Keep running in background',
  'settings.bgExpoGo': 'Expo Go does not support background location — a development build is required. The app still works while open.',
  'settings.bgDenied': '"Always" location permission not granted.',
  'settings.bgRunning': 'Background location tracking is running.',
  'settings.server': 'Server',
  'settings.serverUrl': 'Server address',
  'settings.serverHint': 'Default: {url}. On a real phone "localhost" does not work — enter the LAN IP of the computer running the backend, e.g. http://192.168.1.10:4000',
  'settings.save': 'Save',
  'settings.reset': 'Default',
  'settings.data': 'Data',
  'settings.syncNow': 'Sync now',
  'settings.lastSync': 'Last sync',
  'settings.version': 'Content version',
  'settings.poiCount': '{p} points · {t} tours',
  'settings.downloadAudio': 'Download all audio for offline use',
  'settings.downloading': 'Downloading {d}/{n}…',
  'settings.downloaded': '{n} audio files downloaded ({size})',
  'settings.noAudio': 'The content has no pre-recorded audio yet — the device voice (TTS) will be used, nothing to download.',
  'settings.clearCache': 'Clear cache',
  'settings.clearConfirm': 'Delete offline data, saved QR codes and downloaded audio? Settings are kept.',
  'settings.cleared': 'Cache cleared',
  'settings.privacy': 'Privacy',
  'settings.share': 'Send anonymous data',
  'settings.privacyNote':
    'No login is required. Each app launch creates a random session ID that is not tied to your device or identity. Only plays (point, duration, language, trigger method) and sparse location samples (~30 s / 25 m) are sent; the server rounds coordinates to ~11 m. Turn this off to send nothing.',
  'settings.pending': '{n} records waiting to upload',
  'settings.session': 'Current session ID',
  'settings.demo': 'Demo mode',
  'settings.sim': 'Location simulation',
  'settings.simHint': 'Ignore real GPS: tap the map to set a position, or auto-walk along a tour. For emulators/classroom demos.',
  'settings.simSpeed': 'Simulated walking speed (×)',
  'settings.online': 'Server connection',
  'settings.onlineYes': 'Connected',
  'settings.onlineNo': 'Unreachable',
  'settings.onlineUnknown': 'Unknown',

  'sync.updated': 'Content updated (version {v})',
  'sync.upToDate': 'Content is up to date (version {v})',
  'sync.offline': 'Server unreachable — using offline data',
  'sync.error': 'Sync failed: {msg}',

  'notice.fallback': '"{title}" has no translation in the selected language — playing Vietnamese',
  'notice.noContent': '"{title}" has no narration yet',
  'notice.discardBusy': 'Skipped "{title}": another narration is playing',
  'notice.discardCooldown': 'Skipped "{title}": heard recently ({min} min left)',

  'sim.walkDone': 'Simulated tour walk finished',
  'method.geofence': 'Automatic (GPS)',
  'method.qr': 'QR code',
  'method.manual': 'Manual',
};

export type I18nKey = Key;
export type UiLang = 'vi' | 'en';

export const uiLangFor = (narrationLang: string): UiLang => (narrationLang === 'vi' ? 'vi' : 'en');

function format(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m));
}

export function translate(lang: UiLang, key: Key, params?: Record<string, string | number>): string {
  return format((lang === 'vi' ? vi : en)[key] ?? vi[key] ?? key, params);
}

/** Dùng ngoài React (service). */
export function t(key: Key, params?: Record<string, string | number>): string {
  return translate(uiLangFor(store.get().settings.language), key, params);
}

/** Hook cho màn hình: re-render khi đổi ngôn ngữ. */
export function useT() {
  const lang = useAppStore((s) => uiLangFor(s.settings.language));
  return { lang, t: (key: Key, params?: Record<string, string | number>) => translate(lang, key, params) };
}

export const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh: '中文',
  ko: '한국어',
  ja: '日本語',
  fr: 'Français',
};

export const LANGUAGE_FLAGS: Record<string, string> = { vi: 'VI', en: 'EN', zh: 'ZH', ko: 'KO', ja: 'JA', fr: 'FR' };

export { vi as viStrings, en as enStrings };
