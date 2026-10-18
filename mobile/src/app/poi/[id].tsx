/** Chi tiết điểm thuyết minh: nội dung theo ngôn ngữ, nút nghe (trigger_method "manual"). */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, colors, SectionTitle, StateView } from '../../components/ui';
import { MiniPlayer } from '../../components/MiniPlayer';
import { formatDistance } from '../../engine/geo';
import { resolveTranslation } from '../../engine/language';
import { LANGUAGE_NAMES, useT } from '../../i18n';
import { playPoi, stopPlayback } from '../../services/pipeline';
import { setSimulatedLocation } from '../../services/simulation';
import { useAppStore } from '../../state/store';
import { LANGUAGES } from '../../types';

export default function PoiDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const poiId = Number(id);
  const { t } = useT();
  const poi = useAppStore((s) => s.pois.find((p) => p.id === poiId));
  const settingsLang = useAppStore((s) => s.settings.language);
  const simulation = useAppStore((s) => s.settings.simulation);
  const distance = useAppStore((s) => s.distances[poiId]);
  const playing = useAppStore((s) => s.nowPlaying?.poiId === poiId);
  const [lang, setLang] = useState<string>(settingsLang);
  const [busy, setBusy] = useState(false);

  if (!poi) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <StateView kind="empty" title={t('poi.notFound')} />
      </>
    );
  }

  const resolved = resolveTranslation(poi.translations, lang);
  const available = new Set(poi.translations.filter((x) => x.narration_text || x.audio_url).map((x) => x.language_code));
  const title = resolved?.translation.title?.trim() || poi.name;

  const onPlay = async () => {
    setBusy(true);
    try {
      await playPoi(poi, 'manual', lang);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {poi.address ? <Text style={styles.muted}>{poi.address}</Text> : null}
        <Text style={styles.muted}>
          {distance != null ? `${t('poi.distance', { dist: formatDistance(distance) })} · ` : ''}
          {t('poi.radius', { r: Math.round(poi.radius_m), p: poi.priority })}
        </Text>

        <SectionTitle>{t('poi.languages')}</SectionTitle>
        <View style={styles.chips}>
          {LANGUAGES.map((code) => (
            <Chip
              key={code}
              label={LANGUAGE_NAMES[code]}
              selected={lang === code}
              onPress={() => setLang(code)}
              accessibilityLabel={`${LANGUAGE_NAMES[code]}${available.has(code) ? '' : ' (—)'}`}
            />
          ))}
        </View>
        {resolved?.isFallback && (
          <Text style={styles.warn}>{t('poi.fallbackNote', { lang: LANGUAGE_NAMES[lang] ?? lang })}</Text>
        )}

        <View style={styles.actions}>
          {playing ? (
            <Button title={t('poi.stop')} variant="danger" onPress={stopPlayback} style={styles.flex} />
          ) : (
            <Button title={t('poi.play')} onPress={onPlay} loading={busy} disabled={!resolved} style={styles.flex} />
          )}
        </View>
        {simulation && (
          <Button
            title={t('poi.setSim')}
            variant="ghost"
            onPress={() => setSimulatedLocation({ latitude: poi.latitude, longitude: poi.longitude })}
            style={{ marginTop: 8 }}
          />
        )}

        {resolved && (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.badge}>{resolved.translation.audio_url ? t('poi.audio') : t('poi.tts')}</Text>
            <Text style={styles.body}>{resolved.translation.narration_text}</Text>
          </Card>
        )}
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  muted: { fontSize: 13, color: colors.muted, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: { color: colors.warn, marginTop: 8, fontSize: 13 },
  actions: { flexDirection: 'row', marginTop: 16 },
  badge: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 23, color: colors.text },
});
