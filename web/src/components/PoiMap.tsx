import L from 'leaflet';
import { Fragment, useEffect } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router';
import type { Poi } from '../lib/types';

function pin(label: string, active: boolean) {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<span class="pin${active ? ' pin-active' : ''}">${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function Fit({ pois }: { pois: Poi[] }) {
  const map = useMap();
  useEffect(() => {
    if (pois.length === 1) map.setView([pois[0].latitude, pois[0].longitude], 16);
    else if (pois.length > 1) map.fitBounds(L.latLngBounds(pois.map((p) => [p.latitude, p.longitude])), { padding: [36, 36] });
  }, [map, pois]);
  return null;
}

/** Bản đồ các điểm. `numbered` đánh số theo thứ tự (dùng cho tour) và nối đường đi. */
export function PoiMap({
  pois,
  activeId,
  numbered = false,
  showRadius = false,
  className = '',
}: {
  pois: Poi[];
  activeId?: number;
  numbered?: boolean;
  showRadius?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <MapContainer className={`map ${className}`} center={[10.763, 106.704]} zoom={15} scrollWheelZoom={false} attributionControl>
      {/* Nền OpenStreetMap: máy chủ OSM chặn request thiếu Referer, nên backend đặt Referrer-Policy strict-origin-when-cross-origin */}
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} />
      <Fit pois={pois} />
      {numbered && pois.length > 1 && <Polyline positions={pois.map((p) => [p.latitude, p.longitude] as [number, number])} pathOptions={{ color: '#0f766e', weight: 3, opacity: 0.7, dashArray: '6 8' }} />}
      {pois.map((p, i) => (
        <Fragment key={p.id}>
          {showRadius && <Circle center={[p.latitude, p.longitude]} radius={p.radius_m} pathOptions={{ color: '#0f766e', weight: 1, fillOpacity: 0.08 }} />}
          <Marker
            position={[p.latitude, p.longitude]}
            icon={pin(numbered ? String(i + 1) : '', p.id === activeId)}
            title={p.name}
            eventHandlers={{ click: () => navigate(`/diem/${p.id}`) }}
          />
        </Fragment>
      ))}
    </MapContainer>
  );
}
