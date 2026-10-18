import { CooldownGate } from '../engine/cooldown';
import { NarrationEngine, NarrationDeps } from '../engine/narration';
import { CAU_MONG, NHA_RONG } from './fixtures';

const MIN = 60_000;

describe('CooldownGate (UC1 A1)', () => {
  it('cho phát lần đầu, chặn cùng POI trong cửa sổ cooldown', () => {
    const g = new CooldownGate(10 * MIN);
    expect(g.check(1, 'geofence', false, 0)).toEqual({ ok: true, interrupt: false });
    g.markPlayed(1, 0);
    const d = g.check(1, 'geofence', false, 9 * MIN);
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.reason).toBe('cooldown');
      expect(d.remainingMs).toBe(MIN);
    }
    expect(g.check(1, 'geofence', false, 10 * MIN).ok).toBe(true);
  });

  it('POI khác không bị ảnh hưởng', () => {
    const g = new CooldownGate(10 * MIN);
    g.markPlayed(1, 0);
    expect(g.check(2, 'geofence', false, 1000).ok).toBe(true);
  });

  it('đang phát → geofence bị loại (busy)', () => {
    const g = new CooldownGate();
    expect(g.check(1, 'geofence', true)).toEqual({ ok: false, reason: 'busy' });
  });

  it('manual/qr bỏ qua cooldown và chen ngang bài đang phát', () => {
    const g = new CooldownGate(10 * MIN);
    g.markPlayed(1, 0);
    expect(g.check(1, 'manual', true, 1000)).toEqual({ ok: true, interrupt: true });
    expect(g.check(1, 'qr', false, 1000)).toEqual({ ok: true, interrupt: false });
  });

  it('cấu hình được số phút; giá trị lỗi về mặc định 10', () => {
    const g = new CooldownGate();
    g.setCooldownMinutes(2);
    g.markPlayed(1, 0);
    expect(g.check(1, 'geofence', false, 2 * MIN - 1).ok).toBe(false);
    expect(g.check(1, 'geofence', false, 2 * MIN).ok).toBe(true);
    g.setCooldownMinutes(Number.NaN);
    expect(g.getCooldownMs()).toBe(10 * MIN);
    g.setCooldownMinutes(0);
    expect(g.check(1, 'geofence', false, 2 * MIN).ok).toBe(true);
  });

  it('recentlyPlayed trả các POI còn trong cooldown', () => {
    const g = new CooldownGate(10 * MIN);
    g.markPlayed(1, 0);
    g.markPlayed(2, 5 * MIN);
    expect(g.recentlyPlayed(12 * MIN)).toEqual([2]);
  });
});

function makeEngine(overrides: Partial<NarrationDeps> = {}) {
  let clock = 1_000_000;
  const audioEnds: ((e?: string) => void)[] = [];
  const speechEnds: ((e?: string) => void)[] = [];
  const spoken: { text: string; locale: string }[] = [];
  const played: string[] = [];
  const logs: any[] = [];
  const deps: NarrationDeps = {
    audio: { play: (uri, _t, onEnd) => (played.push(uri), audioEnds.push(onEnd)), stop: jest.fn() },
    speech: { speak: (text, locale, onEnd) => (spoken.push({ text, locale }), speechEnds.push(onEnd)), stop: jest.fn() },
    gate: new CooldownGate(10 * MIN),
    getLocalAudio: async () => null,
    resolveUrl: (u) => `http://srv:4000${u}`,
    isOnline: () => true,
    log: (e) => logs.push(e),
    onChange: () => {},
    now: () => clock,
    ...overrides,
  };
  const engine = new NarrationEngine(deps);
  return { engine, deps, spoken, played, logs, audioEnds, speechEnds, tick: (ms: number) => (clock += ms) };
}

describe('NarrationEngine', () => {
  it('TTS tiếng Việt khi không có audio; ghi log với listen_seconds', async () => {
    const h = makeEngine();
    const r = await h.engine.play(NHA_RONG, 'geofence', 'vi');
    expect(r).toMatchObject({ status: 'playing', kind: 'tts', language: 'vi', isFallback: false });
    expect(h.spoken[0]).toEqual({ text: 'Bạn đang đến Bến Nhà Rồng.', locale: 'vi-VN' });
    h.tick(42_000);
    h.speechEnds[0]();
    expect(h.logs).toEqual([
      expect.objectContaining({ poi_id: 1, trigger_method: 'geofence', language_code: 'vi', listen_seconds: 42 }),
    ]);
    expect(h.engine.isPlaying).toBe(false);
  });

  it('ưu tiên audio thu sẵn, ghép URL tương đối với máy chủ', async () => {
    const h = makeEngine();
    const r = await h.engine.play(NHA_RONG, 'manual', 'en');
    expect(r).toMatchObject({ status: 'playing', kind: 'audio', language: 'en' });
    expect(h.played).toEqual(['http://srv:4000/uploads/en.mp3']);
  });

  it('ưu tiên file đã tải trên máy', async () => {
    const h = makeEngine({ getLocalAudio: async () => 'file:///audio/en.mp3' });
    await h.engine.play(NHA_RONG, 'manual', 'en');
    expect(h.played).toEqual(['file:///audio/en.mp3']);
  });

  it('offline và chưa tải audio → TTS của đúng ngôn ngữ', async () => {
    const h = makeEngine({ isOnline: () => false });
    const r = await h.engine.play(NHA_RONG, 'qr', 'en');
    expect(r).toMatchObject({ kind: 'tts', language: 'en' });
    expect(h.spoken[0].locale).toBe('en-US');
  });

  it('audio lỗi → chuyển sang TTS, vẫn ghi đúng một log', async () => {
    const h = makeEngine();
    await h.engine.play(NHA_RONG, 'manual', 'en');
    h.audioEnds[0]('network');
    expect(h.spoken).toHaveLength(1);
    expect(h.engine.nowPlaying?.kind).toBe('tts');
    h.speechEnds[0]();
    expect(h.logs).toHaveLength(1);
  });

  it('A1: geofence bị loại khi đang phát hoặc trong cooldown', async () => {
    const h = makeEngine();
    await h.engine.play(NHA_RONG, 'geofence', 'vi');
    expect(await h.engine.play(CAU_MONG, 'geofence', 'vi')).toEqual({ status: 'discarded', reason: 'busy', remainingMs: undefined });
    h.speechEnds[0]();
    h.tick(MIN);
    const again = await h.engine.play(NHA_RONG, 'geofence', 'vi');
    expect(again).toMatchObject({ status: 'discarded', reason: 'cooldown' });
    expect(h.spoken).toHaveLength(1);
  });

  it('thủ công chen ngang bài đang phát: dừng bài cũ, log bài cũ', async () => {
    const h = makeEngine();
    await h.engine.play(NHA_RONG, 'geofence', 'vi');
    h.tick(5_000);
    await h.engine.play(CAU_MONG, 'manual', 'vi');
    expect(h.deps.speech.stop).toHaveBeenCalled();
    expect(h.logs[0]).toMatchObject({ poi_id: 1, listen_seconds: 5 });
    expect(h.engine.nowPlaying?.poiId).toBe(5);
    // callback trễ của bài cũ không được kết thúc bài mới
    h.speechEnds[0]();
    expect(h.engine.nowPlaying?.poiId).toBe(5);
  });

  it('stop() dừng và ghi log', async () => {
    const h = makeEngine();
    await h.engine.play(NHA_RONG, 'manual', 'vi');
    h.tick(3_400);
    h.engine.stop();
    expect(h.logs[0].listen_seconds).toBe(3);
    expect(h.engine.isPlaying).toBe(false);
  });

  it('POI không có nội dung → no-content, không ghi cooldown', async () => {
    const h = makeEngine();
    const empty = { ...NHA_RONG, translations: [] };
    expect(await h.engine.play(empty, 'geofence', 'vi')).toEqual({ status: 'no-content' });
    expect(h.deps.gate.lastPlayedAt(1)).toBeUndefined();
  });
});
