import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, errorMessage } from '../lib/api';
import { LANGUAGES } from '../lib/languages';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import type { PoiListItem } from '../lib/types';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/States';
import { Icon } from '../components/Icon';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export function LangChips({ languages, audio }: { languages: string[]; audio: string[] }) {
  return (
    <ul className="lang-chips" aria-label="Ngôn ngữ">
      {LANGUAGES.map((l) => {
        const has = languages.includes(l.code);
        const hasAudio = audio.includes(l.code);
        const state = hasAudio ? 'có nội dung và audio' : has ? 'có nội dung, chưa có audio' : 'chưa có nội dung';
        return (
          <li
            key={l.code}
            className={`chip chip-lang${has ? ' on' : ''}${hasAudio ? ' audio' : ''}`}
            title={`${l.label}: ${state}`}
            aria-label={`${l.label}: ${state}`}
          >
            {l.code.toUpperCase()}
            {hasAudio && <Icon name="speaker" size={12} />}
          </li>
        );
      })}
    </ul>
  );
}

export function PoiListPage() {
  useDocumentTitle('Điểm thuyết minh');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [input, setInput] = useState(q);
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, loading, reload, setData } = useAsync(() => api.listPois(q), [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (input.trim() !== q) setParams(input.trim() ? { q: input.trim() } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [input, q, setParams]);

  async function onDelete(p: PoiListItem) {
    const ok = await confirm({
      title: 'Xoá điểm thuyết minh?',
      message: (
        <>
          <p>
            Điểm <strong>{p.name}</strong> sẽ bị xoá vĩnh viễn cùng toàn bộ bản dịch, file audio và {p.qr_count} mã QR. Điểm này cũng được gỡ khỏi
            các tour có chứa nó.
          </p>
          <p>Thao tác không thể hoàn tác.</p>
        </>
      ),
      confirmText: 'Xoá điểm',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deletePoi(p.id);
      setData((xs) => (xs ?? []).filter((x) => x.id !== p.id));
      toast.success(`Đã xoá "${p.name}"`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Điểm thuyết minh"
        subtitle="Quản lý vị trí, vùng kích hoạt, nội dung đa ngôn ngữ và audio (UC3)"
        actions={
          <Link to="/pois/new" className="btn btn-primary">
            <Icon name="plus" /> Thêm điểm
          </Link>
        }
      />
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" />
            <label htmlFor="poi-search" className="sr-only">
              Tìm điểm
            </label>
            <input id="poi-search" type="search" placeholder="Tìm theo tên hoặc địa chỉ…" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          {data && <span className="muted">{data.length} điểm</span>}
        </div>
        {loading && !data ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data || data.length === 0 ? (
          q ? (
            <EmptyState title="Không tìm thấy điểm phù hợp">Thử từ khoá khác hoặc xoá ô tìm kiếm.</EmptyState>
          ) : (
            <EmptyState
              title="Chưa có điểm thuyết minh nào"
              action={
                <Link to="/pois/new" className="btn btn-primary">
                  <Icon name="plus" /> Thêm điểm đầu tiên
                </Link>
              }
            >
              Thêm điểm để app tự phát thuyết minh khi khách đến gần.
            </EmptyState>
          )
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Tên điểm</th>
                  <th scope="col">Toạ độ</th>
                  <th scope="col" className="num">
                    Bán kính
                  </th>
                  <th scope="col" className="num">
                    Ưu tiên
                  </th>
                  <th scope="col">Ngôn ngữ / audio</th>
                  <th scope="col" className="num">
                    QR
                  </th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/pois/${p.id}`} className="row-title">
                        {p.name}
                      </Link>
                      {p.address && <div className="muted small">{p.address}</div>}
                    </td>
                    <td className="mono small nowrap">
                      {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                    </td>
                    <td className="num nowrap">{p.radius_m} m</td>
                    <td className="num">{p.priority}</td>
                    <td>
                      <LangChips languages={p.languages} audio={p.audio_languages} />
                    </td>
                    <td className="num">{p.qr_count}</td>
                    <td className="actions">
                      <Link to={`/pois/${p.id}`} className="btn btn-sm" aria-label={`Sửa ${p.name}`}>
                        <Icon name="edit" /> Sửa
                      </Link>
                      <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => onDelete(p)} aria-label={`Xoá ${p.name}`}>
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
