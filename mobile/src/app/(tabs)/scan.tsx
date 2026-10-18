/** Quét QR tại trạm xe buýt (UC2) + ô nhập mã thủ công cho emulator không có camera. */
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card, Chip, colors, SectionTitle } from '../../components/ui';
import { displayTitle } from '../../engine/language';
import { LANGUAGE_NAMES, useT } from '../../i18n';
import { playPoi } from '../../services/pipeline';
import { QrResolution, resolveQr } from '../../services/qrResolver';
import { useAppStore } from '../../state/store';
import { LANGUAGES, Poi } from '../../types';

type ScanState =
  | { kind: 'scanning' }
  | { kind: 'resolving' }
  | { kind: 'ok'; poi: Poi; label: string | null; source: string }
  | { kind: 'error'; message: string };

export default function ScanScreen() {
  const { t } = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [state, setState] = useState<ScanState>({ kind: 'scanning' });
  const [manual, setManual] = useState('');
  const settingsLang = useAppStore((s) => s.settings.language);
  const [lang, setLang] = useState<string>(settingsLang);
  const nowPlayingId = useAppStore((s) => s.nowPlaying?.poiId ?? null);
  const lock = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const handle = useCallback(
    async (raw: string) => {
      if (lock.current) return;
      lock.current = true;
      setState({ kind: 'resolving' });
      let r: QrResolution;
      try {
        r = await resolveQr(raw);
      } catch (e: any) {
        r = { status: 'error', message: e?.message ?? String(e) };
      }
      if (r.status === 'ok') {
        setLang(settingsLang);
        setState({ kind: 'ok', poi: r.poi, label: r.label, source: r.source });
        playPoi(r.poi, 'qr', settingsLang).catch(() => {});
      } else {
        setState({
          kind: 'error',
          message: r.status === 'invalid' ? t('scan.invalid') : r.status === 'offline' ? t('scan.offline') : `${t('common.error')}: ${r.message}`,
        });
      }
    },
    [settingsLang, t],
  );

  const reset = () => {
    lock.current = false;
    setState({ kind: 'scanning' });
  };

  const showCamera = focused && state.kind === 'scanning' && permission?.granted && !cameraError;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          {t('scan.title')}
        </Text>

        {state.kind === 'scanning' && (
          <View style={styles.cameraBox}>
            {!permission ? (
              <Text style={styles.camMsg}>{t('common.loading')}</Text>
            ) : !permission.granted ? (
              <View style={styles.camCenter}>
                <Text style={styles.camTitle}>{t('scan.permTitle')}</Text>
                <Text style={styles.camMsg}>{t('scan.permBody')}</Text>
                <Button title={t('scan.grant')} onPress={requestPermission} style={{ marginTop: 12 }} />
              </View>
            ) : cameraError ? (
              <Text style={styles.camMsg}>{t('scan.noCamera')}</Text>
            ) : showCamera ? (
              <>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={(r) => handle(r.data)}
                  onMountError={() => setCameraError(true)}
                  accessibilityLabel={t('scan.hint')}
                />
                <View style={styles.frame} pointerEvents="none" />
                <Text style={styles.hint}>{t('scan.hint')}</Text>
              </>
            ) : null}
          </View>
        )}

        {state.kind === 'resolving' && (
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.camTitleDark}>{t('scan.resolving')}</Text>
          </Card>
        )}

        {state.kind === 'error' && (
          <Card style={{ marginTop: 12, borderColor: colors.danger }}>
            <Text style={styles.error} accessibilityRole="alert">
              {state.message}
            </Text>
            <Button title={t('scan.again')} onPress={reset} style={{ marginTop: 12 }} />
          </Card>
        )}

        {state.kind === 'ok' && (
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.small}>{t('scan.found', { label: state.label ?? '—' })}</Text>
            {state.source !== 'server' && state.source !== 'local' ? <Text style={styles.small}>{t('scan.fromCache')}</Text> : null}
            <Text style={styles.poiTitle}>{displayTitle(state.poi, lang)}</Text>
            <SectionTitle>{t('scan.chooseLang')}</SectionTitle>
            <View style={styles.chips}>
              {LANGUAGES.map((code) => (
                <Chip
                  key={code}
                  label={LANGUAGE_NAMES[code]}
                  selected={lang === code}
                  onPress={() => {
                    setLang(code);
                    playPoi(state.poi, 'qr', code).catch(() => {});
                  }}
                />
              ))}
            </View>
            <View style={styles.row}>
              <Button
                title={nowPlayingId === state.poi.id ? t('player.playing') : t('poi.play')}
                disabled={nowPlayingId === state.poi.id}
                onPress={() => playPoi(state.poi, 'qr', lang)}
                style={styles.flex}
              />
              <Button
                title="›"
                variant="secondary"
                onPress={() => router.push({ pathname: '/poi/[id]', params: { id: String(state.poi.id) } })}
                style={{ width: 52 }}
                accessibilityHint={displayTitle(state.poi, lang)}
              />
            </View>
            <Button title={t('scan.again')} variant="ghost" onPress={reset} style={{ marginTop: 8 }} />
          </Card>
        )}

        <SectionTitle>{t('scan.manual')}</SectionTitle>
        <View style={styles.row}>
          <TextInput
            value={manual}
            onChangeText={setManual}
            placeholder={t('scan.manualPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            accessibilityLabel={t('scan.manual')}
            returnKeyType="go"
            onSubmitEditing={() => manual.trim() && (reset(), handle(manual))}
          />
          <Button
            title={t('scan.submit')}
            disabled={!manual.trim() || state.kind === 'resolving'}
            onPress={() => {
              lock.current = false;
              handle(manual);
            }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
  cameraBox: {
    height: 320,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#10242c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camCenter: { padding: 20, alignItems: 'center' },
  camTitle: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  camTitleDark: { color: colors.text, fontSize: 15, fontWeight: '600' },
  camMsg: { color: '#cfe3ea', fontSize: 14, textAlign: 'center', marginTop: 6, paddingHorizontal: 16, lineHeight: 20 },
  frame: { width: 210, height: 210, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  hint: { position: 'absolute', bottom: 12, color: '#fff', fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
  error: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  small: { fontSize: 12, color: colors.muted },
  poiTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    color: colors.text,
  },
});
