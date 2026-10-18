import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ApiError, errorMessage } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { useUnsavedWarning } from '../lib/useUnsavedWarning';
import { moveItem, validateTour, type FieldErrors } from '../lib/validation';
import type { PoiListItem, Tour } from '../lib/types';
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, Spinner, fieldAria } from '../components/States';
import { Icon } from '../components/Icon';
import { TourMap } from '../components/maps';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export function TourEditPage() {
  const { id } = useParams();
  const tourId = id && id !== 'new' ? Number(id) : null;
  if (id && id !== 'new' && (!Number.isInteger(tourId) || (tourId as number) <= 0)) return <ErrorState message="Mã tour không hợp lệ" />;
  return <TourLoader key={tourId ?? 'new'} tourId={tourId} />;
}

function TourLoader({ tourId }: { tourId: number | null }) {
  const tour = useAsync<Tour | null>(() => (tourId ? api.getTour(tourId) : Promise.resolve(null)), [tourId]);
  const pois = useAsync(() => api.listPois(), []);
  if ((tour.loading && tour.data === undefined) || (pois.loading && !pois.data)) return <LoadingState text="Đang tải tour…" />;
  const err = tour.error || pois.error;
  if (err)
    return (
      <>
        <PageHeader title="Tour tham quan" actions={<Link to="/tours" className="btn">← Danh sách</Link>} />
        <ErrorState
          message={err}
          onRetry={() => {
            tour.reload();
            pois.reload();
          }}
        />
      </>
    );
  return <TourForm initial={tour.data ?? null} pois={pois.data ?? []} />;
}

function TourForm({ initial, pois }: { initial: Tour | null; pois: PoiListItem[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const isNew = !initial;
  useDocumentTitle(isNew ? 'Tạo tour' : `Tour: ${initial?.name}`);

  const start = useMemo(
    () => ({
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      ids: [...(initial?.pois ?? [])].sort((a, b) => a.visit_order - b.visit_order).map((p) => p.id),
    }),
    [initial],
  );
  const [saved, setSaved] = useState(start);
  const [name, setName] = useState(start.name);
  const [description, setDescription] = useState(start.description);
  const [ids, setIds] = useState<number[]>(start.ids);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [announce, setAnnounce] = useState('');
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const dirty = name !== saved.name || description !== saved.description || JSON.stringify(ids) !== JSON.stringify(saved.ids);
  const bypass = useUnsavedWarning(dirty);

  const byId = useMemo(() => new Map(pois.map((p) => [p.id, p])), [pois]);
  // Điểm trong tour có thể không còn trong danh sách (hiếm) → lấy từ dữ liệu tour.
  const tourPoiFallback = useMemo(() => new Map((initial?.pois ?? []).map((p) => [p.id, p])), [initial]);
  const stops = ids
    .map((id) => {
      const p = byId.get(id) ?? tourPoiFallback.get(id);
      return p ? { id, name: p.name, latitude: p.latitude, longitude: p.longitude } : null;
    })
    .filter((x): x is { id: number; name: string; latitude: number; longitude: number } => x !== null);
  const available = pois.filter(
    (p) => !ids.includes(p.id) && (!filter.trim() || `${p.name} ${p.address ?? ''}`.toLowerCase().includes(filter.trim().toLowerCase())),
  );

  function add(id: number) {
    setIds((xs) => [...xs, id]);
    setErrors(({ poi_ids: _d, ...rest }) => rest);
    setAnnounce(`Đã thêm ${byId.get(id)?.name} vào vị trí ${ids.length + 1}`);
  }
  function removeAt(i: number) {
    const n = stops[i]?.name;
    setIds((xs) => xs.filter((_, j) => j !== i));
    setAnnounce(`Đã bỏ ${n} khỏi tour`);
  }
  function move(from: number, to: number, focus = true) {
    if (to < 0 || to >= ids.length) return;
    setIds((xs) => moveItem(xs, from, to));
    setAnnounce(`${stops[from]?.name}: chuyển tới vị trí ${to + 1} trên ${ids.length}`);
    if (focus) {
      const dir = to < from ? 'up' : 'down';
      setTimeout(() => {
        const btn = document.getElementById(`stop-${to}-${dir}`) as HTMLButtonElement | null;
        (btn && !btn.disabled ? btn : document.getElementById(`stop-${to}-${dir === 'up' ? 'down' : 'up'}`))?.focus();
      }, 0);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input = { name: name.trim(), description: description.trim() || null, poi_ids: ids };
    const errs = validateTour(input);
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (errs.poi_ids) toast.error('Không thể lưu tour rỗng: hãy thêm ít nhất một điểm thuyết minh');
      else toast.error('Vui lòng kiểm tra lại các trường được đánh dấu');
      document.getElementById(errs.name ? 'tour-name' : 'poi-filter')?.focus();
      return;
    }
    setSaving(true);
    try {
      const t = initial ? await api.updateTour(initial.id, input) : await api.createTour(input);
      toast.success(initial ? 'Đã lưu tour' : 'Đã tạo tour mới');
      const next = { name: t.name, description: t.description ?? '', ids: t.pois.map((p) => p.id) };
      setSaved(next);
      setName(next.name);
      setDescription(next.description);
      setIds(next.ids);
      if (!initial) {
        bypass.current = true;
        navigate(`/tours/${t.id}`, { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      toast.error(errorMessage(err, 'Không lưu được tour'));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!initial) return;
    const ok = await confirm({
      title: 'Xoá tour?',
      message: (
        <p>
          Tour <strong>{initial.name}</strong> sẽ bị xoá. Các điểm thuyết minh vẫn được giữ nguyên.
        </p>
      ),
      confirmText: 'Xoá tour',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteTour(initial.id);
      toast.success('Đã xoá tour');
      bypass.current = true;
      navigate('/tours', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title={isNew ? 'Tạo tour tham quan' : initial.name}
        subtitle="Chọn điểm thuyết minh và sắp xếp theo thứ tự tham quan"
        actions={
          <>
            <Link to="/tours" className="btn">
              ← Danh sách
            </Link>
            {!isNew && (
              <button type="button" className="btn btn-ghost-danger" onClick={onDelete}>
                <Icon name="trash" /> Xoá tour
              </button>
            )}
          </>
        }
      />
      <form onSubmit={onSubmit} noValidate>
        <div className="grid-2 grid-form">
          <div className="stack">
            <section className="card">
              <h2 className="card-title">Thông tin tour</h2>
              <div className="form-stack">
                <Field id="tour-name" label="Tên tour" required error={errors.name}>
                  <input
                    value={name}
                    maxLength={200}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors(({ name: _d, ...rest }) => rest);
                    }}
                    {...fieldAria('tour-name', errors.name)}
                  />
                </Field>
                <Field id="tour-desc" label="Mô tả">
                  <textarea id="tour-desc" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>
              </div>
            </section>

            <section className="card" aria-labelledby="stops-title">
              <h2 className="card-title" id="stops-title">
                Lộ trình ({ids.length} điểm)
              </h2>
              {errors.poi_ids && (
                <div className="alert alert-warn" role="alert">
                  {errors.poi_ids}
                </div>
              )}
              <p className="sr-only" aria-live="polite">
                {announce}
              </p>
              {stops.length === 0 ? (
                <p className="muted">Chưa có điểm nào. Thêm điểm từ danh sách bên dưới.</p>
              ) : (
                <>
                  <p className="muted small">Kéo thả để sắp xếp, hoặc dùng nút mũi tên (bàn phím).</p>
                  <ol className="stop-list">
                    {stops.map((s, i) => (
                      <li
                        key={s.id}
                        className={`stop${dragOver === i ? ' drag-over' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          dragFrom.current = i;
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(i));
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(i);
                        }}
                        onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFrom.current !== null) move(dragFrom.current, i, false);
                          dragFrom.current = null;
                          setDragOver(null);
                        }}
                        onDragEnd={() => {
                          dragFrom.current = null;
                          setDragOver(null);
                        }}
                      >
                        <span className="grip" aria-hidden="true">
                          <Icon name="grip" />
                        </span>
                        <span className="stop-num" aria-hidden="true">
                          {i + 1}
                        </span>
                        <span className="stop-name">{s.name}</span>
                        <span className="stop-actions">
                          <button
                            type="button"
                            id={`stop-${i}-up`}
                            className="icon-btn"
                            onClick={() => move(i, i - 1)}
                            disabled={i === 0}
                            aria-label={`Đưa ${s.name} lên trước`}
                          >
                            <Icon name="up" />
                          </button>
                          <button
                            type="button"
                            id={`stop-${i}-down`}
                            className="icon-btn"
                            onClick={() => move(i, i + 1)}
                            disabled={i === stops.length - 1}
                            aria-label={`Đưa ${s.name} xuống sau`}
                          >
                            <Icon name="down" />
                          </button>
                          <button type="button" className="icon-btn danger" onClick={() => removeAt(i)} aria-label={`Bỏ ${s.name} khỏi tour`}>
                            <Icon name="x" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>

            <section className="card" aria-labelledby="avail-title">
              <h2 className="card-title" id="avail-title">
                Thêm điểm vào tour
              </h2>
              <div className="search">
                <Icon name="search" />
                <label htmlFor="poi-filter" className="sr-only">
                  Lọc điểm
                </label>
                <input id="poi-filter" type="search" placeholder="Lọc theo tên…" value={filter} onChange={(e) => setFilter(e.target.value)} />
              </div>
              {pois.length === 0 ? (
                <EmptyState title="Chưa có điểm thuyết minh" action={<Link to="/pois/new" className="btn">Thêm điểm</Link>} />
              ) : available.length === 0 ? (
                <p className="muted">{filter ? 'Không có điểm phù hợp.' : 'Tất cả điểm đã nằm trong tour.'}</p>
              ) : (
                <ul className="pick-list">
                  {available.map((p) => (
                    <li key={p.id}>
                      <span>
                        <strong>{p.name}</strong>
                        {p.address && <span className="muted small"> · {p.address}</span>}
                      </span>
                      <button type="button" className="btn btn-sm" onClick={() => add(p.id)} aria-label={`Thêm ${p.name} vào tour`}>
                        <Icon name="plus" /> Thêm
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="card card-sticky" aria-labelledby="map-title">
            <h2 className="card-title" id="map-title">
              Bản đồ lộ trình
            </h2>
            <TourMap stops={stops} />
            {stops.length === 0 && <p className="muted small">Lộ trình sẽ hiện trên bản đồ khi có điểm.</p>}
          </section>
        </div>

        <div className={`save-bar${dirty ? ' is-dirty' : ''}`}>
          <span className="save-status" aria-live="polite">
            {dirty ? '● Có thay đổi chưa lưu' : isNew ? 'Tour mới chưa được lưu' : 'Đã lưu mọi thay đổi'}
          </span>
          <div className="save-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || (!dirty && !isNew)}>
              {saving && <Spinner small />} {isNew ? 'Tạo tour' : 'Lưu tour'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
