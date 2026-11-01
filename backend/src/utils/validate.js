/**
 * Tầng tiện ích: các hàm validate/chuẩn hoá dữ liệu đầu vào dùng chung.
 * Mọi lỗi đều ném AppError 400 để errorHandler trả về đúng định dạng JSON.
 */
import { badRequest } from './errors.js';

// Ép giá trị về số nguyên; ném lỗi 400 kèm tên field nếu không phải số nguyên.
export function toInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw badRequest(`${field} không hợp lệ`, { [field]: 'Phải là số nguyên' });
  return n;
}

// Validate tham số id trên URL: phải là số nguyên dương, trả về dạng number.
export function idParam(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw badRequest('Mã không hợp lệ');
  return n;
}

// Kiểm tra chuỗi có phải ngày giờ parse được bởi Date (dùng cho log played_at/recorded_at).
export const isIsoDate = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s));

// Cắt khoảng trắng hai đầu, giới hạn độ dài; rỗng/không có giá trị thì trả null.
export function trimOrNull(v, max = 500) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}
