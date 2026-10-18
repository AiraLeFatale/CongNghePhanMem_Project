/** Thanh phát nhỏ: đang phát gì, ngôn ngữ, cách kích hoạt, thời gian, nút Dừng. */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '../state/store';
import { stopPlayback } from '../services/pipeline';
import { LANGUAGE_FLAGS, useT } from '../i18n';
import { colors } from './ui';

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MiniPlayer() {
  const np = useAppStore((s) => s.nowPlaying);
  const { t } = useT();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!np) return;
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [np]);

  if (!np) return null;
  const elapsed = Math.max(0, Math.round((Date.now() - np.startedAt) / 1000));
  return (
    <View style={styles.bar} accessibilityRole="summary" accessibilityLabel={`${t('player.playing')}: ${np.title}`}>
      <Pressable
        style={styles.info}
        onPress={() => router.push({ pathname: '/poi/[id]', params: { id: String(np.poiId) } })}
        accessibilityRole="button"
        accessibilityLabel={np.title}
      >
        <Text style={styles.label}>
          {t('player.playing')} · {LANGUAGE_FLAGS[np.language] ?? np.language}
          {np.isFallback ? '*' : ''} · {np.kind === 'audio' ? t('player.audio') : t('player.tts')} ·{' '}
          {t(`method.${np.method}` as const)}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {np.title}
        </Text>
      </Pressable>
      <Text style={styles.time}>{fmt(elapsed)}</Text>
      <Pressable
        onPress={stopPlayback}
        style={styles.stop}
        accessibilityRole="button"
        accessibilityLabel={t('player.stop')}
        hitSlop={8}
      >
        <View style={styles.square} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14323f',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  info: { flex: 1 },
  label: { color: '#9fc3cf', fontSize: 11, fontWeight: '600' },
  title: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  time: { color: '#cfe3ea', fontVariant: ['tabular-nums'], fontSize: 13 },
  stop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: { width: 14, height: 14, backgroundColor: '#fff', borderRadius: 2 },
});
