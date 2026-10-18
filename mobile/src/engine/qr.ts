/**
 * Phân tích chuỗi đọc được từ mã QR (UC2 bước 3). Khớp quy tắc phía máy chủ (qrService.extractPayload):
 *   "NARR:<mã>", "<mã>" trần, hoặc URL ".../q/<mã>". Mã gồm 6–64 ký tự [A-Za-z0-9_-].
 * Trả null nếu chuỗi chắc chắn không hợp lệ → UI báo "Mã QR không hợp lệ" ngay, không cần mạng.
 */
export const QR_PREFIX = 'NARR:';
const CODE_RE = /^[A-Za-z0-9_-]{6,64}$/;

export interface ParsedQr {
  code: string;
  /** Chuỗi gửi lên GET /api/qr/:payload (đã chuẩn hoá về dạng NARR:<mã>). */
  payload: string;
}

export function parseQrPayload(raw: unknown): ParsedQr | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  let code: string | null = null;
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
