/**
 * Cấu hình địa chỉ máy chủ.
 * Thứ tự ưu tiên: URL người dùng nhập trong Cài đặt > EXPO_PUBLIC_API_URL > IP LAN của máy chạy Metro
 * (lấy từ hostUri khi chạy Expo Go / dev build) > mặc định theo nền tảng.
 * Lưu ý: trên điện thoại thật "localhost" là chính điện thoại → phải dùng IP LAN của máy chạy backend.
 */
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

export const API_PORT = 4000;

export function normalizeApiUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (u.endsWith('/api')) u = u.slice(0, -4);
  if (u && !/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
}

/** IP LAN của máy dev (ví dụ "192.168.1.10:8081" → "192.168.1.10"). */
function devHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? null;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

export function defaultApiUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env && env.trim()) return normalizeApiUrl(env);
  const host = devHost();
  if (host) return `http://${host}:${API_PORT}`;
  // Android emulator: 10.0.2.2 trỏ về localhost của máy tính.
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`;
  return `http://localhost:${API_PORT}`;
}

/** Expo Go không hỗ trợ cập nhật vị trí nền (Android: không có TaskManager; iOS: không có background mode). */
export const IS_EXPO_GO = isRunningInExpoGo();

export const SYNC_INTERVAL_MS = 5 * 60 * 1000;
export const FLUSH_INTERVAL_MS = 60 * 1000;
export const REQUEST_TIMEOUT_MS = 8000;
export const DEFAULT_REGION = { latitude: 10.7628, longitude: 106.7052 };
