import { badRequest } from './errors.js';

export function toInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw badRequest(`${field} không hợp lệ`, { [field]: 'Phải là số nguyên' });
  return n;
}

export function idParam(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw badRequest('Mã không hợp lệ');
  return n;
}

export const isIsoDate = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s));

export function trimOrNull(v, max = 500) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}
