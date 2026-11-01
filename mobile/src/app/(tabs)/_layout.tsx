/**
 * Layout của nhóm tab chính: thanh tab dưới cùng kèm MiniPlayer nổi bên trên,
 * khai báo 4 tab Bản đồ, Tour, Quét QR và Cài đặt.
 */
import { ColorValue, Text, View } from 'react-native';
import { BottomTabBar, Tabs } from 'expo-router/js-tabs';
import { MiniPlayer } from '../../components/MiniPlayer';
import { colors } from '../../components/ui';
import { useT } from '../../i18n';

// Tạo component icon tab từ một ký tự, nhận màu active/inactive do thanh tab truyền vào.
const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 20, lineHeight: 24 }}>{glyph}</Text>;
  };

// Dựng thanh tab tùy biến: MiniPlayer xếp trên BottomTabBar mặc định.
export default function TabsLayout() {
  const { t } = useT();
  return (
    <Tabs
      tabBar={(props) => (
        <View>
          {/* Trình phát thu nhỏ hiển thị xuyên suốt các tab khi có nội dung đang phát. */}
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      {/* Khai báo thứ tự tab và icon/nhãn đã bản địa hóa. */}
      <Tabs.Screen name="index" options={{ title: t('tab.map'), tabBarIcon: icon('◎'), tabBarAccessibilityLabel: t('tab.map') }} />
      <Tabs.Screen name="tours" options={{ title: t('tab.tours'), tabBarIcon: icon('☰'), tabBarAccessibilityLabel: t('tab.tours') }} />
      <Tabs.Screen name="scan" options={{ title: t('tab.scan'), tabBarIcon: icon('▣'), tabBarAccessibilityLabel: t('tab.scan') }} />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tab.settings'), tabBarIcon: icon('⚙'), tabBarAccessibilityLabel: t('tab.settings') }}
      />
    </Tabs>
  );
}
