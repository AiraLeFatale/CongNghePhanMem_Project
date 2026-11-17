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

const STATUS_TABS = [
  { key: '', label: 'Tất cả', test: () => true },
  { key: 'no-audio', label: 'Thiếu audio', test: (p: PoiListItem) => p.audio_languages.length === 0 },
  { key: 'missing-lang', label: 'Thiếu bản dịch', test: (p: PoiListItem) => p.languages.length < LANGUAGES.length },
  { key: 'no-qr', label: 'Chưa có QR', test: (p: PoiListItem) => p.qr_count === 0 },
];

function PoiStatus({ p }: { p: PoiListItem }) {
  if (p.languages.length >= LANGUAGES.length && p.audio_languages.length >= LANGUAGES.length) return <span className="badge badge-ok">Đầy đủ</span>;
  if (p.audio_languages.length === 0) return <span className="badge badge-warn">Thiếu audio</span>;
  return <span className="badge">Đang bổ sung</span>;
}

export function PoiListPage() {
  useDocumentTitle('Điểm thuyết minh');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const tab = STATUS_TABS.find((t) => t.key === status) ?? STATUS_TABS[0];
  const [input, setInput] = useState(q);
  const toast = useToast();
  const confirm = useConfirm();
  const { data, error, loading, reload, setData } = useAsync(() => api.listPois(q), [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (input.trim() !== q) setParams(paramsFor(input.trim(), status), { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [input, q, status, setParams]);

  function paramsFor(query: string, st: string) {
    const p: Record<string, string> = {};
    if (query) p.q = query;
    if (st) p.status = st;
    return p;
  }
  const rows = (data ?? []).filter(tab.test);

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
        subtitle="Vị trí, vùng kích hoạt, bản dịch và audio của từng điểm"
        actions={
          <Link to="/pois/new" className="btn btn-primary">
            <Icon name="plus" /> Thêm điểm
          </Link>
        }
      />
      <div className="card card-flush">
        <div className="toolbar toolbar-pad">
          <div className="tabs-pill" role="tablist" aria-label="Lọc theo tình trạng">
            {STATUS_TABS.map((t) => {
              const n = (data ?? []).filter(t.test).length;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab.key === t.key}
                  className={tab.key === t.key ? 'on' : ''}
                  onClick={() => setParams(paramsFor(q, t.key), { replace: true })}
                >
                  {t.label}
                  {data && <span className="count">{n}</span>}
                </button>
              );
            })}
          </div>
          <div className="search">
            <Icon name="search" />
            <label htmlFor="poi-search" className="sr-only">
              Tìm điểm
            </label>
            <input id="poi-search" type="search" placeholder="Tìm theo tên hoặc địa chỉ" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
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
        ) : rows.length === 0 ? (
          <EmptyState title="Không còn điểm nào ở mục này">Các điểm đều đã xử lý xong phần {tab.label.toLowerCase()}.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Tên điểm</th>
                  <th scope="col">Tình trạng</th>
                  <th scope="col">Ngôn ngữ</th>
                  <th scope="col" className="num">
                    Bán kính
                  </th>
                  <th scope="col" className="num">
                    Ưu tiên
                  </th>
                  <th scope="col" className="num">
                    QR
                  </th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/pois/${p.id}`} className="row-title">
                        {p.name}
                      </Link>
                      {p.price ? <span className="badge badge-warn price-badge">{p.price.toLocaleString('vi-VN')}đ</span> : null}
                      <div className="row-sub">
                        {p.address && <span>{p.address}</span>}
                        <span className="mono">
                          {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <PoiStatus p={p} />
                    </td>
                    <td>
                      <LangChips languages={p.languages} audio={p.audio_languages} />
                    </td>
                    <td className="num nowrap">{p.radius_m} m</td>
                    <td className="num">{p.priority}</td>
                    <td className="num">{p.qr_count}</td>
                    <td className="actions">
                      <Link to={`/pois/${p.id}`} className="icon-btn" aria-label={`Sửa ${p.name}`} title="Sửa">
                        <Icon name="edit" />
                      </Link>
                      <button type="button" className="icon-btn danger" onClick={() => onDelete(p)} aria-label={`Xoá ${p.name}`} title="Xoá">
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && rows.length > 0 && (
          <p className="table-foot">
            {rows.length} / {data.length} điểm
          </p>
        )}
      </div>
    </>
  );
}
