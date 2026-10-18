/** Danh sách tour từ dữ liệu đồng bộ. */
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, colors, StateView } from '../../components/ui';
import { useT } from '../../i18n';
import { runSync } from '../../services/bootstrap';
import { useAppStore } from '../../state/store';

export default function ToursScreen() {
  const { t } = useT();
  const tours = useAppStore((s) => s.tours);
  const syncing = useAppStore((s) => s.syncing);
  const follow = useAppStore((s) => s.follow);

  if (!tours.length) {
    if (syncing) return <StateView kind="loading" title={t('common.loading')} />;
    return <StateView kind="empty" title={t('tours.empty')} action={{ title: t('settings.syncNow'), onPress: () => runSync(true, true) }} />;
  }

  return (
    <FlatList
      data={tours}
      keyExtractor={(x) => String(x.id)}
      contentContainerStyle={{ padding: 14, gap: 10 }}
      refreshing={syncing}
      onRefresh={() => runSync(false, true)}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/tour/[id]', params: { id: String(item.id) } })}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${t('tours.stops', { n: item.poi_ids.length })}`}
        >
          <Card>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              {follow?.tourId === item.id && <Text style={styles.following}>{t('tour.following')}</Text>}
            </View>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <Text style={styles.meta}>{t('tours.stops', { n: item.poi_ids.length })}</Text>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  following: { fontSize: 11, fontWeight: '700', color: '#fff', backgroundColor: colors.poiNext, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  desc: { fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.primary, marginTop: 8, fontWeight: '600' },
});
