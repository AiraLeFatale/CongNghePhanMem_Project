import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootstrap } from '../services/bootstrap';
import { useAppStore } from '../state/store';
import { useT } from '../i18n';
import { colors, StateView } from '../components/ui';
import { NoticeBanner } from '../components/NoticeBanner';

export default function RootLayout() {
  const ready = useAppStore((s) => s.ready);
  const initError = useAppStore((s) => s.initError);
  const { t } = useT();

  useEffect(() => {
    bootstrap();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        {!ready ? (
          <StateView kind="loading" title={t('common.loading')} />
        ) : initError ? (
          <StateView kind="error" title={t('common.error')} message={t('init.error', { msg: initError })} />
        ) : (
          <Stack screenOptions={{ headerTintColor: colors.primary, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="poi/[id]" options={{ title: '' }} />
            <Stack.Screen name="tour/[id]" options={{ title: '' }} />
          </Stack>
        )}
        <NoticeBanner />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg } });
