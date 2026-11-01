/**
 * Các component bản đồ Leaflet: chọn toạ độ POI, xem lộ trình tour và bản đồ nhiệt thống kê.
 * Dùng tile OpenStreetMap nên không cần khoá API.
 */
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';

/** Trung tâm Quận 4, TP.HCM */
export const DISTRICT4_CENTER: [number, number] = [10.7605, 106.7045];
const ACCENT = '#0f766e';

/** Lớp tile nền OpenStreetMap dùng chung cho mọi bản đồ. */
export function OsmTiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  );
}

// Icon ghim mặc định cho điểm thuyết minh (chấm tròn, neo ở đáy).
export const pinIcon = L.divIcon({
  className: 'map-pin',
  html: '<span class="map-pin-dot"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

/** Icon đánh số thứ tự cho các điểm dừng của tour. */
export function numberIcon(n: number) {
  return L.divIcon({
    className: 'map-num',
    html: `<span>${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/** Lắng nghe sự kiện click trên bản đồ để lấy toạ độ người dùng chọn. */
function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Khi toạ độ đổi từ ô nhập tay, đưa điểm vào giữa nếu đang nằm ngoài khung nhìn. */
function KeepInView({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!pos) return;
    // Chỉ căn lại khi điểm nằm ngoài khung nhìn (bỏ lề 10%) để tránh bản đồ nhảy liên tục.
    if (!map.getBounds().pad(-0.1).contains(pos)) map.setView(pos, Math.max(map.getZoom(), 15));
  }, [map, pos]);
  return null;
}

// Thông tin tối thiểu của POI khác để vẽ vòng bán kính tham chiếu.
export interface OtherPoi {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
}

/** Làm tròn toạ độ về 6 chữ số thập phân (sai số khoảng 0,1 m). */
export function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

/** Bản đồ cho phép chọn vị trí POI bằng cách click hoặc kéo ghim. */
export function MapPicker({
  lat,
  lng,
  radius,
  onChange,
  others = [],
}: {
  lat: number | null;
  lng: number | null;
  radius: number | null;
  onChange: (lat: number, lng: number) => void;
  others?: OtherPoi[];
}) {
  const pos = useMemo<[number, number] | null>(() => (lat !== null && lng !== null ? [lat, lng] : null), [lat, lng]);
  const initial = useRef(pos ?? DISTRICT4_CENTER);
  const markerRef = useRef<L.Marker>(null);
  // Chuẩn hoá toạ độ trước khi đưa lên form để tránh số thập phân quá dài.
  const pick = (a: number, b: number) => onChange(round6(a), round6(b));

  return (
    <MapContainer center={initial.current} zoom={pos ? 16 : 15} className="map map-picker" scrollWheelZoom>
      <OsmTiles />
      <ClickToPick onPick={pick} />
      <KeepInView pos={pos} />
      {others.map((o) => (
        <Circle
          key={o.id}
          center={[o.latitude, o.longitude]}
          radius={o.radius_m}
          pathOptions={{ color: '#64748b', weight: 1, fillOpacity: 0.08, dashArray: '4 4' }}
        >
          <Tooltip>{o.name}</Tooltip>
        </Circle>
      ))}
      {pos && (
        <>
          {radius !== null && radius > 0 && radius <= 5000 && (
            <Circle center={pos} radius={radius} pathOptions={{ color: ACCENT, weight: 2, fillOpacity: 0.15 }} />
          )}
          <Marker
            position={pos}
            icon={pinIcon}
            draggable
            ref={markerRef}
            title="Kéo để đổi vị trí"
            eventHandlers={{
              dragend() {
                const m = markerRef.current;
                if (m) {
                  const p = m.getLatLng();
                  pick(p.lat, p.lng);
                }
              },
            }}
          />
        </>
      )}
    </MapContainer>
  );
}

/** Tự thu phóng bản đồ vừa với toàn bộ điểm; một điểm thì đặt mức zoom 16. */
function FitBounds({ points, padding = 40 }: { points: [number, number][]; padding?: number }) {
  const map = useMap();
  // So sánh bằng chuỗi để effect chỉ chạy lại khi toạ độ thực sự thay đổi.
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 16);
    else map.fitBounds(L.latLngBounds(points), { padding: [padding, padding], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/** Bản đồ xem trước tour: nối các điểm dừng theo thứ tự và đánh số. */
export function TourMap({ stops }: { stops: { id: number; name: string; latitude: number; longitude: number }[] }) {
  const points = stops.map((s) => [s.latitude, s.longitude] as [number, number]);
  return (
    <MapContainer center={DISTRICT4_CENTER} zoom={15} className="map map-tour" scrollWheelZoom>
      <OsmTiles />
      <FitBounds points={points} />
      {points.length > 1 && <Polyline positions={points} pathOptions={{ color: ACCENT, weight: 4, opacity: 0.85, dashArray: '8 6' }} />}
      {stops.map((s, i) => (
        <Marker key={s.id} position={[s.latitude, s.longitude]} icon={numberIcon(i + 1)} title={`${i + 1}. ${s.name}`}>
          <Tooltip direction="top" offset={[0, -12]}>
            {i + 1}. {s.name}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}

let heatLoaded: Promise<unknown> | null = null;
/** leaflet.heat là plugin dạng UMD đọc biến toàn cục `L`. */
function loadHeat() {
  if (!heatLoaded) {
    (window as unknown as { L: typeof L }).L = L;
    heatLoaded = import('leaflet.heat');
  }
  return heatLoaded;
}

/** Lớp bản đồ nhiệt, nạp plugin leaflet.heat theo nhu cầu. */
function HeatLayer({ points }: { points: { lat: number; lng: number; weight: number }[] }) {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer | null = null;
    let cancelled = false;
    // Chuẩn hoá trọng số về 0..1 vì leaflet.heat dùng cường độ tương đối.
    const max = Math.max(1, ...points.map((p) => p.weight));
    loadHeat().then(() => {
      if (cancelled || points.length === 0) return;
      const heat = L.heatLayer(
        points.map((p) => [p.lat, p.lng, p.weight / max] as [number, number, number]),
        { radius: 22, blur: 18, maxZoom: 17, minOpacity: 0.3 },
      );
      // simpleheat đọc lại canvas (getImageData) mỗi lần vẽ: bật willReadFrequently để
      // trình duyệt dùng canvas phù hợp và không cảnh báo trên console.
      const proto = HTMLCanvasElement.prototype;
      const original = proto.getContext;
      proto.getContext = function (this: HTMLCanvasElement, type: string, attrs?: unknown) {
        return original.call(this, type, type === '2d' ? { ...(attrs as object), willReadFrequently: true } : attrs);
      } as typeof original;
      try {
        layer = heat.addTo(map);
      } finally {
        proto.getContext = original;
      }
    });
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}

// Bảng màu cho từng lộ trình để phân biệt các route trên cùng bản đồ.
const ROUTE_COLORS = ['#0f766e', '#2563eb', '#9333ea', '#db2777', '#ea580c', '#65a30d', '#0891b2', '#4f46e5'];

/** Bản đồ nhiệt lượt nghe kèm lộ trình di chuyển và các điểm POI có số lượt. */
export function HeatMap({
  heat,
  routes,
  showRoutes,
  pois,
}: {
  heat: { lat: number; lng: number; weight: number }[];
  routes: { route: number; points: [number, number][] }[];
  showRoutes: boolean;
  pois: { poi_id: number; name: string; latitude: number; longitude: number; plays: number }[];
}) {
  const bounds = useMemo<[number, number][]>(() => {
    // Gộp điểm nhiệt và POI để khung nhìn bao trùm toàn bộ dữ liệu.
    const pts: [number, number][] = heat.map((h) => [h.lat, h.lng]);
    pois.forEach((p) => pts.push([p.latitude, p.longitude]));
    return pts;
  }, [heat, pois]);
  return (
    <MapContainer center={DISTRICT4_CENTER} zoom={15} className="map map-heat" scrollWheelZoom>
      <OsmTiles />
      <FitBounds points={bounds} padding={20} />
      <HeatLayer points={heat} />
      {showRoutes &&
        routes.map((r, i) => (
          <Polyline key={r.route} positions={r.points} pathOptions={{ color: ROUTE_COLORS[i % ROUTE_COLORS.length], weight: 2, opacity: 0.7 }} />
        ))}
      {pois.map((p) => (
        <Circle key={p.poi_id} center={[p.latitude, p.longitude]} radius={12} pathOptions={{ color: '#0b1f1d', weight: 2, fillColor: '#fff', fillOpacity: 1 }}>
          <Tooltip>
            {p.name}: {p.plays} lượt nghe
          </Tooltip>
        </Circle>
      ))}
    </MapContainer>
  );
}
