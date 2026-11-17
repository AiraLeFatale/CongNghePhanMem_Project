import { useCallback, useEffect, useRef, useState } from 'react';
import { logUsage, sessionId } from './api';
import { LANGS } from './i18n';
import type { Translation } from './types';
import { setLiveListening } from './useLive';

export type NarrationMode = 'audio' | 'speech' | 'none';

/**
 * Phát thuyết minh của một điểm: có file audio thì dùng <audio>, không có thì đọc bằng
 * giọng máy của trình duyệt (Web Speech API). Ghi lượt nghe ẩn danh khi dừng hoặc rời trang.
 */
export function useNarration(poiId: number | undefined, tr: Translation | undefined, trigger: 'qr' | 'manual') {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const listened = useRef(0);
  const tickFrom = useRef<number | null>(null);
  const startedAt = useRef<string | null>(null);

  const speechOk = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const mode: NarrationMode = tr?.audio_url ? 'audio' : tr?.narration_text && speechOk ? 'speech' : 'none';

  const liveOn = () => {
    if (poiId && tr) setLiveListening({ poi_id: poiId, language_code: tr.language_code, trigger_method: trigger });
  };
  const liveOff = () => setLiveListening(null);

  const startClock = () => {
    if (!startedAt.current) startedAt.current = new Date().toISOString();
    tickFrom.current = performance.now();
  };
  const stopClock = () => {
    if (tickFrom.current !== null) listened.current += (performance.now() - tickFrom.current) / 1000;
    tickFrom.current = null;
  };

  const flush = useCallback(() => {
    stopClock();
    const secs = Math.round(listened.current);
    if (poiId && tr && startedAt.current && secs > 0) {
      logUsage({ poi_id: poiId, session_id: sessionId(), trigger_method: trigger, language_code: tr.language_code, played_at: startedAt.current, listen_seconds: secs });
    }
    listened.current = 0;
    startedAt.current = null;
  }, [poiId, tr, trigger]);

  // Đổi điểm hoặc ngôn ngữ: dừng bài cũ, ghi lượt nghe, đặt lại trạng thái.
  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setDuration(0);
    setError(null);
    return () => {
      audioRef.current?.pause();
      if (speechOk) window.speechSynthesis.cancel();
      flush();
      setLiveListening(null);
    };
  }, [tr, flush, speechOk]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flush]);

  const bindAudio = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el;
  }, []);

  const audioEvents = {
    onPlay: () => {
      setPlaying(true);
      startClock();
      liveOn();
    },
    onPause: () => {
      setPlaying(false);
      stopClock();
      liveOff();
    },
    onEnded: () => {
      setPlaying(false);
      flush();
      liveOff();
    },
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) => setPosition(e.currentTarget.currentTime),
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) => setDuration(e.currentTarget.duration || 0),
    onError: () => setError('Không tải được file audio.'),
  };

  function speak() {
    if (!tr) return;
    const synth = window.speechSynthesis;
    if (synth.paused && synth.speaking) {
      synth.resume();
      setPlaying(true);
      startClock();
      liveOn();
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(tr.narration_text);
    const code = LANGS.find((l) => l.code === tr.language_code)?.speech ?? 'vi-VN';
    u.lang = code;
    const voice = synth.getVoices().find((v) => v.lang.replace('_', '-').startsWith(code.slice(0, 2)));
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onend = () => {
      setPlaying(false);
      flush();
      liveOff();
    };
    u.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') setError('Trình duyệt không đọc được nội dung này.');
      setPlaying(false);
      stopClock();
      liveOff();
    };
    synth.speak(u);
    setPlaying(true);
    startClock();
    liveOn();
  }

  const play = () => {
    setError(null);
    if (mode === 'audio') audioRef.current?.play().catch(() => setError('Trình duyệt chặn tự phát. Bấm nút phát để nghe.'));
    else if (mode === 'speech') speak();
  };
  const pause = () => {
    if (mode === 'audio') audioRef.current?.pause();
    else if (mode === 'speech') {
      window.speechSynthesis.pause();
      setPlaying(false);
      stopClock();
      liveOff();
    }
  };
  const seekBy = (delta: number) => {
    const a = audioRef.current;
    if (mode === 'audio' && a) a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
  };
  const seekTo = (t: number) => {
    const a = audioRef.current;
    if (mode === 'audio' && a) a.currentTime = t;
  };
  const setRate = (r: number) => {
    setRateState(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  };

  return { mode, playing, position, duration, rate, error, play, pause, seekBy, seekTo, setRate, bindAudio, audioEvents, audioSrc: tr?.audio_url ?? undefined };
}
