/**
 * Hook tải dữ liệu bất đồng bộ kèm trạng thái loading/lỗi và hàm tải lại.
 * Bỏ qua kết quả của lần gọi cũ để tránh ghi đè dữ liệu mới.
 */
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { errorMessage } from './api';

// Trạng thái mà useAsync trả về cho component.
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
    // Mỗi lần chạy effect nhận một id mới; kết quả cũ không còn khớp id sẽ bị bỏ.
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

  // Tăng tick để effect chạy lại và gọi lại hàm tải dữ liệu.
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((v: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof v === 'function' ? (v as (p: T | undefined) => T)(prev) : v));
  }, []);
  return { data, error, loading, reload, setData };
}

/** Cập nhật document.title theo trang đang mở. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · CMS Thuyết minh Quận 4`;
  }, [title]);
}
