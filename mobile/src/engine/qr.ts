/**
 * Phân tích chuỗi đọc được từ mã QR (UC2 bước 3). Khớp quy tắc phía máy chủ (qrService.extractPayload):
 *   "NARR:<mã>", "<mã>" trần, hoặc URL ".../q/<mã>". Mã gồm 6–64 ký tự [A-Za-z0-9_-].
 * Trả null nếu chuỗi chắc chắn không hợp lệ → UI báo "Mã QR không hợp lệ" ngay, không cần mạng.
 */
/** Tiền tố chuẩn của payload QR; dạng rút gọn "<mã>" sẽ được chuẩn hoá về dạng này. */
export const QR_PREFIX = 'NARR:';
// Mã hợp lệ: 6–64 ký tự chữ/số, gạch dưới hoặc gạch ngang.
const CODE_RE = /^[A-Za-z0-9_-]{6,64}$/;

/** Kết quả phân tích QR: mã đã tách và payload chuẩn hoá để gửi máy chủ. */
export interface ParsedQr {
  code: string;
  /** Chuỗi gửi lên GET /api/qr/:payload (đã chuẩn hoá về dạng NARR:<mã>). */
  payload: string;
}

/**
 * Phân tích chuỗi thô đọc từ QR (hoặc người dùng nhập tay).
 * Trả về null nếu chắc chắn không phải mã hợp lệ, ngược lại là mã + payload chuẩn.
 */
export function parseQrPayload(raw: unknown): ParsedQr | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  let code: string | null = null;
  // Ưu tiên dạng URL ".../q/<mã>", sau đó tiền tố NARR:, cuối cùng coi cả chuỗi là mã trần.
  const url = s.match(/\/q\/([A-Za-z0-9_-]{6,64})\/?(?:[?#].*)?$/);
  if (url) code = url[1];
  else if (s.toUpperCase().startsWith(QR_PREFIX)) code = s.slice(QR_PREFIX.length).trim();
  else code = s;
  if (!code || !CODE_RE.test(code)) return null;
  return { code, payload: QR_PREFIX + code };
}

/** Đường dẫn API đã encode, ví dụ /api/qr/NARR%3AabcDEF123 */
export function qrApiPath(parsed: ParsedQr): string {
  return `/api/qr/${encodeURIComponent(parsed.payload)}`;
}
