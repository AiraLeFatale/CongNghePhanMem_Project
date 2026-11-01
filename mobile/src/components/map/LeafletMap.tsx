/**
 * Bản đồ dùng WebView + Leaflet (chạy được trong Expo Go trên cả Android và iOS, không cần API key Google Maps).
 * Leaflet được nhúng sẵn; khi offline chỉ thiếu ảnh nền, vòng POI và vị trí vẫn hiển thị.
 */
import { ComponentType, forwardRef, Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { DEFAULT_REGION } from '../../config';
import { buildLeafletHtml } from './leafletHtml';

// react-native-webview 14 khai báo props là giao của iOS/Android/Windows; với @types/react 19.3 phép giao này
// thành `never` khi kiểm tra kiểu → ép kiểu tối thiểu những gì ta dùng (runtime không đổi).
// Cầu nối tối thiểu tới WebView: chỉ khai báo các phương thức mà component thực sự gọi.
interface WebViewRef {
  injectJavaScript(js: string): void;
  reload(): void;
}
// Ép kiểu WebView để tránh lỗi giao props của react-native-webview 14 với @types/react 19.
const WV = WebView as unknown as ComponentType<Record<string, unknown> & { ref?: Ref<WebViewRef> }>;

// Một vòng POI trên bản đồ: toạ độ, bán kính geofence, màu và nhãn hiển thị.
export interface MapPoi {
  id: number;
  lat: number;
  lng: number;
  r: number;
  color: string;
  label: string;
  strong: boolean;
}

// Toàn bộ dữ liệu bản đồ được đẩy xuống WebView trong một lần cập nhật.
export interface MapData {
  pois: MapPoi[];
  me: { lat: number; lng: number; acc: number | null; sim: boolean } | null;
  path: [number, number][];
  follow: boolean;
}

// API điều khiển bản đồ từ bên ngoài (ví dụ căn giữa theo vị trí hiện tại).
export interface LeafletMapHandle {
  centerOn(lat: number, lng: number): void;
}

interface Props {
  data: MapData;
  onTapMap?: (lat: number, lng: number) => void;
  onTapPoi?: (id: number) => void;
  accessibilityLabel?: string;
}

// Component bản đồ: dựng HTML một lần, sau đó inject dữ liệu mỗi khi props thay đổi.
export const LeafletMap = forwardRef<LeafletMapHandle, Props>(function LeafletMap(
  { data, onTapMap, onTapPoi, accessibilityLabel },
  ref,
) {
  const webRef = useRef<WebViewRef>(null);
  const [ready, setReady] = useState(false);
  // HTML (kèm Leaflet nhúng sẵn) chỉ cần tạo một lần vì tâm bản đồ mặc định không đổi.
  const html = useMemo(() => buildLeafletHtml(DEFAULT_REGION), []);

  // Gọi hàm __update trong WebView để vẽ lại POI, đường đi và vị trí người dùng.
  const push = useCallback((d: MapData) => {
    webRef.current?.injectJavaScript(`window.__update && window.__update(${JSON.stringify(d)}); true;`);
  }, []);

  // Chỉ đẩy dữ liệu sau khi trang HTML báo sẵn sàng, tránh gọi hàm chưa tồn tại.
  useEffect(() => {
    if (ready) push(data);
  }, [ready, data, push]);

  // Expose hàm centerOn cho component cha qua ref.
  useImperativeHandle(ref, () => ({
    centerOn(lat, lng) {
      webRef.current?.injectJavaScript(`window.__center && window.__center(${lat}, ${lng}); true;`);
    },
  }));

  // Nhận thông điệp JSON từ trang HTML: ready, chạm bản đồ hoặc chạm POI.
  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'ready') setReady(true);
      else if (m.type === 'tapMap') onTapMap?.(m.latitude, m.longitude);
      else if (m.type === 'tapPoi') onTapPoi?.(Number(m.id));
    } catch {
      /* bỏ qua */
    }
  };

  return (
    <View style={styles.wrap} accessibilityLabel={accessibilityLabel}>
      {/* baseUrl https giả lập giúp WebView xử lý tài nguyên nội bộ ổn định trên Android. */}
      <WV
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost/' }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={styles.web}
        onContentProcessDidTerminate={() => {
          // iOS có thể hủy tiến trình WebView khi thiếu bộ nhớ → nạp lại trang và chờ ready.
          setReady(false);
          webRef.current?.reload();
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#e8eef2' },
});
