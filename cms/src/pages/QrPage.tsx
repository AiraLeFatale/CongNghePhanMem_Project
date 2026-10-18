import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, errorMessage, qrContent } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { downloadQrPng, QR_INSTRUCTION } from '../lib/qr';
import { formatDateTime } from '../lib/format';
import type { QrCode } from '../lib/types';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/States';
import { Icon } from '../components/Icon';
import { QrImage } from '../components/QrImage';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export function QrPage() {
  useDocumentTitle('Mã QR');
  const [params, setParams] = useSearchParams();
  const poiFilter = params.get('poi') ?? '';
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, loading, reload, setData } = useAsync(() => api.listQrCodes(), []);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const pois = useMemo(() => {
    const m = new Map<number, string>();
    (data ?? []).forEach((q) => m.set(q.poi_id, q.poi_name ?? `Điểm #${q.poi_id}`));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'vi'));
  }, [data]);

  const visible = useMemo(
    () => (data ?? []).filter((q) => !poiFilter || String(q.poi_id) === poiFilter).sort((a, b) => (a.poi_name ?? '').localeCompare(b.poi_name ?? '', 'vi') || a.id - b.id),
    [data, poiFilter],
  );
  const toPrint = visible.filter((q) => !excluded.has(q.id));

  function toggle(id: number) {
    setExcluded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function remove(q: QrCode) {
    const ok = await confirm({
      title: 'Xoá mã QR?',
      message: (
        <p>
          Mã <strong>{q.label || qrContent(q)}</strong> của điểm <strong>{q.poi_name}</strong> sẽ ngừng hoạt động. Bản in đã dán tại trạm sẽ không còn quét
          được.
        </p>
      ),
      confirmText: 'Xoá mã QR',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteQrCode(q.id);
      setData((xs) => (xs ?? []).filter((x) => x.id !== q.id));
      toast.success('Đã xoá mã QR');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function print() {
    if (toPrint.length === 0) {
      toast.error('Chọn ít nhất một mã QR để in');
      return;
    }
    window.print();
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Mã QR"
          subtitle="Mã QR dán tại trạm xe buýt: hành khách quét để nghe thuyết minh của điểm gần đó"
          actions={
            <button type="button" className="btn btn-primary" onClick={print} disabled={!data || toPrint.length === 0}>
              <Icon name="print" /> In bảng mã ({toPrint.length})
            </button>
          }
        />
        <div className="card">
          <div className="toolbar">
            <div className="field field-inline">
              <label htmlFor="qr-poi">Lọc theo điểm</label>
              <select
                id="qr-poi"
                value={poiFilter}
                onChange={(e) => setParams(e.target.value ? { poi: e.target.value } : {}, { replace: true })}
              >
                <option value="">Tất cả điểm</option>
                {pois.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <span className="muted">Bỏ chọn ô "In" để không đưa mã vào bảng in.</span>
          </div>
          {loading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : visible.length === 0 ? (
            <EmptyState
              title="Chưa có mã QR"
              action={
                <Link to="/pois" className="btn">
                  Đến danh sách điểm
                </Link>
              }
            >
              Tạo mã QR trong trang chi tiết của từng điểm thuyết minh.
            </EmptyState>
          ) : (
            <ul className="qr-grid qr-grid-lg">
              {visible.map((q) => (
                <li key={q.id} className={`qr-card${excluded.has(q.id) ? ' is-off' : ''}`}>
                  <QrImage content={qrContent(q)} size={150} alt={`Mã QR ${q.label ?? ''} – ${q.poi_name ?? ''}`} />
                  <div className="qr-meta">
                    <strong>{q.label || 'Không có nhãn'}</strong>
                    <Link to={`/pois/${q.poi_id}`} className="small">
                      {q.poi_name}
                    </Link>
                    <code className="small">{qrContent(q)}</code>
                    <span className="muted small">Tạo: {formatDateTime(q.created_at)}</span>
                  </div>
                  <div className="qr-actions">
                    <label className="check">
                      <input type="checkbox" checked={!excluded.has(q.id)} onChange={() => toggle(q.id)} /> In
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => downloadQrPng(qrContent(q), q.label, q.poi_name ?? null).catch((e) => toast.error(errorMessage(e)))}
                    >
                      <Icon name="download" /> PNG
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => remove(q)} aria-label={`Xoá mã QR ${q.label ?? ''}`}>
                      <Icon name="trash" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="print-sheet" aria-hidden="true">
        {toPrint.map((q) => (
          <div key={q.id} className="print-card">
            <QrImage content={qrContent(q)} size={260} alt="" />
            <div className="print-label">{q.label || q.poi_name}</div>
            {q.label && <div className="print-poi">{q.poi_name}</div>}
            <div className="print-hint">{QR_INSTRUCTION}</div>
            <div className="print-sub">Scan to listen · 扫码收听 · 스캔하여 듣기 · スキャンして聴く · Scannez pour écouter</div>
          </div>
        ))}
      </div>
    </>
  );
}
