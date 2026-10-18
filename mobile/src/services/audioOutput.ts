/** Adapter phát âm thanh cho Narration engine: expo-audio (file thu sẵn) và expo-speech (TTS trên máy). */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import type { AudioOutput, SpeechOutput } from '../engine/narration';

const LOAD_TIMEOUT_MS = 10_000;

let player: AudioPlayer | null = null;
let endCb: ((error?: string) => void) | null = null;
let loadTimer: ReturnType<typeof setTimeout> | null = null;

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

function ensurePlayer(): AudioPlayer {
  if (player) return player;
  player = createAudioPlayer(null, { updateInterval: 500 });
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.isLoaded && loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }
    if (status.error) end(status.error);
    else if (status.didJustFinish) end();
  });
  return player;
}

function end(error?: string) {
  if (loadTimer) {
    clearTimeout(loadTimer);
    loadTimer = null;
  }
  const cb = endCb;
  endCb = null;
  cb?.(error);
}

export const expoAudioOutput: AudioOutput = {
  play(uri, title, onEnd) {
    try {
      const p = ensurePlayer();
      endCb = onEnd;
      p.replace({ uri });
      try {
        p.setActiveForLockScreen(true, { title, artist: 'Thuyết minh Quận 4' });
      } catch {
        /* không bắt buộc */
      }
      p.play();
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

export const expoSpeechOutput: SpeechOutput = {
  speak(text, locale, onEnd) {
    let done = false;
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
