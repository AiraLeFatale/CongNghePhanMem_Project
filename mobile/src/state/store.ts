/**
 * Kho trạng thái toàn cục nhỏ gọn (useSyncExternalStore). Các service ngoài React (pipeline vị trí,
 * tác vụ nền, narration engine) ghi vào đây; màn hình đọc qua useAppStore(selector).
 */
import { useSyncExternalStore } from 'react';
import type { LanguageCode, LocationFix, Poi, Tour, TriggerMethod } from '../types';

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

export interface NowPlaying {
  poiId: number;
  title: string;
  language: string;
  isFallback: boolean;
  method: TriggerMethod;
  kind: 'audio' | 'tts';
  startedAt: number;
}

export interface Notice {
  id: number;
  kind: 'info' | 'warn' | 'error';
  text: string;
}

export interface FollowTour {
  tourId: number;
  /** Chỉ số điểm kế tiếp trong tour.poi_ids. */
  nextIndex: number;
}

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

export const store = {
  get: (): AppState => state,
  set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
    const p = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...p };
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useAppStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}

let noticeSeq = 0;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
export function notify(text: string, kind: Notice['kind'] = 'info', ms = 4000): void {
  if (noticeTimer) clearTimeout(noticeTimer);
  const id = ++noticeSeq;
  store.set({ notice: { id, kind, text } });
  noticeTimer = setTimeout(() => {
    if (store.get().notice?.id === id) store.set({ notice: null });
  }, ms);
}

export function poiById(id: number): Poi | undefined {
  return state.pois.find((p) => p.id === id);
}
