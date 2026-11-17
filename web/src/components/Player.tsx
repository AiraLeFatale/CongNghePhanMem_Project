import { ArrowClockwise, ArrowCounterClockwise, Pause, Play } from '@phosphor-icons/react';
import { LANGS, useT } from '../lib/i18n';
import type { Translation } from '../lib/types';
import type { useNarration } from '../lib/useNarration';

function clock(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

const RATES = [0.75, 1, 1.25, 1.5];

/** Thanh phát cố định ở cuối màn hình, kiểu các ứng dụng audio guide. */
export function Player({ n, tr, title, inline = false }: { n: ReturnType<typeof useNarration>; tr: Translation | undefined; title: string; inline?: boolean }) {
  const t = useT();
  const langLabel = LANGS.find((l) => l.code === tr?.language_code)?.label;
  if (n.mode === 'none') {
    return (
      <div className="player player-empty" role="note">
        {t({ vi: 'Điểm này chưa có nội dung thuyết minh.', en: 'No narration for this place yet.' })}
      </div>
    );
  }
  const pct = n.duration ? (n.position / n.duration) * 100 : 0;
  return (
    <div className={`player${inline ? ' player-inline' : ''}`} role="region" aria-label={t({ vi: 'Trình phát thuyết minh', en: 'Narration player' })}>
      {n.mode === 'audio' && <audio ref={n.bindAudio} src={n.audioSrc} preload="metadata" {...n.audioEvents} />}
      <button type="button" className="play-btn" onClick={n.playing ? n.pause : n.play} aria-label={n.playing ? t({ vi: 'Tạm dừng', en: 'Pause' }) : t({ vi: 'Phát', en: 'Play' })}>
        {n.playing ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" />}
      </button>
      <div className="player-main">
        <div className="player-title">
          <strong className="truncate">{title}</strong>
          <span className="player-meta">
            {langLabel}
            {n.mode === 'speech' && ` · ${t({ vi: 'giọng đọc máy', en: 'device voice' })}`}
          </span>
        </div>
        {n.mode === 'audio' ? (
          <div className="player-track">
            <span className="time">{clock(n.position)}</span>
            <input
              type="range"
              min={0}
              max={n.duration || 0}
              step={0.1}
              value={n.position}
              onChange={(e) => n.seekTo(Number(e.target.value))}
              style={{ ['--pct' as string]: `${pct}%` }}
              aria-label={t({ vi: 'Vị trí phát', en: 'Seek' })}
            />
            <span className="time">{clock(n.duration)}</span>
          </div>
        ) : (
          <p className="player-hint">
            {n.playing ? t({ vi: 'Đang đọc nội dung…', en: 'Reading aloud…' }) : t({ vi: 'Bấm phát để nghe bằng giọng đọc của điện thoại.', en: 'Tap play to hear it in your device voice.' })}
          </p>
        )}
        {n.error && <p className="player-error">{n.error}</p>}
      </div>
      {n.mode === 'audio' && (
        <div className="player-tools">
          <button type="button" className="icon-btn" onClick={() => n.seekBy(-15)} aria-label={t({ vi: 'Lùi 15 giây', en: 'Back 15 seconds' })}>
            <ArrowCounterClockwise size={20} />
          </button>
          <button type="button" className="icon-btn" onClick={() => n.seekBy(15)} aria-label={t({ vi: 'Tới 15 giây', en: 'Forward 15 seconds' })}>
            <ArrowClockwise size={20} />
          </button>
          <button type="button" className="rate-btn" onClick={() => n.setRate(RATES[(RATES.indexOf(n.rate) + 1) % RATES.length])} aria-label={t({ vi: 'Tốc độ phát', en: 'Playback speed' })}>
            {n.rate}×
          </button>
        </div>
      )}
    </div>
  );
}
