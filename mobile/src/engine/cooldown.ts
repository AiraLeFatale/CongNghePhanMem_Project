/**
 * Debounce/cooldown cho Narration engine (UC1 luồng A1).
 * Kích hoạt tự động (geofence) bị loại nếu:
 *  - đang phát một bài thuyết minh khác ("busy"), hoặc
 *  - cùng POI đã phát trong cửa sổ cooldown ("cooldown").
 * Người dùng chủ động (manual, qr) được ưu tiên: bỏ qua cooldown và dừng bài đang phát.
 */
import type { TriggerMethod } from '../types';

export type GateDecision =
  | { ok: true; interrupt: boolean }
  | { ok: false; reason: 'busy' | 'cooldown'; remainingMs?: number };

export class CooldownGate {
  private lastPlayed = new Map<number, number>();

  constructor(private cooldownMs: number = 10 * 60 * 1000) {}

  setCooldownMinutes(min: number): void {
    const m = Number.isFinite(min) && min >= 0 ? min : 10;
    this.cooldownMs = m * 60 * 1000;
  }

  getCooldownMs(): number {
    return this.cooldownMs;
  }

  check(poiId: number, method: TriggerMethod, isPlaying: boolean, now: number = Date.now()): GateDecision {
    if (method !== 'geofence') return { ok: true, interrupt: isPlaying };
    if (isPlaying) return { ok: false, reason: 'busy' };
    const last = this.lastPlayed.get(poiId);
    if (last != null && now - last < this.cooldownMs) {
      return { ok: false, reason: 'cooldown', remainingMs: this.cooldownMs - (now - last) };
    }
    return { ok: true, interrupt: false };
  }

  markPlayed(poiId: number, now: number = Date.now()): void {
    this.lastPlayed.set(poiId, now);
  }

  lastPlayedAt(poiId: number): number | undefined {
    return this.lastPlayed.get(poiId);
  }

  /** POI phát trong cooldown — UI tô màu "vừa nghe". */
  recentlyPlayed(now: number = Date.now()): number[] {
    return [...this.lastPlayed.entries()].filter(([, t]) => now - t < this.cooldownMs).map(([id]) => id);
  }

  clear(): void {
    this.lastPlayed.clear();
  }
}
