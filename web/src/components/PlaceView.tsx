import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, MapPin, QrCode } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { LANGS, pickTranslation, poiTitle, useLang, useT } from '../lib/i18n';
import { distanceM } from '../lib/useContent';
import { accessTokens, fullPoi } from '../lib/api';
import { poiPhoto } from '../lib/photos';
import { useNarration } from '../lib/useNarration';
import type { Poi, SyncData, Tour } from '../lib/types';
import { Player } from './Player';
import { PoiMap } from './PoiMap';
import { Paywall } from './Paywall';
import { StopQrList } from './StopQrList';

function fmtDistance(m: number, ui: 'vi' | 'en') {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1).replace('.', ui === 'vi' ? ',' : '.')} km`;
}

/** Trang một điểm: ảnh, nội dung thuyết minh, trình phát. Dùng cho /diem/:id và /q/:mã. */
export function PlaceView({
  poi: basePoi,
  content,
  trigger,
  tour,
  scannedLabel,
}: {
  poi: Poi;
  content: SyncData | null;
  trigger: 'qr' | 'manual';
  tour?: Tour;
  scannedLabel?: string | null;
}) {
  const t = useT();
  const { lang, setLang, ui } = useLang();
  // Điểm có phí: nếu máy này đã mua thì lấy nội dung đầy đủ thay cho đoạn nghe thử.
  const [unlocked, setUnlocked] = useState<Poi | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  useEffect(() => {
    setUnlocked(null);
    if (!basePoi.locked || accessTokens().length === 0) return;
    let alive = true;
    fullPoi(basePoi.id).then(
      (p) => alive && setUnlocked(p),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [basePoi]);
  const poi = unlocked && unlocked.id === basePoi.id ? unlocked : basePoi;
  const tr = pickTranslation(poi, lang);
  const title = poiTitle(poi, tr?.language_code ?? lang);
  const n = useNarration(poi.id, tr, trigger);
  // Vừa thanh toán xong: phát luôn bản đầy đủ (trình duyệt chặn thì khách bấm nút phát).
  useEffect(() => {
    if (!autoPlay || poi.locked) return;
    setAutoPlay(false);
    const id = setTimeout(() => n.play(), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, poi.locked, tr]);

  async function onUnlocked(token: string) {
    try {
      setUnlocked(await fullPoi(basePoi.id, token));
      setAutoPlay(true);
    } catch {
      window.location.reload();
    }
  }
  const photo = poiPhoto(poi);
  const available = LANGS.filter((l) => poi.translations.some((x) => x.language_code === l.code && x.narration_text.trim()));
  const missing = tr && tr.language_code !== lang;

  const all = content?.pois ?? [];
  const nearby = all
    .filter((p) => p.id !== poi.id)
    .map((p) => ({ p, d: distanceM([poi.latitude, poi.longitude], [p.latitude, p.longitude]) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);

  const idx = tour ? tour.poi_ids.indexOf(poi.id) : -1;
  const prevId = tour && idx > 0 ? tour.poi_ids[idx - 1] : undefined;
  const nextId = tour && idx >= 0 && idx < tour.poi_ids.length - 1 ? tour.poi_ids[idx + 1] : undefined;
  const nameOf = (id: number) => {
    const p = all.find((x) => x.id === id);
    return p ? poiTitle(p, lang) : '';
  };

  return (
    <div className={`place${poi.locked ? '' : ' has-player'}`}>
      {scannedLabel !== undefined && (
        <div className="scan-banner">
          <div className="wrap">
            <QrCode size={18} aria-hidden="true" />
            <span>
              {t({ vi: 'Bạn vừa quét mã tại', en: 'You scanned the code at' })} <b>{scannedLabel || title}</b>
            </span>
          </div>
        </div>
      )}
      <div className="wrap place-grid">
        <div className="place-main">
          {tour ? (
            <Link to={`/tour/${tour.id}`} className="back-link">
              <ArrowLeft size={16} /> {tour.name} · {t({ vi: 'điểm', en: 'stop' })} {idx + 1}/{tour.poi_ids.length}
            </Link>
          ) : (
            <Link to="/diem" className="back-link">
              <ArrowLeft size={16} /> {t({ vi: 'Tất cả điểm', en: 'All places' })}
            </Link>
          )}
          {photo && (
            <figure className="place-photo">
              <img src={photo.src} alt={photo.caption[ui]} />
              <figcaption>
                {photo.caption[ui]}
                {photo.author && (
                  <>
                    {' '}
                    · {t({ vi: 'Ảnh', en: 'Photo' })}: {photo.author}, {photo.license}
                  </>
                )}
              </figcaption>
            </figure>
          )}
          <h1 className="place-title">{title}</h1>
          {title !== poi.name && <p className="place-original">{poi.name}</p>}
          {poi.address && (
            <p className="place-address">
              <MapPin size={16} aria-hidden="true" /> {poi.address}
            </p>
          )}

          <div className="lang-pills" role="group" aria-label={t({ vi: 'Ngôn ngữ thuyết minh', en: 'Narration language' })}>
            {LANGS.map((l) => {
              const has = available.some((a) => a.code === l.code);
              return (
                <button key={l.code} type="button" className={tr?.language_code === l.code ? 'on' : ''} disabled={!has} aria-pressed={tr?.language_code === l.code} onClick={() => setLang(l.code)}>
                  {l.label}
                </button>
              );
            })}
          </div>
          {missing && (
            <p className="note">
              {t({ vi: 'Điểm này chưa có bản thuyết minh bằng ngôn ngữ bạn chọn, đang hiển thị', en: 'This place is not yet available in your language. Showing' })}{' '}
              {LANGS.find((l) => l.code === tr?.language_code)?.label}.
            </p>
          )}

          {poi.locked && poi.price ? (
            <>
              <Player n={n} tr={tr} title={t({ vi: 'Nghe thử 1 câu', en: 'Listen to 1 sentence' })} inline />
              <Paywall poiId={poi.id} price={poi.price} title={title} onUnlocked={onUnlocked} />
            </>
          ) : null}
          <article className={`transcript${poi.locked ? ' transcript-preview' : ''}`} lang={tr?.language_code}>
            {(tr?.narration_text ?? '').split(/\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </article>

          {tour && (
            <nav className="stop-nav" aria-label={t({ vi: 'Điểm trong tour', en: 'Tour stops' })}>
              {prevId ? (
                <Link to={`/diem/${prevId}?tour=${tour.id}`} className="stop-link">
                  <small>
                    <ArrowLeft size={14} /> {t({ vi: 'Điểm trước', en: 'Previous' })}
                  </small>
                  <span>{nameOf(prevId)}</span>
                </Link>
              ) : (
                <span />
              )}
              {nextId ? (
                <Link to={`/diem/${nextId}?tour=${tour.id}`} className="stop-link stop-next">
                  <small>
                    {t({ vi: 'Điểm tiếp theo', en: 'Next stop' })} <ArrowRight size={14} />
                  </small>
                  <span>{nameOf(nextId)}</span>
                </Link>
              ) : (
                <Link to={`/tour/${tour.id}`} className="stop-link stop-next">
                  <small>{t({ vi: 'Hết tour', en: 'End of tour' })}</small>
                  <span>{t({ vi: 'Xem lại lộ trình', en: 'Back to the route' })}</span>
                </Link>
              )}
            </nav>
          )}
        </div>

        <aside className="place-side">
          <section>
            <h2 className="side-title">{t({ vi: 'Vị trí', en: 'Location' })}</h2>
            <PoiMap pois={[poi]} activeId={poi.id} showRadius className="map-sm" />
            <p className="side-note">
              {t({
                vi: `Khi mở app và đi vào vòng tròn bán kính ${poi.radius_m} m, thuyết minh sẽ tự phát.`,
                en: `With the app open, narration starts automatically within ${poi.radius_m} m of this place.`,
              })}
            </p>
            <a className="btn btn-block" href={`https://www.openstreetmap.org/directions?to=${poi.latitude}%2C${poi.longitude}#map=17/${poi.latitude}/${poi.longitude}`} target="_blank" rel="noreferrer">
              {t({ vi: 'Chỉ đường', en: 'Directions' })}
            </a>
          </section>
          {scannedLabel === undefined && content?.qrcodes.some((q) => q.poi_id === poi.id) && (
            <section>
              <h2 className="side-title">{t({ vi: 'Mã QR ở trạm gần điểm này', en: 'QR codes near this place' })}</h2>
              <StopQrList poiId={poi.id} compact />
            </section>
          )}
          {nearby.length > 0 && (
            <section>
              <h2 className="side-title">{t({ vi: 'Gần đây', en: 'Nearby' })}</h2>
              <ul className="nearby">
                {nearby.map(({ p, d }) => (
                  <li key={p.id}>
                    <Link to={`/diem/${p.id}`}>
                      <span>{poiTitle(p, lang)}</span>
                      <small>{fmtDistance(d, ui)}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
      {!poi.locked && <Player n={n} tr={tr} title={title} />}
    </div>
  );
}
