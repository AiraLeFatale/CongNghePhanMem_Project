import { useEffect, useState } from 'react';
import { loadContent } from './api';
import type { SyncData } from './types';

export function useContent() {
  const [data, setData] = useState<SyncData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(null);
    loadContent().then(
      (d) => alive && setData(d),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);
  return { data, error, retry: () => setAttempt((n) => n + 1) };
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Thuyết minh Quận 4` : 'Thuyết minh Quận 4 · Nghe kể chuyện Khánh Hội, Vĩnh Hội, Xóm Chiếu';
  }, [title]);
}

/** Khoảng cách (mét) giữa hai toạ độ. */
export function distanceM(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
