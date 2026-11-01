/**
 * Debounce/cooldown cho Narration engine (UC1 luồng A1).
 * Kích hoạt tự động (geofence) bị loại nếu:
 *  - đang phát một bài thuyết minh khác ("busy"), hoặc
 *  - cùng POI đã phát trong cửa sổ cooldown ("cooldown").
 * Người dùng chủ động (manual, qr) được ưu tiên: bỏ qua cooldown và dừng bài đang phát.
 */
import type { TriggerMethod } from '../types';

/** Kết quả kiểm tra cổng: được phát (kèm cờ ngắt bài đang chạy) hoặc bị loại kèm lý do. */
export type GateDecision =
  | { ok: true; interrupt: boolean }
  | { ok: false; reason: 'busy' | 'cooldown'; remainingMs?: number };

/** Cổng chống phát lặp: nhớ thời điểm phát gần nhất của từng POI và so với cửa sổ cooldown. */
export class CooldownGate {
  private lastPlayed = new Map<number, number>();

  /** `cooldownMs` mặc định 10 phút. */
  constructor(private cooldownMs: number = 10 * 60 * 1000) {}

  /** Đặt lại cooldown theo phút; giá trị không hợp lệ hoặc âm quy về 10 phút. */
  setCooldownMinutes(min: number): void {
    const m = Number.isFinite(min) && min >= 0 ? min : 10;
    this.cooldownMs = m * 60 * 1000;
  }

  /** Cửa sổ cooldown hiện tại, đơn vị mili-giây. */
  getCooldownMs(): number {
    return this.cooldownMs;
  }

  /**
   * Quyết định có được phát POI hay không.
   * Manual/QR luôn được phát; geofence bị chặn khi đang phát bài khác hoặc còn trong cooldown.
   */
  check(poiId: number, method: TriggerMethod, isPlaying: boolean, now: number = Date.now()): GateDecision {
    if (method !== 'geofence') return { ok: true, interrupt: isPlaying };
    if (isPlaying) return { ok: false, reason: 'busy' };
    const last = this.lastPlayed.get(poiId);
    // Còn trong cửa sổ cooldown → trả thêm thời gian còn lại để UI hiển thị.
    if (last != null && now - last < this.cooldownMs) {
      return { ok: false, reason: 'cooldown', remainingMs: this.cooldownMs - (now - last) };
    }
    return { ok: true, interrupt: false };
  }

  /** Ghi nhận thời điểm phát của POI, dùng cho các lần kiểm tra cooldown sau. */
  markPlayed(poiId: number, now: number = Date.now()): void {
    this.lastPlayed.set(poiId, now);
  }

  /** Thời điểm phát gần nhất của POI (undefined nếu chưa từng phát). */
  lastPlayedAt(poiId: number): number | undefined {
    return this.lastPlayed.get(poiId);
  }

  /** POI phát trong cooldown — UI tô màu "vừa nghe". */
  recentlyPlayed(now: number = Date.now()): number[] {
    return [...this.lastPlayed.entries()].filter(([, t]) => now - t < this.cooldownMs).map(([id]) => id);
  }

  /** Xoá toàn bộ lịch sử cooldown (ví dụ khi đổi cài đặt hoặc reset phiên). */
  clear(): void {
    this.lastPlayed.clear();
  }
}
