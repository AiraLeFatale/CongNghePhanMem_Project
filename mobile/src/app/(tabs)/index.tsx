/** Màn hình Bản đồ: vị trí người dùng, vòng POI tô màu theo trạng thái, mô phỏng vị trí, đi theo tour. */
import { useMemo, useRef } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LeafletMap, LeafletMapHandle, MapData } from '../../components/map/LeafletMap';
import { Button, Card, colors, StateView } from '../../components/ui';
import { displayTitle } from '../../engine/language';
import { formatDistance } from '../../engine/geo';
import { useT } from '../../i18n';
import { retryLocationPermission, runSync } from '../../services/bootstrap';
import { setSimulatedLocation, stopTourWalk } from '../../services/simulation';
import { useAppStore } from '../../state/store';

export default function MapScreen() {
  const { t } = useT();
  const mapRef = useRef<LeafletMapHandle>(null);
  const pois = useAppStore((s) => s.pois);
  const tours = useAppStore((s) => s.tours);
  const lang = useAppStore((s) => s.settings.language);
  const simulation = useAppStore((s) => s.settings.simulation);
  const autoNarration = useAppStore((s) => s.settings.autoNarration);
  const fix = useAppStore((s) => s.fix);
  const inside = useAppStore((s) => s.inside);
  const distances = useAppStore((s) => s.distances);
  const recentlyPlayed = useAppStore((s) => s.recentlyPlayed);
  const playingId = useAppStore((s) => s.nowPlaying?.poiId ?? null);
  const follow = useAppStore((s) => s.follow);
  const permission = useAppStore((s) => s.locationPermission);
  const online = useAppStore((s) => s.online);
  const syncing = useAppStore((s) => s.syncing);
  const syncError = useAppStore((s) => s.syncError);
  const apiBase = useAppStore((s) => s.apiBase);
  const weakAcc = useAppStore((s) => s.lastIgnoredAccuracy);
  const walking = useAppStore((s) => s.simWalkingTourId);

  const tour = follow ? tours.find((x) => x.id === follow.tourId) : undefined;
  const nextId = tour ? tour.poi_ids[follow!.nextIndex] : undefined;

  const data: MapData = useMemo(() => {
    const color = (id: number) =>
      id === playingId
        ? colors.poiPlaying
        : inside.includes(id)
          ? colors.poiInside
          : id === nextId
            ? colors.poiNext
            : recentlyPlayed.includes(id)
              ? colors.poiPlayed
              : colors.poiIdle;
    const path: [number, number][] = tour
      ? tour.poi_ids
          .map((id) => pois.find((p) => p.id === id))
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => [p.latitude, p.longitude])
      : [];
    return {
      pois: pois.map((p) => ({
        id: p.id,
        lat: p.latitude,
        lng: p.longitude,
        r: p.radius_m,
        color: color(p.id),
        label: displayTitle(p, lang),
        strong: p.id === playingId || inside.includes(p.id) || p.id === nextId,
      })),
      me: fix ? { lat: fix.latitude, lng: fix.longitude, acc: fix.accuracy, sim: fix.source === 'simulation' } : null,
      path,
      follow: true,
    };
  }, [pois, lang, fix, inside, recentlyPlayed, playingId, nextId, tour]);

  // Trạng thái rỗng (UC1 E2)
  if (!pois.length) {
    if (syncing) return <StateView kind="loading" title={t('map.syncing')} />;
    return (
      <StateView
        kind={online === false ? 'empty' : 'error'}
        title={t('map.noData')}
        message={online === false ? t('map.noDataOffline') : syncError ? t('map.noDataServer', { url: apiBase }) : undefined}
        action={{ title: t('common.retry'), onPress: () => runSync(true, true) }}
      />
    );
  }

  const insideBest = inside
    .map((id) => pois.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .sort((a, b) => b.priority - a.priority)[0];
  let nearest: { title: string; d: number } | null = null;
  for (const p of pois) {
    const d = distances[p.id];
    if (d != null && (!nearest || d < nearest.d)) nearest = { title: displayTitle(p, lang), d };
  }
  const nextPoi = nextId != null ? pois.find((p) => p.id === nextId) : undefined;

  let status: string;
  if (simulation) status = walking != null ? t('map.walking') : t('map.simOn');
  else if (weakAcc != null) status = t('map.weakGps', { acc: Math.round(weakAcc) });
  else if (!fix) status = t('map.waitingGps');
  else if (insideBest) status = t('map.inside', { title: displayTitle(insideBest, lang) });
  else if (nearest) status = t('map.nearest', { title: nearest.title, dist: formatDistance(nearest.d) });
  else status = '';

  const showPermission = !simulation && (permission === 'denied' || permission === 'unavailable');

  return (
    <View style={styles.flex}>
      <LeafletMap
        ref={mapRef}
        data={data}
        accessibilityLabel={t('tab.map')}
        onTapPoi={(id) => router.push({ pathname: '/poi/[id]', params: { id: String(id) } })}
        onTapMap={(lat, lng) => {
          if (simulation && walking == null) setSimulatedLocation({ latitude: lat, longitude: lng });
        }}
      />

      <View style={styles.top} pointerEvents="box-none">
        <Card style={styles.statusCard}>
          <View style={styles.row}>
            <Text style={styles.status} numberOfLines={2} accessibilityLiveRegion="polite">
              {status}
            </Text>
            {online === false && <Text style={styles.offline}>{t('map.offlineBadge')}</Text>}
          </View>
          {!autoNarration && <Text style={styles.sub}>{t('map.autoOff')}</Text>}
          {tour && (
            <Text style={styles.next}>
              {nextPoi
                ? distances[nextPoi.id] != null
                  ? t('tour.nextDist', { title: displayTitle(nextPoi, lang), dist: formatDistance(distances[nextPoi.id]) })
                  : t('tour.next', { title: displayTitle(nextPoi, lang) })
                : `${tour.name} · ${t('tour.done')}`}
            </Text>
          )}
          {walking != null && (
            <Button title={t('map.stopWalk')} variant="secondary" onPress={stopTourWalk} style={{ marginTop: 8 }} />
          )}
        </Card>
      </View>

      <View style={styles.legend} pointerEvents="none">
        {(
          [
            ['poiIdle', 'map.legend.idle'],
            ['poiInside', 'map.legend.inside'],
            ['poiPlaying', 'map.legend.playing'],
            ['poiPlayed', 'map.legend.played'],
            ['poiNext', 'map.legend.next'],
          ] as const
        ).map(([c, k]) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors[c] }]} />
            <Text style={styles.legendText}>{t(k)}</Text>
          </View>
        ))}
      </View>

      {showPermission && (
        <View style={styles.permWrap}>
          <Card>
            <Text style={styles.permTitle} accessibilityRole="header">
              {t('perm.title')}
            </Text>
            <Text style={styles.permBody}>{permission === 'unavailable' ? t('perm.unavailable') : t('perm.body')}</Text>
            <View style={[styles.row, { gap: 8, marginTop: 12 }]}>
              <Button title={t('perm.openSettings')} onPress={() => Linking.openSettings()} style={styles.flex} />
              <Button title={t('common.retry')} variant="secondary" onPress={retryLocationPermission} style={styles.flex} />
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { position: 'absolute', top: 8, left: 10, right: 10 },
  statusCard: { paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center' },
  status: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.warn, marginTop: 4 },
  next: { fontSize: 13, color: colors.poiNext, marginTop: 6, fontWeight: '600' },
  offline: {
    backgroundColor: colors.warn,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 8,
  },
  legend: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    padding: 8,
    gap: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.text },
  permWrap: { position: 'absolute', left: 12, right: 12, bottom: 16 },
  permTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  permBody: { fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 },
});
