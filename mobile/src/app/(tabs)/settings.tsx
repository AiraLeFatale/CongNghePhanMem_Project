/** Cài đặt: ngôn ngữ, thuyết minh tự động, cooldown, máy chủ, đồng bộ, audio offline, bộ nhớ đệm, quyền riêng tư, demo. */
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, colors, SectionTitle } from '../../components/ui';
import { defaultApiUrl, IS_EXPO_GO } from '../../config';
import { audioCacheStats, collectAudioUrls, deleteAllAudio, downloadAll } from '../../data/audioCache';
import { clearCache, qrLocalCount } from '../../data/db';
import { loadLocalContent } from '../../data/sync';
import { LANGUAGE_NAMES, useT } from '../../i18n';
import { SESSION_ID } from '../../services/analytics';
import { runSync, updateSettings } from '../../services/bootstrap';
import { refreshRegions, resetGeofence } from '../../services/pipeline';
import { notify, store, useAppStore } from '../../state/store';
import { LANGUAGES } from '../../types';

// Một dòng cài đặt dạng bật/tắt kèm nhãn và gợi ý.
function Row({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: colors.primary }} />
    </View>
  );
}

// Bộ điều chỉnh số (cooldown, tốc độ mô phỏng) với nút −/+ và giới hạn min/max.
function Stepper({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, styles.flex]}>{label}</Text>
      <Button title="−" variant="secondary" onPress={() => onChange(Math.max(min, value - step))} style={styles.step} accessibilityHint={label} />
      <Text style={styles.stepValue} accessibilityLabel={`${label}: ${value}`}>
        {value}
      </Text>
      <Button title="+" variant="secondary" onPress={() => onChange(Math.min(max, value + step))} style={styles.step} accessibilityHint={label} />
    </View>
  );
}

// Định dạng dung lượng byte sang KB/MB cho phần thống kê audio offline.
const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

// Màn hình Cài đặt: đọc/ghi store, đồng bộ dữ liệu, quản lý audio offline và các tùy chọn demo.
export default function SettingsScreen() {
  const { t, lang: uiLang } = useT();
  const settings = useAppStore((s) => s.settings);
  const apiBase = useAppStore((s) => s.apiBase);
  const version = useAppStore((s) => s.contentVersion);
  const lastSyncAt = useAppStore((s) => s.lastSyncAt);
  const syncing = useAppStore((s) => s.syncing);
  const online = useAppStore((s) => s.online);
  const pois = useAppStore((s) => s.pois);
  const tours = useAppStore((s) => s.tours);
  const pending = useAppStore((s) => s.pendingUploads);
  const bgStatus = useAppStore((s) => s.backgroundStatus);
  const [server, setServer] = useState(settings.serverUrl);
  const [dl, setDl] = useState<{ d: number; n: number } | null>(null);
  const [stats, setStats] = useState<{ files: number; bytes: number } | null>(null);
  const [qrCount, setQrCount] = useState(0);

  // Đọc lại dung lượng audio đã tải và số QR lưu cục bộ.
  const refreshStats = () => {
    audioCacheStats().then(setStats).catch(() => {});
    qrLocalCount().then(setQrCount).catch(() => {});
  };
  // Cập nhật thống kê mỗi khi nội dung đồng bộ có phiên bản mới.
  useEffect(refreshStats, [version]);

  // Danh sách URL audio của toàn bộ POI, dùng cho nút tải offline.
  const audioUrls = collectAudioUrls(pois);

  // Tải toàn bộ audio về máy, hiển thị tiến độ và báo số file lỗi (nếu có).
  const downloadAudio = async () => {
    setDl({ d: 0, n: audioUrls.length });
    const r = await downloadAll(audioUrls, apiBase, (d, n) => setDl({ d, n }));
    setDl(null);
    refreshStats();
    if (r.failed) notify(`${t('common.error')}: ${r.failed}/${audioUrls.length}`, 'warn');
  };

  // Xóa cache dữ liệu + audio sau khi người dùng xác nhận, rồi nạp lại nội dung cục bộ.
  const onClear = () =>
    Alert.alert(t('settings.clearCache'), t('settings.clearConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        style: 'destructive',
        onPress: async () => {
          await clearCache();
          await deleteAllAudio();
          await loadLocalContent();
          refreshRegions();
          resetGeofence();
          store.set({ follow: null });
          refreshStats();
          notify(t('settings.cleared'));
        },
      },
    ]);

  // Hiển thị thời điểm đồng bộ theo định dạng ngày giờ của ngôn ngữ giao diện.
  const lastSync = lastSyncAt ? new Date(lastSyncAt).toLocaleString(uiLang === 'vi' ? 'vi-VN' : 'en-GB') : t('common.never');

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionTitle>{t('settings.language')}</SectionTitle>
      <View style={styles.chips}>
        {LANGUAGES.map((code) => (
          <Chip key={code} label={LANGUAGE_NAMES[code]} selected={settings.language === code} onPress={() => updateSettings({ language: code })} />
        ))}
      </View>
      <Text style={styles.hint}>{t('settings.languageHint')}</Text>

      <SectionTitle>{t('settings.narration')}</SectionTitle>
      <Card style={styles.card}>
        <Row label={t('settings.auto')} value={settings.autoNarration} onChange={(v) => updateSettings({ autoNarration: v })} />
        <Stepper
          label={t('settings.cooldown')}
          value={settings.cooldownMinutes}
          min={0}
          max={120}
          onChange={(v) => updateSettings({ cooldownMinutes: v })}
        />
        <Row
          label={t('settings.background')}
          hint={
            IS_EXPO_GO
              ? t('settings.bgExpoGo')
              : bgStatus === 'denied'
                ? t('settings.bgDenied')
                : bgStatus === 'running'
                  ? t('settings.bgRunning')
                  : bgStatus === 'unsupported'
                    ? t('settings.bgExpoGo')
                    : undefined
          }
          value={settings.backgroundLocation}
          onChange={(v) => updateSettings({ backgroundLocation: v })}
        />
      </Card>

      {/* Chế độ demo: bật vị trí mô phỏng và tốc độ đi bộ giả lập. */}
      <SectionTitle>{t('settings.demo')}</SectionTitle>
      <Card style={styles.card}>
        <Row label={t('settings.sim')} hint={t('settings.simHint')} value={settings.simulation} onChange={(v) => updateSettings({ simulation: v })} />
        {settings.simulation && (
          <Stepper label={t('settings.simSpeed')} value={settings.simSpeed} min={1} max={30} onChange={(v) => updateSettings({ simSpeed: v })} />
        )}
      </Card>

      {/* Địa chỉ backend; để trống thì dùng địa chỉ mặc định do config.ts suy ra. */}
      <SectionTitle>{t('settings.server')}</SectionTitle>
      <Card style={styles.card}>
        <Text style={styles.label}>{t('settings.serverUrl')}</Text>
        <TextInput
          value={server}
          onChangeText={setServer}
          placeholder={defaultApiUrl()}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          accessibilityLabel={t('settings.serverUrl')}
        />
        <Text style={styles.hint}>{t('settings.serverHint', { url: defaultApiUrl() })}</Text>
        <View style={[styles.row, { gap: 8 }]}>
          <Button title={t('settings.save')} onPress={() => updateSettings({ serverUrl: server.trim() })} style={styles.flex} />
          <Button
            title={t('settings.reset')}
            variant="secondary"
            onPress={() => {
              setServer('');
              updateSettings({ serverUrl: '' });
            }}
            style={styles.flex}
          />
        </View>
        <Text style={styles.meta}>
          {apiBase} · {t('settings.online')}:{' '}
          {online === true ? t('settings.onlineYes') : online === false ? t('settings.onlineNo') : t('settings.onlineUnknown')}
        </Text>
      </Card>

      {/* Dữ liệu: phiên bản nội dung, số POI/tour, đồng bộ thủ công và audio offline. */}
      <SectionTitle>{t('settings.data')}</SectionTitle>
      <Card style={styles.card}>
        <Text style={styles.meta}>
          {t('settings.version')}: {version ?? '—'} · {t('settings.poiCount', { p: pois.length, t: tours.length })} · QR: {qrCount}
        </Text>
        <Text style={styles.meta}>
          {t('settings.lastSync')}: {lastSync}
        </Text>
        <Button title={t('settings.syncNow')} onPress={() => runSync(true, true)} loading={syncing} style={{ marginTop: 10 }} />
        {audioUrls.length ? (
          <>
            <Button
              title={dl ? t('settings.downloading', { d: dl.d, n: dl.n }) : t('settings.downloadAudio')}
              variant="secondary"
              onPress={downloadAudio}
              disabled={!!dl}
              style={{ marginTop: 8 }}
            />
            {stats && <Text style={styles.meta}>{t('settings.downloaded', { n: stats.files, size: fmtSize(stats.bytes) })}</Text>}
          </>
        ) : (
          <Text style={styles.hint}>{t('settings.noAudio')}</Text>
        )}
        <Button title={t('settings.clearCache')} variant="ghost" onPress={onClear} style={{ marginTop: 8 }} />
      </Card>

      {/* Quyền riêng tư: chia sẻ dữ liệu ẩn danh và số bản ghi đang chờ gửi. */}
      <SectionTitle>{t('settings.privacy')}</SectionTitle>
      <Card style={styles.card}>
        <Row label={t('settings.share')} value={settings.shareAnonymousData} onChange={(v) => updateSettings({ shareAnonymousData: v })} />
        <Text style={styles.hint}>{t('settings.privacyNote')}</Text>
        <Text style={styles.meta}>
          {t('settings.session')}: {SESSION_ID.slice(0, 8)}… · {t('settings.pending', { n: pending })}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 15, color: colors.text, fontWeight: '500' },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  meta: { fontSize: 12, color: colors.muted },
  step: { width: 44, minHeight: 38, paddingHorizontal: 0 },
  stepValue: { width: 34, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
  },
});
