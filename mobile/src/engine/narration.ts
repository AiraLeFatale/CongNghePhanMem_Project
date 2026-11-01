/**
 * Narration engine (UC1 bước 7–8, UC2 bước 5–6).
 *  - Cổng debounce/cooldown (CooldownGate): kích hoạt geofence bị loại nếu đang phát hoặc POI vừa phát.
 *  - Chọn bản dịch theo ngôn ngữ, fallback tiếng Việt.
 *  - Ưu tiên audio thu sẵn (file đã tải trên máy → URL máy chủ khi online), không có thì TTS trên máy.
 *  - Audio lỗi → tự chuyển sang TTS. Kết thúc/dừng → ghi log lượt nghe (listen_seconds).
 * Phần phát âm thanh được tiêm qua adapter để kiểm thử không cần thiết bị.
 */
import { CooldownGate } from './cooldown';
import { resolveTranslation, TTS_LOCALE } from './language';
import type { Poi, TriggerMethod, UsageLog } from '../types';

/** Adapter phát audio thu sẵn (được tiêm vào để dễ kiểm thử/thay nền tảng). */
export interface AudioOutput {
  /** Phát URI; gọi onEnd() khi hết bài, onEnd(err) khi lỗi. */
  play(uri: string, title: string, onEnd: (error?: string) => void): void;
  stop(): void;
}

/** Adapter đọc văn bản bằng giọng máy (TTS) khi không có audio thu sẵn. */
export interface SpeechOutput {
  speak(text: string, locale: string, onEnd: (error?: string) => void): void;
  stop(): void;
}

/** Thông tin bài đang phát — UI dùng để vẽ mini player. */
export interface NowPlayingInfo {
  poiId: number;
  title: string;
  language: string;
  isFallback: boolean;
  method: TriggerMethod;
  kind: 'audio' | 'tts';
  startedAt: number;
}

/** Các phụ thuộc bên ngoài của engine: phát âm thanh, tra file audio, mạng và ghi log. */
export interface NarrationDeps {
  audio: AudioOutput;
  speech: SpeechOutput;
  gate: CooldownGate;
  getLocalAudio: (url: string) => Promise<string | null>;
  resolveUrl: (url: string) => string | null;
  isOnline: () => boolean;
  log: (entry: Omit<UsageLog, 'session_id'>) => void;
  onChange: (np: NowPlayingInfo | null) => void;
  now?: () => number;
}

/** Kết quả một yêu cầu phát: đang phát, bị loại (bận/cooldown) hoặc không có nội dung. */
export type PlayResult =
  | { status: 'playing'; kind: 'audio' | 'tts'; language: string; isFallback: boolean }
  | { status: 'discarded'; reason: 'busy' | 'cooldown'; remainingMs?: number }
  | { status: 'no-content' };

// Trạng thái nội bộ của bài đang phát; `token` giúp bỏ qua callback của bài đã bị thay thế.
interface Current extends NowPlayingInfo {
  token: number;
  text: string | null;
}

/** Điều phối việc chọn bản dịch, phát audio/TTS và ghi log lượt nghe. */
export class NarrationEngine {
  private current: Current | null = null;
  private starting = false;
  private seq = 0;
  private now: () => number;

  /** `now` có thể được tiêm để kiểm thử thời gian. */
  constructor(private deps: NarrationDeps) {
    this.now = deps.now ?? Date.now;
  }

  /** true khi đang có bài phát hoặc đang chuẩn bị phát (tránh hai lệnh chồng nhau). */
  get isPlaying(): boolean {
    return this.current != null || this.starting;
  }

  /** Thông tin bài đang phát (đã bỏ các trường nội bộ), null nếu im lặng. */
  get nowPlaying(): NowPlayingInfo | null {
    if (!this.current) return null;
    const { token: _t, text: _x, ...info } = this.current;
    return info;
  }

  /**
   * Phát thuyết minh cho một POI.
   * `method` quyết định chính sách cooldown (geofence bị chặn, manual/qr được ưu tiên).
   */
  async play(poi: Poi, method: TriggerMethod, language: string): Promise<PlayResult> {
    const decision = this.deps.gate.check(poi.id, method, this.isPlaying, this.now());
    if (!decision.ok) return { status: 'discarded', reason: decision.reason, remainingMs: decision.remainingMs };

    const resolved = resolveTranslation(poi.translations, language);
    if (!resolved) return { status: 'no-content' };
    // Lệnh thủ công/QR chen ngang: dừng bài đang phát trước khi bắt đầu bài mới.
    if (decision.interrupt) this.stop();

    this.starting = true;
    const token = ++this.seq;
    try {
      const t = resolved.translation;
      const title = t.title?.trim() || poi.name;
      let source: string | null = null;
      // Ưu tiên file đã tải trên máy; chưa có và đang online thì dùng URL máy chủ.
      if (t.audio_url) {
        source = await this.deps.getLocalAudio(t.audio_url).catch(() => null);
        if (!source && this.deps.isOnline()) source = this.deps.resolveUrl(t.audio_url);
      }
      // Một lệnh phát khác đã chen vào trong lúc chờ.
      if (token !== this.seq) return { status: 'discarded', reason: 'busy' };

      const text = t.narration_text?.trim() || null;
      const kind: 'audio' | 'tts' = source ? 'audio' : 'tts';
      if (kind === 'tts' && !text) return { status: 'no-content' };

      this.deps.gate.markPlayed(poi.id, this.now());
      this.current = {
        token,
        poiId: poi.id,
        title,
        language: resolved.language,
        isFallback: resolved.isFallback,
        method,
        kind,
        startedAt: this.now(),
        text,
      };
      this.deps.onChange(this.nowPlaying);

      if (kind === 'audio' && source) {
        this.deps.audio.play(source, title, (err) => {
          // Audio lỗi nhưng còn chữ → fallback sang TTS thay vì im lặng.
          if (err && text && this.current?.token === token) this.switchToTts(token);
          else this.finish(token);
        });
      } else if (text) {
        this.speak(token, text, resolved.language);
      }
      return { status: 'playing', kind, language: resolved.language, isFallback: resolved.isFallback };
    } finally {
      this.starting = false;
    }
  }

  /** Đọc bằng TTS với locale hệ điều hành tương ứng mã ngôn ngữ. */
  private speak(token: number, text: string, language: string) {
    this.deps.speech.speak(text, TTS_LOCALE[language] ?? language, () => this.finish(token));
  }

  /** Chuyển bài đang phát từ audio sang TTS khi file audio hỏng/không phát được. */
  private switchToTts(token: number) {
    const c = this.current;
    if (!c || c.token !== token || !c.text) return this.finish(token);
    this.current = { ...c, kind: 'tts' };
    this.deps.onChange(this.nowPlaying);
    this.speak(token, c.text, c.language);
  }

  /** Dừng bài đang phát (nút Dừng trên mini player, hoặc bị lệnh thủ công/QR chen ngang). */
  stop(): void {
    const c = this.current;
    if (!c) return;
    if (c.kind === 'audio') this.deps.audio.stop();
    else this.deps.speech.stop();
    this.finish(c.token);
  }

  /** Kết thúc lượt nghe: ghi log thời lượng và xoá trạng thái now-playing; bỏ qua nếu token cũ. */
  private finish(token: number) {
    const c = this.current;
    if (!c || c.token !== token) return;
    this.current = null;
    const seconds = Math.max(0, Math.round((this.now() - c.startedAt) / 1000));
    this.deps.log({
      poi_id: c.poiId,
      trigger_method: c.method,
      language_code: c.language,
      played_at: new Date(c.startedAt).toISOString(),
      listen_seconds: seconds,
    });
    this.deps.onChange(null);
  }
}
