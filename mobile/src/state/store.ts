/**
 * Kho trạng thái toàn cục nhỏ gọn (useSyncExternalStore). Các service ngoài React (pipeline vị trí,
 * tác vụ nền, narration engine) ghi vào đây; màn hình đọc qua useAppStore(selector).
 */
import { useSyncExternalStore } from 'react';
import type { LanguageCode, LocationFix, Poi, Tour, TriggerMethod } from '../types';

// Các tùy chọn người dùng chỉnh trong màn hình Cài đặt và được lưu bền.
export interface Settings {
  language: LanguageCode;
  autoNarration: boolean;
  cooldownMinutes: number;
  /** '' = dùng địa chỉ mặc định (xem config.ts). */
  serverUrl: string;
  shareAnonymousData: boolean;
  backgroundLocation: boolean;
  simulation: boolean;
  simSpeed: number;
}

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable';

// Thông tin bài thuyết minh đang phát, phục vụ MiniPlayer và trạng thái nút play/stop.
export interface NowPlaying {
  poiId: number;
  title: string;
  language: string;
  isFallback: boolean;
  method: TriggerMethod;
  kind: 'audio' | 'tts';
  startedAt: number;
}

// Banner thông báo tạm thời (toast) đang hiển thị.
export interface Notice {
  id: number;
  kind: 'info' | 'warn' | 'error';
  text: string;
}

// Tour người dùng đang đi theo và vị trí điểm kế tiếp.
export interface FollowTour {
  tourId: number;
  /** Chỉ số điểm kế tiếp trong tour.poi_ids. */
  nextIndex: number;
}

// Toàn bộ trạng thái runtime của app: dữ liệu nội dung, vị trí, quyền, đồng bộ và UI tạm thời.
export interface AppState {
  ready: boolean;
  initError: string | null;
  settings: Settings;
  apiBase: string;
  online: boolean | null;
  pois: Poi[];
  tours: Tour[];
  contentVersion: number | null;
  lastSyncAt: string | null;
  syncing: boolean;
  syncError: string | null;
  locationPermission: PermissionState;
  backgroundStatus: 'off' | 'running' | 'unsupported' | 'denied';
  fix: LocationFix | null;
  lastIgnoredAccuracy: number | null;
  inside: number[];
  distances: Record<number, number>;
  recentlyPlayed: number[];
  nowPlaying: NowPlaying | null;
  notice: Notice | null;
  follow: FollowTour | null;
  simWalkingTourId: number | null;
  pendingUploads: number;
}

type Listener = () => void;

// Giá trị khởi tạo trước khi bootstrap đọc cấu hình/cache từ thiết bị.
let state: AppState = {
  ready: false,
  initError: null,
  settings: {
    language: 'vi',
    autoNarration: true,
    cooldownMinutes: 10,
    serverUrl: '',
    shareAnonymousData: true,
    backgroundLocation: false,
    simulation: false,
    simSpeed: 5,
  },
  apiBase: '',
  online: null,
  pois: [],
  tours: [],
  contentVersion: null,
  lastSyncAt: null,
  syncing: false,
  syncError: null,
  locationPermission: 'unknown',
  backgroundStatus: 'off',
  fix: null,
  lastIgnoredAccuracy: null,
  inside: [],
  distances: {},
  recentlyPlayed: [],
  nowPlaying: null,
  notice: null,
  follow: null,
  simWalkingTourId: null,
  pendingUploads: 0,
};

const listeners = new Set<Listener>();

// API store tối giản: đọc state, cập nhật một phần state và đăng ký listener.
export const store = {
  get: (): AppState => state,
  set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
    const p = typeof patch === 'function' ? patch(state) : patch;
    // Tạo object mới để React nhận biết thay đổi, sau đó thông báo cho mọi subscriber.
    state = { ...state, ...p };
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

// Hook đọc một phần state và tự re-render khi store thay đổi.
export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}

let noticeSeq = 0;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
// Hiển thị toast và tự xóa sau `ms`; toast mới sẽ thay thế và hủy hẹn giờ của toast cũ.
export function notify(text: string, kind: Notice['kind'] = 'info', ms = 4000): void {
  if (noticeTimer) clearTimeout(noticeTimer);
  const id = ++noticeSeq;
  store.set({ notice: { id, kind, text } });
  noticeTimer = setTimeout(() => {
    if (store.get().notice?.id === id) store.set({ notice: null });
  }, ms);
}

// Tra cứu POI theo id trong snapshot state hiện tại.
export function poiById(id: number): Poi | undefined {
  return state.pois.find((p) => p.id === id);
}
