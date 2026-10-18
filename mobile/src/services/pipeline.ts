/**
 * Đường ống chính: Location service → Geofence engine → Narration engine (+ analytics).
 * Đặt ngoài React để tác vụ vị trí nền và chế độ mô phỏng dùng chung cùng một luồng xử lý.
 */
import { CooldownGate } from '../engine/cooldown';
import { GeofenceEngine } from '../engine/geofence';
import { displayTitle } from '../engine/language';
import { NarrationEngine, PlayResult } from '../engine/narration';
import { getLocalAudio } from '../data/audioCache';
import { resolveMediaUrl } from '../data/syncLogic';
import { notify, poiById, store } from '../state/store';
import type { LocationFix, Poi, TriggerMethod } from '../types';
import { expoAudioOutput, expoSpeechOutput } from './audioOutput';
import { logPlayback, sampleLocation } from './analytics';
import { t } from '../i18n';

export const geofence = new GeofenceEngine();
export const gate = new CooldownGate();

export const narration = new NarrationEngine({
  audio: expoAudioOutput,
  speech: expoSpeechOutput,
  gate,
  getLocalAudio,
  resolveUrl: (url) => resolveMediaUrl(url, store.get().apiBase),
  isOnline: () => store.get().online !== false,
  log: (entry) => {
    logPlayback(entry).catch(() => {});
  },
  onChange: (np) => store.set({ nowPlaying: np, recentlyPlayed: gate.recentlyPlayed() }),
});

/** Gọi lại sau mỗi lần nội dung thay đổi. */
export function refreshRegions(): void {
  geofence.setRegions(store.get().pois);
}

export function applySettingsToEngines(): void {
  gate.setCooldownMinutes(store.get().settings.cooldownMinutes);
}

export async function playPoi(poi: Poi | number, method: TriggerMethod, language?: string): Promise<PlayResult | null> {
  const p = typeof poi === 'number' ? poiById(poi) : poi;
  if (!p) return null;
  const lang = language ?? store.get().settings.language;
  const res = await narration.play(p, method, lang);
  const title = displayTitle(p, lang);
  if (res.status === 'playing' && res.isFallback) notify(t('notice.fallback', { title }), 'info');
  else if (res.status === 'no-content') notify(t('notice.noContent', { title }), 'warn');
  else if (res.status === 'discarded' && method === 'geofence') {
    // UC1 A1: bỏ qua, chỉ báo nhẹ để người dùng/giảng viên thấy được logic.
    const key = res.reason === 'busy' ? 'notice.discardBusy' : 'notice.discardCooldown';
    notify(t(key, { title, min: Math.ceil((res.remainingMs ?? 0) / 60000) }), 'info', 2500);
  }
  return res;
}

export function stopPlayback(): void {
  narration.stop();
}

function advanceFollow(entered: number[]): void {
  const f = store.get().follow;
  if (!f) return;
  const tour = store.get().tours.find((x) => x.id === f.tourId);
  if (!tour) return;
  const nextId = tour.poi_ids[f.nextIndex];
  if (nextId != null && entered.includes(nextId)) {
    const nextIndex = f.nextIndex + 1;
    store.set({ follow: { ...f, nextIndex } });
    if (nextIndex >= tour.poi_ids.length) notify(t('tour.completed', { name: tour.name }), 'info', 5000);
  }
}

/** Mọi bản ghi vị trí (GPS trước/nền hoặc mô phỏng) đi qua đây. */
export function handleFix(fix: LocationFix): void {
  const s = store.get();
  // Khi bật mô phỏng, vị trí GPS thật không được đưa vào geofence (tránh hai nguồn tranh nhau).
  if (s.settings.simulation && fix.source !== 'simulation') return;
  if (!s.settings.simulation && fix.source === 'simulation') return;

  store.set({ fix });
  sampleLocation(fix).catch(() => {});

  const res = geofence.update(fix);
  if (res.ignored) {
    store.set({ lastIgnoredAccuracy: fix.accuracy });
    return;
  }
  store.set({ inside: res.inside, distances: res.distances, lastIgnoredAccuracy: null, recentlyPlayed: gate.recentlyPlayed() });
  if (res.entered.length) advanceFollow(res.entered);
  if (res.trigger && store.get().settings.autoNarration) {
    playPoi(res.trigger.poiId, 'geofence').catch(() => {});
  }
}

/** Đổi nguồn vị trí (bật/tắt mô phỏng) → xoá trạng thái geofence để tính lại từ đầu. */
export function resetGeofence(): void {
  geofence.reset();
  store.set({ inside: [], distances: {}, fix: null });
}
