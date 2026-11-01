/**
 * Hook cảnh báo thay đổi chưa lưu khi rời trang, dùng cho các form POI/tour.
 * Kết hợp chặn điều hướng nội bộ của react-router với sự kiện beforeunload.
 */
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
  // Giữ giá trị dirty mới nhất để hàm kiểm tra của useBlocker luôn đọc đúng.
  dirtyRef.current = dirty;

  // Chỉ chặn khi form đang bẩn, không nằm trong trạng thái bỏ qua và đường dẫn thực sự đổi.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && !bypass.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let active = true;
    // Hỏi xác nhận bằng hộp thoại chung: đồng ý thì đi tiếp, huỷ thì ở lại.
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
    // Cảnh báo mặc định của trình duyệt khi đóng tab hoặc tải lại trang.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return bypass;
}
