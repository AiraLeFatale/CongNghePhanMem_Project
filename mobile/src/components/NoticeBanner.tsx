/** Thông báo ngắn (toast) hiển thị trên cùng màn hình. */
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { store, useAppStore } from '../state/store';
import { colors } from './ui';

export function NoticeBanner() {
  const n = useAppStore((s) => s.notice);
  const insets = useSafeAreaInsets();
  if (!n) return null;
  const bg = n.kind === 'error' ? colors.danger : n.kind === 'warn' ? colors.warn : '#263f4a';
  return (
    <Pressable
      onPress={() => store.set({ notice: null })}
      style={[styles.box, { backgroundColor: bg, top: insets.top + 8 }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{n.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    zIndex: 50,
    elevation: 6,
  },
  text: { color: '#fff', fontSize: 14, lineHeight: 19 },
});
