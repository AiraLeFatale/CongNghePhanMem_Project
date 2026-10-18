/** Khởi động app: SQLite → cài đặt → nội dung offline → đồng bộ → vị trí; và các vòng lặp định kỳ. */
import NetInfo from '@react-native-community/netinfo';
import { AppState as RNAppState } from 'react-native';
import { defaultApiUrl, FLUSH_INTERVAL_MS, normalizeApiUrl, SYNC_INTERVAL_MS } from '../config';
import { getDb } from '../data/db';
import { loadSettings, saveSettings } from '../data/settings';
import { loadLocalContent, syncNow } from '../data/sync';
import { notify, Settings, store } from '../state/store';
import { flush, onSharingChanged, refreshPending } from './analytics';
import { configureAudioSession } from './audioOutput';
import {
  checkForegroundPermission,
  requestForegroundPermission,
  startForegroundTracking,
  startTracking,
  stopBackgroundTracking,
} from './location';
import { applySettingsToEngines, refreshRegions, resetGeofence } from './pipeline';
import { stopTourWalk } from './simulation';
import { t } from '../i18n';

let started = false;

export function apiBaseFor(s: Settings): string {
  return s.serverUrl.trim() ? normalizeApiUrl(s.serverUrl) : defaultApiUrl();
}

export async function runSync(force = false, announce = false) {
  const r = await syncNow({ force });
  if (r.status === 'updated') {
    refreshRegions();
    if (announce) notify(t('sync.updated', { v: r.version }), 'info');
  } else if (announce) {
    if (r.status === 'up-to-date') notify(t('sync.upToDate', { v: r.version }), 'info');
    else if (r.status === 'offline') notify(t('sync.offline'), 'warn');
    else notify(t('sync.error', { msg: r.message }), 'error');
  }
  if (r.status !== 'offline') flush().catch(() => {});
  return r;
}

export async function bootstrap(): Promise<void> {
  if (started) return;
  started = true;
  try {
    await getDb();
    const settings = await loadSettings(store.get().settings);
    store.set({ settings, apiBase: apiBaseFor(settings) });
    await loadLocalContent();
    refreshRegions();
    applySettingsToEngines();
    await refreshPending();
    await configureAudioSession();
    store.set({ ready: true });
  } catch (e: any) {
    store.set({ ready: true, initError: e?.message ?? String(e) });
    return;
  }

  runSync().catch(() => {});

  NetInfo.addEventListener((s) => {
    const connected = s.isConnected !== false && s.isInternetReachable !== false;
    if (!connected) store.set({ online: false });
    else if (store.get().online === false) {
      // Có mạng lại → thử đồng bộ và gửi hàng đợi.
      store.set({ online: null });
      runSync().catch(() => {});
    }
  });
  setInterval(() => runSync().catch(() => {}), SYNC_INTERVAL_MS);
  setInterval(() => flush().catch(() => {}), FLUSH_INTERVAL_MS);
  RNAppState.addEventListener('change', (st) => {
    if (st === 'background') flush().catch(() => {});
    if (st === 'active') runSync().catch(() => {});
  });

  // UC1 bước 1: xin quyền vị trí.
  const granted = (await checkForegroundPermission()) || (store.get().locationPermission === 'unknown' && (await requestForegroundPermission()));
  if (granted) await startTracking();
}

/** Thử xin quyền lại (nút trên màn hình E1). */
export async function retryLocationPermission(): Promise<boolean> {
  const ok = await requestForegroundPermission();
  if (ok) await startTracking();
  return ok;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const prev = store.get().settings;
  const next = { ...prev, ...patch };
  store.set({ settings: next });
  await saveSettings(next);

  if (patch.cooldownMinutes != null) applySettingsToEngines();
  if (patch.serverUrl != null && patch.serverUrl !== prev.serverUrl) {
    store.set({ apiBase: apiBaseFor(next), online: null });
    runSync(true, true).catch(() => {});
  }
  if (patch.shareAnonymousData != null && patch.shareAnonymousData !== prev.shareAnonymousData) {
    await onSharingChanged(patch.shareAnonymousData);
  }
  if (patch.simulation != null && patch.simulation !== prev.simulation) {
    stopTourWalk();
    resetGeofence();
    if (!patch.simulation) await startTracking();
  }
  if (patch.backgroundLocation != null && patch.backgroundLocation !== prev.backgroundLocation) {
    if (patch.backgroundLocation) {
      await startTracking();
    } else {
      await stopBackgroundTracking();
      await startForegroundTracking();
    }
  }
}
