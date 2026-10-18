import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';
import { useConfirm } from '../components/ConfirmDialog';

/**
 * Cảnh báo khi rời trang mà còn thay đổi chưa lưu: chặn điều hướng trong app (hộp thoại)
 * và đóng/tải lại tab (beforeunload). Trả về ref `bypass` để bỏ qua khi tự điều hướng sau khi lưu.
 */
export function useUnsavedWarning(dirty: boolean, message = 'Bạn có thay đổi chưa lưu. Rời trang sẽ mất các thay đổi này.') {
  const confirm = useConfirm();
  const bypass = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && !bypass.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let active = true;
    confirm({ title: 'Rời trang khi chưa lưu?', message, confirmText: 'Rời trang', cancelText: 'Ở lại', danger: true }).then((ok) => {
      if (!active) return;
      if (ok) blocker.proceed();
      else blocker.reset();
    });
    return () => {
      active = false;
    };
  }, [blocker, confirm, message]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return bypass;
}
