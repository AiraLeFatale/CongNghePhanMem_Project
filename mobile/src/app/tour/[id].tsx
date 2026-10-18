/** Chi tiết tour: các điểm theo thứ tự, chế độ đi theo tour, mô phỏng đi bộ theo tour. */
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Button, Card, colors, StateView } from '../../components/ui';
import { MiniPlayer } from '../../components/MiniPlayer';
import { formatDistance } from '../../engine/geo';
import { displayTitle } from '../../engine/language';
import { useT } from '../../i18n';
import { startTourWalk, stopTourWalk } from '../../services/simulation';
import { store, useAppStore } from '../../state/store';

export default function TourDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tourId = Number(id);
  const { t } = useT();
  const tour = useAppStore((s) => s.tours.find((x) => x.id === tourId));
  const pois = useAppStore((s) => s.pois);
  const lang = useAppStore((s) => s.settings.language);
  const follow = useAppStore((s) => s.follow);
  const distances = useAppStore((s) => s.distances);
  const simulation = useAppStore((s) => s.settings.simulation);
  const walking = useAppStore((s) => s.simWalkingTourId);

  if (!tour) return <StateView kind="empty" title={t('tour.notFound')} />;
  const stops = tour.poi_ids.map((pid) => pois.find((p) => p.id === pid)).filter((p): p is NonNullable<typeof p> => !!p);
  const following = follow?.tourId === tour.id;
  const nextIndex = following ? follow!.nextIndex : -1;

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: tour.name }} />
      <FlatList
        data={stops}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.title} accessibilityRole="header">
              {tour.name}
            </Text>
            {tour.description ? <Text style={styles.desc}>{tour.description}</Text> : null}
            <View style={styles.actions}>
              {following ? (
                <Button
                  title={t('tour.unfollow')}
                  variant="secondary"
                  onPress={() => {
                    stopTourWalk();
                    store.set({ follow: null });
                  }}
                  style={styles.flex}
                />
              ) : (
                <Button
                  title={t('tour.follow')}
                  onPress={() => {
                    store.set({ follow: { tourId: tour.id, nextIndex: 0 } });
                    router.navigate('/');
                  }}
                  style={styles.flex}
                />
              )}
            </View>
            {following && nextIndex < stops.length && (
              <Button
                title={t('tour.skip')}
                variant="ghost"
                onPress={() => store.set({ follow: { tourId: tour.id, nextIndex: nextIndex + 1 } })}
                style={{ marginTop: 8 }}
              />
            )}
            {simulation ? (
              <Button
                title={walking === tour.id ? t('map.stopWalk') : t('tour.simWalk')}
                variant="ghost"
                onPress={() => {
                  if (walking === tour.id) stopTourWalk();
                  else if (startTourWalk(tour.id)) router.navigate('/');
                }}
                style={{ marginTop: 8 }}
              />
            ) : (
              <Text style={styles.hint}>{t('tour.simNeedsMode')}</Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const isNext = index === nextIndex;
          const done = following && index < nextIndex;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/poi/[id]', params: { id: String(item.id) } })}
              accessibilityRole="button"
              accessibilityLabel={`${index + 1}. ${displayTitle(item, lang)}${isNext ? `, ${t('map.legend.next')}` : ''}${done ? `, ${t('tour.done')}` : ''}`}
            >
              <Card style={[styles.stop, isNext && styles.stopNext]}>
                <View style={[styles.num, isNext && { backgroundColor: colors.poiNext }, done && { backgroundColor: colors.poiPlayed }]}>
                  <Text style={styles.numText}>{done ? '✓' : index + 1}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.stopTitle}>{displayTitle(item, lang)}</Text>
                  <Text style={styles.stopMeta}>
                    {item.address ?? ''}
                    {distances[item.id] != null ? ` · ${formatDistance(distances[item.id])}` : ''}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  desc: { fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 },
  actions: { flexDirection: 'row', marginTop: 14 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 8 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stopNext: { borderColor: colors.poiNext, borderWidth: 2 },
  num: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.poiIdle, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontWeight: '700' },
  stopTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  stopMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
