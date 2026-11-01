/**
 * Layout gốc của ứng dụng: bọc vùng an toàn và thanh trạng thái, chạy bootstrap dữ liệu,
 * hiển thị màn hình chờ/lỗi khi khởi động và khai báo ngăn xếp điều hướng chung
 * (tabs chính, chi tiết POI, chi tiết tour).
 */
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

// Khởi tạo ứng dụng (nạp cấu hình, cache, đồng bộ) rồi dựng cây điều hướng chung.
export default function RootLayout() {
  const ready = useAppStore((s) => s.ready);
  const initError = useAppStore((s) => s.initError);
  const { t } = useT();

  useEffect(() => {
    // Chỉ chạy một lần khi app mở; bootstrap tự cập nhật store khi xong.
    bootstrap();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        {/* Chờ bootstrap xong mới dựng điều hướng để tránh màn hình thiếu dữ liệu. */}
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
        {/* Banner thông báo dùng chung, luôn nổi phía trên nội dung. */}
        <NoticeBanner />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg } });
