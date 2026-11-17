import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle, Copy, DownloadSimple, LockSimple, X } from '@phosphor-icons/react';
import { ApiError, claimOrder, createOrder, orderStatus, saveAccessToken } from '../lib/api';
import { useT } from '../lib/i18n';
import { BANK_APPS, bankDeeplink, vietQrPayload } from '../lib/vietqr';
import type { Order } from '../lib/types';

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const orderKey = (poiId: number) => `narr_order_${poiId}`;

function loadOrder(poiId: number): Order | null {
  try {
    const o = JSON.parse(sessionStorage.getItem(orderKey(poiId)) ?? 'null') as Order | null;
    return o?.token && o.status === 'pending' ? o : null;
  } catch {
    return null;
  }
}

/**
 * Khung mở khoá điểm có phí. Khách chọn app ngân hàng (mở sẵn số tiền + nội dung) hoặc quét VietQR.
 * Tiền về tài khoản → webhook ngân hàng xác nhận đơn → trang tự mở khoá, không cần ai bấm duyệt.
 */
export function Paywall({ poiId, price, title, onUnlocked }: { poiId: number; price: number; title: string; onUnlocked: (token: string) => void }) {
  const t = useT();
  const [order, setOrder] = useState<Order | null>(() => loadOrder(poiId));
  const [open, setOpen] = useState(() => !!loadOrder(poiId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const done = useRef(false);

  const pay = order?.bank && order.transfer_note ? { bin: order.bank.bin, account: order.bank.account, amount: order.amount, note: order.transfer_note } : null;

  useEffect(() => {
    if (!pay) return;
    QRCode.toDataURL(vietQrPayload(pay), { width: 520, margin: 1, errorCorrectionLevel: 'M' }).then(setQr, () => setQr(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.code]);

  // Hỏi trạng thái mỗi 3 giây và ngay khi khách quay lại từ app ngân hàng.
  useEffect(() => {
    if (!order?.token || order.status !== 'pending') return;
    const check = async () => {
      try {
        const s = await orderStatus(order.code, order.token as string);
        if (s.status === 'paid') {
          unlock(order);
        } else if (s.status === 'cancelled') {
          sessionStorage.removeItem(orderKey(poiId));
          setOrder(null);
          setError(t({ vi: 'Đơn đã bị huỷ. Bấm để tạo đơn mới.', en: 'The order was cancelled. Tap to start again.' }));
        }
      } catch {
        /* mạng chập chờn: thử lại lần sau */
      }
    };
    const timer = setInterval(check, 3000);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    check();
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.code, order?.status]);

  async function start() {
    setError(null);
    if (order) {
      setOpen(true);
      return;
    }
    setBusy(true);
    try {
      const o = await createOrder(poiId);
      setOrder(o);
      sessionStorage.setItem(orderKey(poiId), JSON.stringify(o));
      setOpen(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t({ vi: 'Chưa tạo được đơn, thử lại sau.', en: 'Could not start payment, please try again.' }));
    } finally {
      setBusy(false);
    }
  }

  function unlock(o: Order) {
    if (done.current) return;
    done.current = true;
    saveAccessToken(o.token as string);
    sessionStorage.removeItem(orderKey(poiId));
    setOrder({ ...o, status: 'paid' });
    setTimeout(() => {
      setOpen(false);
      onUnlocked(o.token as string);
    }, 700);
  }

  const [claiming, setClaiming] = useState(false);
  async function claim() {
    if (!order?.token) return;
    setClaiming(true);
    setError(null);
    try {
      await claimOrder(order.code, order.token);
      unlock(order);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t({ vi: 'Chưa gửi được, thử lại.', en: 'Could not confirm, please try again.' }));
    } finally {
      setClaiming(false);
    }
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* trình duyệt không cho chép: khách vẫn đọc được trên màn hình */
    }
  }

  return (
    <>
      <div className="paywall">
        <LockSimple size={22} aria-hidden="true" />
        <div>
          <strong>{t({ vi: 'Bạn đang nghe đoạn đầu', en: 'You are hearing a preview' })}</strong>
          <p>
            {t({
              vi: `Mở khoá toàn bộ bài thuyết minh và file audio của điểm này với ${vnd(price)}. Thanh toán một lần, nghe lại không giới hạn trên máy này.`,
              en: `Unlock the full narration and audio for ${vnd(price)}. Pay once, listen again any time on this device.`,
            })}
          </p>
          {error && <p className="paywall-error">{error}</p>}
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={start} disabled={busy}>
          {busy ? t({ vi: 'Đang tạo đơn…', en: 'Starting…' }) : `${t({ vi: 'Nghe toàn bộ', en: 'Unlock' })} · ${vnd(price)}`}
        </button>
      </div>

      {open && order && pay && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="pay-title" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sheet-close icon-btn" onClick={() => setOpen(false)} aria-label={t({ vi: 'Đóng', en: 'Close' })}>
              <X size={20} />
            </button>
            {order.status === 'paid' ? (
              <div className="pay-done">
                <CheckCircle size={48} weight="fill" aria-hidden="true" />
                <h2>{t({ vi: 'Đã nhận thanh toán', en: 'Payment received' })}</h2>
                <p>{t({ vi: 'Đang mở bài thuyết minh…', en: 'Opening the narration…' })}</p>
              </div>
            ) : (
              <>
                <h2 id="pay-title">
                  {vnd(order.amount)} · {title}
                </h2>
                <p className="sheet-sub">{t({ vi: 'Chọn app ngân hàng của bạn, thông tin chuyển khoản đã điền sẵn.', en: 'Pick your Vietnamese banking app; transfer details are pre-filled.' })}</p>
                <div className="bank-apps">
                  {BANK_APPS.map((b) => (
                    <a key={b.id} href={bankDeeplink(b.id, pay)} className="bank-app" rel="noreferrer">
                      <img src={`https://cdn.vietqr.io/bank-app-icon/${b.id}-ios.webp`} alt="" width={40} height={40} loading="lazy" />
                      <span>{b.name}</span>
                    </a>
                  ))}
                </div>

                <div className="pay-qr">
                  {qr && <img src={qr} alt={t({ vi: 'Mã VietQR thanh toán', en: 'VietQR payment code' })} width={220} height={220} />}
                  <div>
                    <p className="pay-qr-hint">
                      {t({
                        vi: 'Hoặc quét mã này bằng app ngân hàng (dùng điện thoại khác, hoặc lưu ảnh rồi chọn "Quét từ ảnh").',
                        en: 'Or scan this code in your banking app (from another phone, or save the image and scan from photos).',
                      })}
                    </p>
                    {qr && (
                      <a href={qr} download={`thanh-toan-${order.code}.png`} className="btn">
                        <DownloadSimple size={18} /> {t({ vi: 'Lưu ảnh QR', en: 'Save QR image' })}
                      </a>
                    )}
                  </div>
                </div>

                <dl className="pay-info">
                  {[
                    { k: t({ vi: 'Ngân hàng', en: 'Bank' }), v: order.bank!.name },
                    { k: t({ vi: 'Số tài khoản', en: 'Account' }), v: order.bank!.account, copy: true },
                    { k: t({ vi: 'Chủ tài khoản', en: 'Name' }), v: order.bank!.account_name },
                    { k: t({ vi: 'Số tiền', en: 'Amount' }), v: String(order.amount), show: vnd(order.amount), copy: true },
                    { k: t({ vi: 'Nội dung', en: 'Reference' }), v: order.transfer_note!, copy: true, strong: true },
                  ].map((row) => (
                    <div key={row.k}>
                      <dt>{row.k}</dt>
                      <dd className={row.strong ? 'strong' : ''}>
                        <span>{row.show ?? row.v}</span>
                        {row.copy && (
                          <button type="button" className="copy-btn" onClick={() => copy(row.k, row.v)}>
                            {copied === row.k ? t({ vi: 'Đã chép', en: 'Copied' }) : <Copy size={16} aria-label={t({ vi: 'Chép', en: 'Copy' })} />}
                          </button>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>

                <button type="button" className="btn btn-primary btn-lg btn-block pay-claim" onClick={claim} disabled={claiming}>
                  {claiming ? t({ vi: 'Đang mở…', en: 'Opening…' }) : t({ vi: 'Tôi đã chuyển khoản xong', en: 'I have paid' })}
                </button>
                {error && <p className="paywall-error">{error}</p>}
                <p className="pay-note">
                  {t({
                    vi: 'Bấm sau khi app ngân hàng báo chuyển thành công, bài thuyết minh mở ngay. Giữ nguyên nội dung chuyển khoản để chúng tôi đối chiếu.',
                    en: 'Tap after your bank confirms the transfer and the narration opens right away. Keep the reference unchanged so we can match it. Vietnamese bank transfers only for now.',
                  })}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
