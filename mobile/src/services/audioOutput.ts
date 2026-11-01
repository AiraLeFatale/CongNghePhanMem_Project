/** Adapter phát âm thanh cho Narration engine: expo-audio (file thu sẵn) và expo-speech (TTS trên máy). */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import type { AudioOutput, SpeechOutput } from '../engine/narration';

// Thời gian chờ tối đa để file âm thanh nạp xong trước khi báo lỗi.
const LOAD_TIMEOUT_MS = 10_000;

// Một player dùng chung cho mọi bản thu; callback kết thúc và timer nạp file đi kèm.
let player: AudioPlayer | null = null;
let endCb: ((error?: string) => void) | null = null;
let loadTimer: ReturnType<typeof setTimeout> | null = null;

/** Cấu hình phiên âm thanh: phát được ở chế độ im lặng và khi app chạy nền. */
export async function configureAudioSession(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    });
  } catch {
    /* Expo Go/simulator có thể không hỗ trợ một số tuỳ chọn — bỏ qua. */
  }
}

/** Tạo player dùng chung (lần đầu) và gắn listener theo dõi trạng thái phát. */
function ensurePlayer(): AudioPlayer {
  if (player) return player;
  player = createAudioPlayer(null, { updateInterval: 500 });
  player.addListener('playbackStatusUpdate', (status) => {
    // File đã nạp xong → huỷ timer timeout.
    if (status.isLoaded && loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }
    // Lỗi phát hoặc phát xong → báo cho Narration engine qua callback.
    if (status.error) end(status.error);
    else if (status.didJustFinish) end();
  });
  return player;
}

/** Kết thúc lượt phát hiện tại: dọn timer và gọi callback đúng một lần. */
function end(error?: string) {
  if (loadTimer) {
    clearTimeout(loadTimer);
    loadTimer = null;
  }
  const cb = endCb;
  endCb = null;
  cb?.(error);
}

/** Phát file âm thanh thu sẵn; onEnd được gọi khi xong, bị dừng hoặc lỗi. */
export const expoAudioOutput: AudioOutput = {
  play(uri, title, onEnd) {
    try {
      const p = ensurePlayer();
      endCb = onEnd;
      p.replace({ uri });
      try {
        // Hiển thị tên điểm tham quan trên màn hình khoá / trung tâm điều khiển.
        p.setActiveForLockScreen(true, { title, artist: 'Thuyết minh Quận 4' });
      } catch {
        /* không bắt buộc */
      }
      p.play();
      // Nếu file không nạp được trong 10 s → coi như lỗi để engine chuyển phương án.
      loadTimer = setTimeout(() => {
        if (!p.isLoaded) end('timeout');
      }, LOAD_TIMEOUT_MS);
    } catch (e: any) {
      onEnd(e?.message ?? 'audio error');
    }
  },
  stop() {
    endCb = null;
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = null;
    try {
      player?.pause();
      player?.setActiveForLockScreen(false);
    } catch {
      /* bỏ qua */
    }
  },
};

/** Đọc văn bản bằng TTS có sẵn trên thiết bị (dùng khi offline hoặc thiếu file thu). */
export const expoSpeechOutput: SpeechOutput = {
  speak(text, locale, onEnd) {
    let done = false;
    // Bảo đảm onEnd chỉ được gọi một lần dù TTS phát nhiều sự kiện.
    const once = (err?: string) => {
      if (done) return;
      done = true;
      onEnd(err);
    };
    Speech.speak(text, {
      language: locale,
      rate: 0.95,
      onDone: () => once(),
      onStopped: () => once(),
      onError: (e) => once(String((e as any)?.message ?? e)),
    });
  },
  stop() {
    Speech.stop().catch(() => {});
  },
};
