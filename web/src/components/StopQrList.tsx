import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import QRCode from 'qrcode';
import { poiTitle, useLang, useT } from '../lib/i18n';
import { useContent } from '../lib/useContent';
import '../stop-qr.css';

/** Đường link in trên mã QR ở trạm: cùng tên miền với website, dạng /q/<mã>. */
export function qrLink(payload: string) {
  return `${window.location.origin}/q/${payload}`;
}

function QrImage({ text, alt }: { text: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { width: 320, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#14211e', light: '#ffffff' } }).then(
      (url) => alive && setSrc(url),
      () => alive && setSrc(null),
    );
    return () => {
      alive = false;
    };
  }, [text]);
  return src ? <img className="sq-img" src={src} alt={alt} width={160} height={160} /> : <span className="sq-img sq-img-empty" aria-hidden="true" />;
}

/**
 * Mã QR dán ở trạm xe buýt. Không truyền poiId: hiện mã của mọi điểm (trang chủ).
 * Có poiId: chỉ hiện mã của điểm đó, không có mã thì không hiện gì.
 */
export function StopQrList({ poiId, compact = false }: { poiId?: number; compact?: boolean }) {
  const t = useT();
  const { lang } = useLang();
  const { data } = useContent();
  if (!data) return null;
  const codes = data.qrcodes.filter((q) => poiId === undefined || q.poi_id === poiId);
  if (!codes.length) return null;

  return (
    <ul className={`sq-list${compact ? ' sq-compact' : ''}`}>
      {codes.map((q) => {
        const poi = data.pois.find((p) => p.id === q.poi_id);
        const name = poi ? poiTitle(poi, lang) : '';
        const label = q.label ?? t({ vi: 'Trạm xe buýt', en: 'Bus stop' });
        return (
          <li key={q.payload} className="sq-item">
            <QrImage text={qrLink(q.payload)} alt={t({ vi: `Mã QR nghe về ${name}`, en: `QR code for ${name}` })} />
            <div className="sq-body">
              <span className="sq-label">{label}</span>
              {poiId === undefined && <strong className="sq-name">{name}</strong>}
              <span className="sq-code">
                {t({ vi: 'Mã nhập tay', en: 'Manual code' })}: <code>{q.payload}</code>
              </span>
              <Link to={`/q/${q.payload}`} className="sq-open">
                {t({ vi: 'Mở trang nghe', en: 'Open the listening page' })} →
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
