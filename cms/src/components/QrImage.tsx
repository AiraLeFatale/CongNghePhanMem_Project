/**
 * Hiển thị ảnh mã QR đã tạo sẵn dưới dạng data URL.
 * Tự hiện spinner khi đang tạo và thông báo lỗi nếu không tạo được.
 */
import { useEffect, useState } from 'react';
import { qrDataUrl } from '../lib/qr';
import { Spinner } from './States';

/** Ảnh QR cỡ `size`, tự tạo lại khi nội dung hoặc kích thước thay đổi. */
export function QrImage({ content, size = 180, alt }: { content: string; size?: number; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Ảnh được tạo ở độ phân giải gấp đôi để nét trên màn hình retina;
  // cờ alive tránh gọi setState sau khi component đã unmount.
  useEffect(() => {
    let alive = true;
    setFailed(false);
    qrDataUrl(content, size * 2).then(
      (u) => alive && setSrc(u),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [content, size]);
  if (failed) return <div className="qr-fallback">Không tạo được mã QR</div>;
  if (!src)
    return (
      <div className="qr-fallback" style={{ width: size, height: size }}>
        <Spinner small />
      </div>
    );
  return <img src={src} width={size} height={size} alt={alt} className="qr-img" />;
}
