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
interface WebViewRef {
  injectJavaScript(js: string): void;
  reload(): void;
}
const WV = WebView as unknown as ComponentType<Record<string, unknown> & { ref?: Ref<WebViewRef> }>;

export interface MapPoi {
  id: number;
  lat: number;
  lng: number;
  r: number;
  color: string;
  label: string;
  strong: boolean;
}

export interface MapData {
  pois: MapPoi[];
  me: { lat: number; lng: number; acc: number | null; sim: boolean } | null;
  path: [number, number][];
  follow: boolean;
}

export interface LeafletMapHandle {
  centerOn(lat: number, lng: number): void;
}

interface Props {
  data: MapData;
  onTapMap?: (lat: number, lng: number) => void;
  onTapPoi?: (id: number) => void;
  accessibilityLabel?: string;
}

export const LeafletMap = forwardRef<LeafletMapHandle, Props>(function LeafletMap(
  { data, onTapMap, onTapPoi, accessibilityLabel },
  ref,
) {
  const webRef = useRef<WebViewRef>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => buildLeafletHtml(DEFAULT_REGION), []);

  const push = useCallback((d: MapData) => {
    webRef.current?.injectJavaScript(`window.__update && window.__update(${JSON.stringify(d)}); true;`);
  }, []);

  useEffect(() => {
    if (ready) push(data);
  }, [ready, data, push]);

  useImperativeHandle(ref, () => ({
    centerOn(lat, lng) {
      webRef.current?.injectJavaScript(`window.__center && window.__center(${lat}, ${lng}); true;`);
    },
  }));

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
