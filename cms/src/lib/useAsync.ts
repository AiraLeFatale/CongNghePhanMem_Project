import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { errorMessage } from './api';

export interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (v: T | ((prev: T | undefined) => T)) => void;
}

/** Tải dữ liệu với trạng thái loading / lỗi / thử lại; bỏ kết quả của lần gọi cũ. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const callId = useRef(0);

  useEffect(() => {
    const id = ++callId.current;
    setLoading(true);
    setError(null);
    fn().then(
      (v) => {
        if (id !== callId.current) return;
        setDataState(v);
        setLoading(false);
      },
      (e) => {
        if (id !== callId.current) return;
        setError(errorMessage(e));
        setLoading(false);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((v: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof v === 'function' ? (v as (p: T | undefined) => T)(prev) : v));
  }, []);
  return { data, error, loading, reload, setData };
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · CMS Thuyết minh Quận 4`;
  }, [title]);
}
