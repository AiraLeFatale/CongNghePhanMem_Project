import { Link } from 'react-router';
import { api, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { formatDateTime } from '../lib/format';
import type { TourListItem } from '../lib/types';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/States';
import { Icon } from '../components/Icon';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export function TourListPage() {
  useDocumentTitle('Tour tham quan');
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, loading, reload, setData } = useAsync(() => api.listTours(), []);

  async function onDelete(t: TourListItem) {
    const ok = await confirm({
      title: 'Xoá tour?',
      message: (
        <p>
          Tour <strong>{t.name}</strong> sẽ bị xoá. Các điểm thuyết minh trong tour vẫn được giữ nguyên.
        </p>
      ),
      confirmText: 'Xoá tour',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteTour(t.id);
      setData((xs) => (xs ?? []).filter((x) => x.id !== t.id));
      toast.success(`Đã xoá tour "${t.name}"`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Tour tham quan"
        subtitle="Nhóm các điểm thuyết minh theo thứ tự tham quan (UC4)"
        actions={
          <Link to="/tours/new" className="btn btn-primary">
            <Icon name="plus" /> Tạo tour
          </Link>
        }
      />
      <div className="card">
        {loading && !data ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Chưa có tour nào"
            action={
              <Link to="/tours/new" className="btn btn-primary">
                <Icon name="plus" /> Tạo tour đầu tiên
              </Link>
            }
          >
            Tour giúp khách đi theo lộ trình gợi ý qua nhiều điểm.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Tên tour</th>
                  <th scope="col" className="num">
                    Số điểm
                  </th>
                  <th scope="col">Cập nhật</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/tours/${t.id}`} className="row-title">
                        {t.name}
                      </Link>
                      {t.description && <div className="muted small clamp-2">{t.description}</div>}
                    </td>
                    <td className="num">{t.poi_count}</td>
                    <td className="nowrap small">{formatDateTime(t.updated_at)}</td>
                    <td className="actions">
                      <Link to={`/tours/${t.id}`} className="btn btn-sm" aria-label={`Sửa ${t.name}`}>
                        <Icon name="edit" /> Sửa
                      </Link>
                      <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => onDelete(t)} aria-label={`Xoá ${t.name}`}>
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
