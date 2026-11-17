import { useSearchParams } from 'react-router';
import { Link } from 'react-router';
import { api, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { formatDateTime, formatNumber } from '../lib/format';
import type { PaymentOrder } from '../lib/types';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/States';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const TABS = [
  { key: 'claimed', label: 'Cần đối chiếu' },
  { key: '', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ thanh toán' },
  { key: 'paid', label: 'Đã thanh toán' },
  { key: 'cancelled', label: 'Đã huỷ' },
];

const STATUS: Record<PaymentOrder['status'], { label: string; cls: string }> = {
  pending: { label: 'Chờ thanh toán', cls: 'badge' },
  paid: { label: 'Đã thanh toán', cls: 'badge badge-ok' },
  cancelled: { label: 'Đã huỷ', cls: 'badge badge-muted' },
};

const vnd = (n: number | undefined) => `${formatNumber(n ?? 0)}đ`;

export function OrdersPage() {
  useDocumentTitle('Thanh toán');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'claimed';
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, loading, reload } = useAsync(() => api.listOrders(status || undefined), [status]);

  async function act(o: PaymentOrder, kind: 'confirm' | 'cancel') {
    const ok = await confirm({
      title: kind === 'confirm' ? 'Xác nhận đã nhận tiền?' : o.claimed_at ? 'Không thấy tiền về?' : 'Huỷ đơn này?',
      message:
        kind === 'confirm' ? (
          <p>
            Kiểm tra sao kê Vietcombank có khoản <strong>{vnd(o.amount)}</strong> với nội dung <strong>{o.code}</strong> trước khi xác nhận.
          </p>
        ) : (
          <p>
            Đơn <strong>{o.code}</strong> bị huỷ{o.claimed_at ? ' và máy của khách mất quyền nghe điểm này' : ''}.
          </p>
        ),
      confirmText: kind === 'confirm' ? 'Đã nhận tiền' : 'Huỷ đơn',
      danger: kind === 'cancel',
    });
    if (!ok) return;
    try {
      await (kind === 'confirm' ? api.confirmOrder(o.id) : api.cancelOrder(o.id));
      toast.success(kind === 'confirm' ? `Đã mở khoá đơn ${o.code}` : `Đã huỷ đơn ${o.code}`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const totals = data?.totals ?? {};
  return (
    <>
      <PageHeader
        title="Thanh toán"
        subtitle="Khách chuyển khoản rồi bấm “Tôi đã chuyển khoản” là nghe được ngay. Đối chiếu với sao kê Vietcombank: thấy tiền thì bấm Đã nhận, không thấy thì Huỷ để thu hồi quyền nghe."
      />
      {data && !data.enabled && (
        <div className="alert alert-warn">Máy chủ chưa cấu hình tài khoản nhận tiền (PAYMENT_ACCOUNT), khách chưa mua được điểm có phí.</div>
      )}
      <section className="card card-flush">
        <dl className="kpi-strip">
          <div className="kpi-cell">
            <dt>Doanh thu đã nhận</dt>
            <dd>
              <span className="kpi-num">{vnd(totals.paid?.amount)}</span>
            </dd>
          </div>
          <div className="kpi-cell">
            <dt>Đơn đã thanh toán</dt>
            <dd>
              <span className="kpi-num">{formatNumber(totals.paid?.count ?? 0)}</span>
            </dd>
          </div>
          <div className="kpi-cell">
            <dt>Cần đối chiếu</dt>
            <dd>
              <span className="kpi-num">{formatNumber(totals.claimed?.count ?? 0)}</span>
              <span className="delta delta-flat">{vnd(totals.claimed?.amount)}</span>
            </dd>
          </div>
          <div className="kpi-cell">
            <dt>Đã huỷ</dt>
            <dd>
              <span className="kpi-num">{formatNumber(totals.cancelled?.count ?? 0)}</span>
            </dd>
          </div>
        </dl>
        <div className="toolbar toolbar-pad">
          <div className="tabs-pill" role="tablist" aria-label="Lọc theo trạng thái">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={status === t.key} className={status === t.key ? 'on' : ''} onClick={() => setParams({ status: t.key }, { replace: true })}>
                {t.label}
                {t.key === 'claimed' && (totals.claimed?.count ?? 0) > 0 && <span className="count">{totals.claimed?.count}</span>}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-sm" onClick={reload}>
            Làm mới
          </button>
        </div>
        {loading && !data ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="Chưa có đơn nào">Đặt phí nghe cho một điểm ở trang sửa điểm, khách mở điểm đó trên website sẽ thấy nút thanh toán.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Mã đơn</th>
                  <th scope="col">Điểm thuyết minh</th>
                  <th scope="col" className="num">
                    Số tiền
                  </th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Tạo lúc</th>
                  <th scope="col">Thanh toán lúc</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.code}</td>
                    <td>
                      <Link to={`/pois/${o.poi_id}`} className="row-title">
                        {o.poi_name}
                      </Link>
                    </td>
                    <td className="num">{vnd(o.amount)}</td>
                    <td>
                      {o.status === 'pending' && o.claimed_at ? (
                        <span className="badge badge-warn">Khách báo đã trả</span>
                      ) : (
                        <span className={STATUS[o.status].cls}>{STATUS[o.status].label}</span>
                      )}
                      {o.status === 'paid' && <div className="row-sub">{o.confirmed_by ? `xác nhận tay: ${o.confirmed_by}` : 'tự động qua ngân hàng'}</div>}
                    </td>
                    <td className="nowrap muted">{formatDateTime(o.created_at)}</td>
                    <td className="nowrap muted">{o.paid_at ? formatDateTime(o.paid_at) : ''}</td>
                    <td className="actions">
                      {o.status === 'pending' && (
                        <>
                          <button type="button" className="btn btn-sm" onClick={() => act(o, 'confirm')}>
                            Đã nhận tiền
                          </button>
                          <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => act(o, 'cancel')}>
                            {o.claimed_at ? 'Không thấy tiền' : 'Huỷ'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
