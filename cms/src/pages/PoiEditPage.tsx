import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ApiError, errorMessage, qrContent } from '../lib/api';
import { DEFAULT_LANGUAGE, LANGUAGES, languageLabel } from '../lib/languages';
import { useAsync, useDocumentTitle } from '../lib/useAsync';
import { useUnsavedWarning } from '../lib/useUnsavedWarning';
import type { LanguageCode, Poi, PoiListItem, QrCode } from '../lib/types';
import {
  emptyPoiForm,
  filledLanguages,
  mapServerErrors,
  parseNumber,
  poiToForm,
  sameForm,
  toPoiInput,
  translationKey,
  validatePoiForm,
  type FieldErrors,
  type PoiForm,
} from '../lib/validation';
import { downloadQrPng } from '../lib/qr';
import { formatDateTime } from '../lib/format';
import { ErrorState, Field, LoadingState, PageHeader, Spinner, fieldAria } from '../components/States';
import { Icon } from '../components/Icon';
import { MapPicker } from '../components/maps';
import { QrImage } from '../components/QrImage';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const FIELD_ORDER = ['name', 'latitude', 'longitude', 'radius_m', 'priority', ...LANGUAGES.map((l) => translationKey(l.code))];

export function PoiEditPage() {
  const { id } = useParams();
  const numericId = id && id !== 'new' ? Number(id) : null;
  if (id && id !== 'new' && (!Number.isInteger(numericId) || (numericId as number) <= 0)) {
    return <ErrorState message="Mã điểm thuyết minh không hợp lệ" />;
  }
  return <PoiEditor key={numericId ?? 'new'} poiId={numericId} />;
}

function PoiEditor({ poiId }: { poiId: number | null }) {
  const isNew = poiId === null;
  const loaded = useAsync<Poi | null>(() => (poiId ? api.getPoi(poiId) : Promise.resolve(null)), [poiId]);
  const others = useAsync<PoiListItem[]>(() => api.listPois(), []);

  if (loaded.loading && loaded.data === undefined) return <LoadingState text="Đang tải điểm thuyết minh…" />;
  if (loaded.error) {
    return (
      <>
        <PageHeader title="Sửa điểm thuyết minh" actions={<Link to="/pois" className="btn">← Danh sách</Link>} />
        <ErrorState message={loaded.error} onRetry={loaded.reload} />
      </>
    );
  }
  return <PoiFormView initial={loaded.data ?? null} isNew={isNew} others={(others.data ?? []).filter((o) => o.id !== poiId)} />;
}

function PoiFormView({ initial, isNew, others }: { initial: Poi | null; isNew: boolean; others: PoiListItem[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [poi, setPoi] = useState<Poi | null>(initial);
  const [saved, setSaved] = useState<PoiForm>(() => (initial ? poiToForm(initial) : emptyPoiForm()));
  const [form, setForm] = useState<PoiForm>(saved);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lang, setLang] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  useDocumentTitle(isNew ? 'Thêm điểm thuyết minh' : `Sửa: ${poi?.name ?? ''}`);

  const dirty = !sameForm(form, saved);
  const bypass = useUnsavedWarning(dirty);

  const lat = parseNumber(form.latitude);
  const lng = parseNumber(form.longitude);
  const radius = parseNumber(form.radius_m);

  const set = <K extends keyof PoiForm>(key: K, value: PoiForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors(({ [key as string]: _drop, ...rest }) => rest);
  };
  const setTr = (code: LanguageCode, key: 'title' | 'narration_text', value: string) => {
    setForm((f) => ({ ...f, translations: { ...f.translations, [code]: { ...f.translations[code], [key]: value } } }));
    const k = translationKey(code);
    if (errors[k]) setErrors(({ [k]: _drop, ...rest }) => rest);
  };
  const setBusyFor = (k: string, v: string | null) =>
    setBusy((b) => {
      const n = { ...b };
      if (v) n[k] = v;
      else delete n[k];
      return n;
    });

  function applyPoi(p: Poi, keepEdits: boolean) {
    setPoi(p);
    const fresh = poiToForm(p);
    setSaved(fresh);
    if (!keepEdits) setForm(fresh);
  }

  function focusFirstError(errs: FieldErrors) {
    const first = FIELD_ORDER.find((k) => errs[k]) ?? Object.keys(errs)[0];
    if (!first) return;
    const m = first.match(/^translations\.(\w+)$/);
    if (m) {
      setLang(m[1] as LanguageCode);
      setTimeout(() => document.getElementById(`tr-${m[1]}-text`)?.focus(), 0);
    } else {
      document.getElementById(`poi-${first}`)?.focus();
    }
  }

  /** Lưu form. Trả về POI đã lưu, hoặc null nếu lỗi. */
  async function save(opts: { quiet?: boolean } = {}): Promise<Poi | null> {
    const errs = validatePoiForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error('Vui lòng kiểm tra lại các trường được đánh dấu');
      focusFirstError(errs);
      return null;
    }
    const input = toPoiInput(form);
    const sentLangs = filledLanguages(form);
    setSaving(true);
    try {
      const result = poi ? await api.updatePoi(poi.id, input) : await api.createPoi(input);
      if (!opts.quiet) toast.success(poi ? 'Đã lưu thay đổi' : 'Đã tạo điểm thuyết minh mới');
      if (!poi) {
        bypass.current = true;
        navigate(`/pois/${result.id}`, { replace: true });
      } else {
        applyPoi(result, false);
      }
      return result;
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const mapped = mapServerErrors(err.details, sentLangs);
        setErrors(mapped);
        focusFirstError(mapped);
        setTimeout(() => errorSummaryRef.current?.focus(), 0);
      }
      toast.error(errorMessage(err, 'Không lưu được điểm thuyết minh'));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await save();
  }

  async function onDelete() {
    if (!poi) return;
    const ok = await confirm({
      title: 'Xoá điểm thuyết minh?',
      message: (
        <p>
          Điểm <strong>{poi.name}</strong> sẽ bị xoá vĩnh viễn cùng toàn bộ bản dịch, audio và {poi.qrcodes.length} mã QR, đồng thời được gỡ khỏi các
          tour. Thao tác không thể hoàn tác.
        </p>
      ),
      confirmText: 'Xoá điểm',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deletePoi(poi.id);
      toast.success(`Đã xoá "${poi.name}"`);
      bypass.current = true;
      navigate('/pois', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  }

  // ---- Dịch tự động ----
  async function translateOne(target: LanguageCode, src = form.translations[DEFAULT_LANGUAGE]): Promise<boolean> {
    const text = src.narration_text.trim();
    const title = src.title.trim();
    if (!text) {
      toast.error('Nhập nội dung tiếng Việt trước khi dịch');
      return false;
    }
    setBusyFor(`tr-${target}`, 'Đang dịch…');
    try {
      const [t1, t2] = await Promise.all([
        api.translate(text, DEFAULT_LANGUAGE, target),
        title ? api.translate(title, DEFAULT_LANGUAGE, target) : Promise.resolve(null),
      ]);
      setForm((f) => ({
        ...f,
        translations: { ...f.translations, [target]: { title: t2?.text ?? f.translations[target].title, narration_text: t1.text } },
      }));
      const k = translationKey(target);
      setErrors(({ [k]: _drop, ...rest }) => rest);
      return true;
    } catch (err) {
      toast.error(`${languageLabel(target)}: ${errorMessage(err, 'Không dịch được')}`);
      return false;
    } finally {
      setBusyFor(`tr-${target}`, null);
    }
  }

  async function translateMissing() {
    const src = form.translations[DEFAULT_LANGUAGE];
    if (!src.narration_text.trim()) {
      toast.error('Nhập nội dung tiếng Việt trước khi dịch');
      setLang(DEFAULT_LANGUAGE);
      return;
    }
    const targets = LANGUAGES.map((l) => l.code).filter((c) => c !== DEFAULT_LANGUAGE && !form.translations[c].narration_text.trim());
    if (targets.length === 0) {
      toast.info('Tất cả ngôn ngữ đã có nội dung');
      return;
    }
    setBusyFor('all', 'Đang dịch…');
    let okCount = 0;
    for (const c of targets) {
      if (await translateOne(c, src)) okCount++;
    }
    setBusyFor('all', null);
    if (okCount) toast.success(`Đã dịch ${okCount}/${targets.length} ngôn ngữ. Kiểm tra lại rồi bấm "Lưu" để ghi nhận.`);
  }

  // ---- Audio ----
  const savedTr = (code: LanguageCode) => poi?.translations.find((t) => t.language_code === code);

  async function generateTts(code: LanguageCode) {
    let current = poi;
    if (!current || dirty) {
      const ok = await confirm({
        title: 'Lưu trước khi tạo giọng đọc?',
        message: 'Giọng đọc được tạo từ nội dung đã lưu trên máy chủ. Hệ thống sẽ lưu các thay đổi hiện tại rồi tạo giọng đọc.',
        confirmText: 'Lưu và tạo giọng đọc',
      });
      if (!ok) return;
      current = await save({ quiet: true });
      if (!current) return;
      if (!poi) {
        toast.info('Đã lưu điểm mới. Bấm "Tạo giọng đọc" lần nữa trên trang vừa mở.');
        return;
      }
    }
    const text = current.translations.find((t) => t.language_code === code)?.narration_text?.trim();
    if (!text) {
      toast.error(`Chưa có nội dung ${languageLabel(code)} đã lưu để tạo giọng đọc`);
      return;
    }
    setBusyFor(`audio-${code}`, 'Đang tạo giọng đọc…');
    try {
      const p = await api.generateTts(current.id, code);
      applyPoi(p, true);
      toast.success(`Đã tạo giọng đọc ${languageLabel(code)}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Không tạo được giọng đọc'));
    } finally {
      setBusyFor(`audio-${code}`, null);
    }
  }

  async function uploadAudio(code: LanguageCode, file: File) {
    if (!poi) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File quá lớn (tối đa 15 MB)');
      return;
    }
    setBusyFor(`audio-${code}`, 'Đang tải lên…');
    try {
      const p = await api.uploadAudio(poi.id, code, file);
      applyPoi(p, true);
      toast.success(`Đã tải audio ${languageLabel(code)}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Không tải được file audio'));
    } finally {
      setBusyFor(`audio-${code}`, null);
    }
  }

  async function removeAudio(code: LanguageCode) {
    if (!poi) return;
    const ok = await confirm({
      title: 'Gỡ audio?',
      message: `File audio ${languageLabel(code)} sẽ bị xoá. App sẽ đọc bằng giọng máy cho tới khi có audio mới.`,
      confirmText: 'Gỡ audio',
      danger: true,
    });
    if (!ok) return;
    setBusyFor(`audio-${code}`, 'Đang gỡ…');
    try {
      const p = await api.removeAudio(poi.id, code);
      applyPoi(p, true);
      toast.success('Đã gỡ audio');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyFor(`audio-${code}`, null);
    }
  }

  // ---- Ảnh ----
  async function onImage(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Ảnh quá lớn (tối đa 15 MB)');
      return;
    }
    setUploadingImage(true);
    try {
      const r = await api.uploadImage(file);
      set('image_url', r.url);
      toast.success('Đã tải ảnh lên. Bấm "Lưu" để gắn ảnh cho điểm.');
    } catch (err) {
      toast.error(errorMessage(err, 'Không tải được ảnh'));
    } finally {
      setUploadingImage(false);
    }
  }

  const errorCount = Object.keys(errors).length;
  const anyBusy = Object.keys(busy).length > 0;

  return (
    <>
      <PageHeader
        title={isNew ? 'Thêm điểm thuyết minh' : poi?.name || 'Sửa điểm thuyết minh'}
        subtitle={
          isNew ? (
            'Nhập vị trí, vùng kích hoạt và nội dung thuyết minh'
          ) : (
            <>Cập nhật lần cuối: {formatDateTime(poi?.updated_at)}</>
          )
        }
        actions={
          <>
            <Link to="/pois" className="btn">
              ← Danh sách
            </Link>
            {!isNew && (
              <button type="button" className="btn btn-ghost-danger" onClick={onDelete} disabled={deleting}>
                <Icon name="trash" /> Xoá điểm
              </button>
            )}
          </>
        }
      />

      <form onSubmit={onSubmit} noValidate className="poi-form">
        {errorCount > 0 && (
          <div className="alert alert-error" role="alert" tabIndex={-1} ref={errorSummaryRef}>
            <strong>Có {errorCount} lỗi cần sửa:</strong>
            <ul>
              {Object.entries(errors).map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid-2 grid-form">
          <section className="card" aria-labelledby="sec-info">
            <h2 className="card-title" id="sec-info">
              Thông tin chung
            </h2>
            <div className="form-stack">
              <Field id="poi-name" label="Tên điểm" required error={errors.name}>
                <input value={form.name} maxLength={200} onChange={(e) => set('name', e.target.value)} {...fieldAria('poi-name', errors.name)} />
              </Field>
              <Field id="poi-address" label="Địa chỉ">
                <input value={form.address} maxLength={300} onChange={(e) => set('address', e.target.value)} id="poi-address" />
              </Field>
              <div className="row-2">
                <Field id="poi-latitude" label="Vĩ độ" required error={errors.latitude} hint="−90 đến 90">
                  <input inputMode="decimal" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} {...fieldAria('poi-latitude', errors.latitude, true)} />
                </Field>
                <Field id="poi-longitude" label="Kinh độ" required error={errors.longitude} hint="−180 đến 180">
                  <input inputMode="decimal" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} {...fieldAria('poi-longitude', errors.longitude, true)} />
                </Field>
              </div>
              <div className="row-2">
                <Field id="poi-radius_m" label="Bán kính kích hoạt (m)" required error={errors.radius_m} hint="Lớn hơn 0, tối đa 5000 m">
                  <input type="number" min={1} max={5000} step={1} value={form.radius_m} onChange={(e) => set('radius_m', e.target.value)} {...fieldAria('poi-radius_m', errors.radius_m, true)} />
                </Field>
                <Field id="poi-priority" label="Mức ưu tiên" error={errors.priority} hint="0–100, số lớn được phát trước khi các vùng chồng nhau">
                  <input type="number" min={0} max={100} step={1} value={form.priority} onChange={(e) => set('priority', e.target.value)} {...fieldAria('poi-priority', errors.priority, true)} />
                </Field>
              </div>
              <div className="field">
                <span className="label">Ảnh minh hoạ (không bắt buộc)</span>
                <div className="image-row">
                  {form.image_url ? (
                    <img src={api.fileUrl(form.image_url) ?? undefined} alt="Ảnh minh hoạ của điểm" className="thumb" />
                  ) : (
                    <div className="thumb thumb-empty" aria-hidden="true">
                      Chưa có ảnh
                    </div>
                  )}
                  <div className="image-actions">
                    <label className="btn btn-sm file-btn">
                      {uploadingImage ? <Spinner small /> : <Icon name="download" />} {form.image_url ? 'Đổi ảnh' : 'Tải ảnh lên'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) onImage(f);
                        }}
                      />
                    </label>
                    {form.image_url && (
                      <button type="button" className="btn btn-sm btn-ghost-danger" onClick={() => set('image_url', null)}>
                        Bỏ ảnh
                      </button>
                    )}
                    <span className="muted small">JPG, PNG, WebP</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="sec-map">
            <h2 className="card-title" id="sec-map">
              Vị trí trên bản đồ
            </h2>
            <p className="muted small">Bấm vào bản đồ để đặt điểm, kéo ghim để chỉnh. Vòng tròn là vùng kích hoạt; vòng nét đứt là các điểm khác.</p>
            <MapPicker
              lat={lat !== null && lat >= -90 && lat <= 90 ? lat : null}
              lng={lng !== null && lng >= -180 && lng <= 180 ? lng : null}
              radius={radius}
              others={others}
              onChange={(a, b) => {
                setForm((f) => ({ ...f, latitude: String(a), longitude: String(b) }));
                setErrors(({ latitude: _a, longitude: _b, ...rest }) => rest);
              }}
            />
          </section>
        </div>

        <section className="card" aria-labelledby="sec-content">
          <div className="card-head">
            <h2 className="card-title" id="sec-content">
              Nội dung thuyết minh &amp; audio
            </h2>
            <button type="button" className="btn btn-sm" onClick={translateMissing} disabled={!!busy.all || anyBusy}>
              {busy.all ? <Spinner small /> : <Icon name="globe" />} Dịch tất cả ngôn ngữ còn trống
            </button>
          </div>
          <LanguageTabs form={form} errors={errors} poi={poi} active={lang} onChange={setLang} />
          {LANGUAGES.map((l) => (
            <div
              key={l.code}
              role="tabpanel"
              id={`panel-${l.code}`}
              aria-labelledby={`tab-${l.code}`}
              hidden={lang !== l.code}
              className="tab-panel"
            >
              <TranslationPanel
                code={l.code}
                value={form.translations[l.code]}
                saved={savedTr(l.code)}
                error={errors[translationKey(l.code)]}
                busy={busy}
                poiSaved={!!poi}
                dirty={dirty}
                onChange={(k, v) => setTr(l.code, k, v)}
                onTranslate={() => translateOne(l.code)}
                onTts={() => generateTts(l.code)}
                onUpload={(f) => uploadAudio(l.code, f)}
                onRemoveAudio={() => removeAudio(l.code)}
              />
            </div>
          ))}
        </section>

        {poi ? (
          <QrSection poi={poi} onChange={(qrcodes) => setPoi((p) => (p ? { ...p, qrcodes } : p))} />
        ) : (
          <section className="card">
            <h2 className="card-title">Mã QR tại trạm xe buýt</h2>
            <p className="muted">Lưu điểm trước, sau đó có thể tạo mã QR để in và dán tại trạm.</p>
          </section>
        )}

        <div className={`save-bar${dirty ? ' is-dirty' : ''}`}>
          <span className="save-status" aria-live="polite">
            {dirty ? '● Có thay đổi chưa lưu' : isNew ? 'Điểm mới chưa được lưu' : 'Đã lưu mọi thay đổi'}
          </span>
          <div className="save-actions">
            {dirty && !isNew && (
              <button type="button" className="btn" onClick={() => { setForm(saved); setErrors({}); }} disabled={saving}>
                Hoàn tác
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving || (!dirty && !isNew)}>
              {saving && <Spinner small />} {isNew ? 'Tạo điểm' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function LanguageTabs({
  form,
  errors,
  poi,
  active,
  onChange,
}: {
  form: PoiForm;
  errors: FieldErrors;
  poi: Poi | null;
  active: LanguageCode;
  onChange: (c: LanguageCode) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function onKey(e: KeyboardEvent, idx: number) {
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % LANGUAGES.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + LANGUAGES.length) % LANGUAGES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = LANGUAGES.length - 1;
    if (next >= 0) {
      e.preventDefault();
      const c = LANGUAGES[next].code;
      onChange(c);
      refs.current[c]?.focus();
    }
  }
  return (
    <div className="tabs" role="tablist" aria-label="Ngôn ngữ thuyết minh">
      {LANGUAGES.map((l, i) => {
        const filled = !!form.translations[l.code].narration_text.trim();
        const hasAudio = !!poi?.translations.find((t) => t.language_code === l.code)?.audio_url;
        const err = !!errors[translationKey(l.code)];
        return (
          <button
            key={l.code}
            ref={(el) => {
              refs.current[l.code] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${l.code}`}
            aria-selected={active === l.code}
            aria-controls={`panel-${l.code}`}
            tabIndex={active === l.code ? 0 : -1}
            className={`tab${active === l.code ? ' active' : ''}${err ? ' has-error' : ''}`}
            onClick={() => onChange(l.code)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className={`dot${filled ? ' on' : ''}`} aria-hidden="true" />
            {l.label}
            {l.code === DEFAULT_LANGUAGE && <span className="req" aria-label="bắt buộc"> *</span>}
            {hasAudio && <Icon name="speaker" size={14} />}
            <span className="sr-only">
              {filled ? ', đã có nội dung' : ', chưa có nội dung'}
              {hasAudio ? ', có audio' : ''}
              {err ? ', có lỗi' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TranslationPanel({
  code,
  value,
  saved,
  error,
  busy,
  poiSaved,
  dirty,
  onChange,
  onTranslate,
  onTts,
  onUpload,
  onRemoveAudio,
}: {
  code: LanguageCode;
  value: { title: string; narration_text: string };
  saved: Poi['translations'][number] | undefined;
  error?: string;
  busy: Record<string, string>;
  poiSaved: boolean;
  dirty: boolean;
  onChange: (k: 'title' | 'narration_text', v: string) => void;
  onTranslate: () => void;
  onTts: () => void;
  onUpload: (f: File) => void;
  onRemoveAudio: () => void;
}) {
  const isDefault = code === DEFAULT_LANGUAGE;
  const translating = busy[`tr-${code}`];
  const audioBusy = busy[`audio-${code}`];
  const audioSrc = api.fileUrl(saved?.audio_url);
  const savedHasText = !!saved?.narration_text?.trim();
  const textChanged = (saved?.narration_text ?? '') !== value.narration_text.trim();
  const willDelete = !!saved && savedHasText && !value.narration_text.trim() && !value.title.trim();
  const len = value.narration_text.length;
  const textId = `tr-${code}-text`;

  return (
    <div className="tr-grid">
      <div className="form-stack">
        <div className="tr-head">
          <h3 className="sub-title">
            {languageLabel(code)} {isDefault && <span className="muted small">(ngôn ngữ mặc định, bắt buộc)</span>}
          </h3>
          {!isDefault && (
            <button type="button" className="btn btn-sm" onClick={onTranslate} disabled={!!translating || !!busy.all}>
              {translating ? <Spinner small /> : <Icon name="globe" />} Dịch tự động từ tiếng Việt
            </button>
          )}
        </div>
        <Field id={`tr-${code}-title`} label="Tiêu đề hiển thị">
          <input id={`tr-${code}-title`} value={value.title} maxLength={200} onChange={(e) => onChange('title', e.target.value)} lang={code} />
        </Field>
        <Field id={textId} label="Nội dung thuyết minh" required={isDefault} error={error} hint={`${len.toLocaleString('vi-VN')}/10.000 ký tự`}>
          <textarea
            rows={8}
            value={value.narration_text}
            maxLength={10000}
            lang={code}
            onChange={(e) => onChange('narration_text', e.target.value)}
            {...fieldAria(textId, error, true)}
          />
        </Field>
        {willDelete && (
          <p className="alert alert-warn small">Đã xoá hết nội dung: khi lưu, bản {languageLabel(code)} và audio kèm theo sẽ bị gỡ.</p>
        )}
      </div>

      <div className="audio-box" aria-labelledby={`audio-h-${code}`}>
        <h3 className="sub-title" id={`audio-h-${code}`}>
          Audio {languageLabel(code)}
        </h3>
        {!poiSaved ? (
          <p className="muted small">Lưu điểm trước để tải audio hoặc tạo giọng đọc.</p>
        ) : (
          <>
            {audioSrc ? (
              <>
                <audio controls preload="none" src={audioSrc} className="audio-player">
                  Trình duyệt không hỗ trợ phát audio.
                </audio>
                <p className="muted small">Nguồn: {saved?.audio_source === 'tts' ? 'Giọng đọc tự động (TTS)' : 'File tải lên'}</p>
              </>
            ) : (
              <p className="muted small">Chưa có audio — app sẽ đọc bằng giọng máy của điện thoại.</p>
            )}
            {audioSrc && textChanged && savedHasText && (
              <p className="alert alert-warn small">Nội dung đã thay đổi so với lúc tạo audio. Cân nhắc tạo lại giọng đọc.</p>
            )}
            <div className="audio-actions">
              <button type="button" className="btn btn-sm" onClick={onTts} disabled={!!audioBusy || !value.narration_text.trim()}>
                <Icon name="speaker" /> Tạo giọng đọc (TTS)
              </button>
              <label className={`btn btn-sm file-btn${!savedHasText || audioBusy ? ' disabled' : ''}`}>
                <Icon name="download" /> Tải file audio
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,.mp3,.m4a,.aac,.wav,.ogg,.webm"
                  className="sr-only"
                  disabled={!savedHasText || !!audioBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) onUpload(f);
                  }}
                />
              </label>
              {audioSrc && (
                <button type="button" className="btn btn-sm btn-ghost-danger" onClick={onRemoveAudio} disabled={!!audioBusy}>
                  Gỡ audio
                </button>
              )}
            </div>
            {audioBusy && (
              <p className="muted small" role="status">
                <Spinner small /> {audioBusy}
              </p>
            )}
            {!savedHasText && <p className="muted small">Cần lưu nội dung {languageLabel(code)} trước khi gắn audio.</p>}
            {savedHasText && dirty && <p className="muted small">TTS dùng nội dung đã lưu — hệ thống sẽ hỏi lưu trước.</p>}
            <p className="muted small">MP3, M4A, AAC, WAV, OGG, WebM · tối đa 15 MB</p>
          </>
        )}
      </div>
    </div>
  );
}

function QrSection({ poi, onChange }: { poi: Poi; onChange: (q: QrCode[]) => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const items = useMemo(() => poi.qrcodes, [poi.qrcodes]);

  async function create(e?: FormEvent) {
    e?.preventDefault();
    setCreating(true);
    try {
      const q = await api.createQrCode(poi.id, label.trim() || null);
      onChange([...items, q]);
      setLabel('');
      toast.success('Đã tạo mã QR');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function remove(q: QrCode) {
    const ok = await confirm({
      title: 'Xoá mã QR?',
      message: (
        <p>
          Mã <strong>{q.label || qrContent(q)}</strong> sẽ ngừng hoạt động. Bản in đã dán tại trạm sẽ không còn quét được.
        </p>
      ),
      confirmText: 'Xoá mã QR',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteQrCode(q.id);
      onChange(items.filter((x) => x.id !== q.id));
      toast.success('Đã xoá mã QR');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <section className="card" aria-labelledby="sec-qr">
      <div className="card-head">
        <h2 className="card-title" id="sec-qr">
          Mã QR tại trạm xe buýt ({items.length})
        </h2>
        <Link to={`/qr?poi=${poi.id}`} className="btn btn-sm">
          <Icon name="print" /> In mã QR của điểm này
        </Link>
      </div>
      <div className="qr-create">
        <label htmlFor="qr-label" className="sr-only">
          Nhãn mã QR
        </label>
        <input
          id="qr-label"
          placeholder="Nhãn, ví dụ: Trạm xe buýt Khánh Hội"
          value={label}
          maxLength={200}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              create();
            }
          }}
        />
        <button type="button" className="btn btn-primary" onClick={() => create()} disabled={creating}>
          {creating ? <Spinner small /> : <Icon name="plus" />} Tạo mã QR
        </button>
      </div>
      {items.length === 0 ? (
        <p className="muted">Chưa có mã QR nào cho điểm này.</p>
      ) : (
        <ul className="qr-grid">
          {items.map((q) => (
            <li key={q.id} className="qr-card">
              <QrImage content={qrContent(q)} size={140} alt={`Mã QR ${q.label ?? ''}`} />
              <div className="qr-meta">
                <strong>{q.label || 'Không có nhãn'}</strong>
                <code className="small">{qrContent(q)}</code>
                <span className="muted small">Tạo: {formatDateTime(q.created_at)}</span>
              </div>
              <div className="qr-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => downloadQrPng(qrContent(q), q.label, poi.name).catch((e) => toast.error(errorMessage(e)))}
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
    </section>
  );
}
