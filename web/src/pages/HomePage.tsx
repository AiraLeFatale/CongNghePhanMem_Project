import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpenText, CaretLeft, CaretRight, Clock, MapPin, Pause, Play, Star } from '@phosphor-icons/react';
import { pickTranslation, poiTitle, useLang, useT } from '../lib/i18n';
import { useContent, useTitle } from '../lib/useContent';
import { poiPhoto, type Photo } from '../lib/photos';
import { useNarration } from '../lib/useNarration';
import type { Poi, SyncData, Tour } from '../lib/types';
import { LoadError, Loading } from '../components/States';
import { tourLength, tourStops } from './ToursPage';
import { QrImage, StopQrList, qrLink } from '../components/StopQrList';
import '../home.css';

/** Đoạn mở đầu của bài thuyết minh, cắt ở ranh giới câu gần nhất. */
function excerpt(text: string, max = 150) {
  const s = text.trim().replace(/\s+/g, ' ');
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > 60 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Ước lượng thời lượng đọc (khoảng 150 từ mỗi phút). */
function minutes(text: string) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 150));
}

/** Phường lấy từ phần cuối địa chỉ, ví dụ "Phường Xóm Chiếu". */
function ward(address?: string | null) {
  if (!address) return 'Quận 4';
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || 'Quận 4';
}

/** Trang chủ: phần đầu nghe thử ngay một câu chuyện, lưới điểm, mã QR ở trạm, tour gợi ý. */
export function HomePage() {
  const t = useT();
  const { lang, ui } = useLang();
  useTitle('');
  const { data, error, retry } = useContent();
  const [idx, setIdx] = useState(0);
  const [showQrList, setShowQrList] = useState(false);

  const pois = data ? [...data.pois].sort((a, b) => b.priority - a.priority) : [];
  const stories = pois.filter((p) => poiPhoto(p) && pickTranslation(p, lang)?.narration_text.trim());
  const cur = stories.length ? idx % stories.length : 0;
  const story = stories.length ? stories[cur] : undefined;
  const tr = story ? pickTranslation(story, lang) : undefined;
  const n = useNarration(story?.id, tr, 'manual');
  const photo = story ? poiPhoto(story) : null;
  const nextStory = stories.length > 1 ? stories[(cur + 1) % stories.length] : undefined;
  const nextPhoto = nextStory ? poiPhoto(nextStory) : null;
  const pct = n.mode === 'audio' && n.duration ? (n.position / n.duration) * 100 : stories.length ? ((cur + 1) / stories.length) * 100 : 0;

  const goTo = (i: number) => {
    n.pause();
    setIdx((i + stories.length) % stories.length);
  };
  const toggle = () => (n.playing ? n.pause() : n.play());

  const grid = pois.filter((p) => poiPhoto(p)).slice(0, 5);

  return (
    <div className="hs">
      <section className="hh">
        <div className="wrap hh-grid">
          <div className="hh-copy">
            <p className="hs-eyebrow">{t({ vi: 'Thuyết minh Quận 4 · 6 ngôn ngữ', en: 'District 4 audio guide · 6 languages' })}</p>
            <h1 className="hh-title">
              {t({ vi: 'Đi tới đâu.', en: 'Walk on.' })}
              <br />
              {t({ vi: 'Nghe tới đó.', en: 'Hear the story.' })}
            </h1>
            <p className="hh-lead">
              {t({
                vi: 'Bến cảng, cây cầu và khu chợ của Khánh Hội, Vĩnh Hội, Xóm Chiếu tự kể chuyện của mình. Quét mã ở trạm xe buýt hoặc mở app là nghe, không cần đăng ký.',
                en: 'The wharves, bridges and markets of Khanh Hoi, Vinh Hoi and Xom Chieu tell their own stories. Scan the code at a bus stop or open the app. No sign-up.',
              })}
            </p>
            <div className="hh-cta">
              <Link to="/diem" className="hs-btn hs-btn-primary">
                <Play size={15} weight="fill" aria-hidden="true" />
                {t({ vi: 'Khám phá ngay', en: 'Explore now' })}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link to="/huong-dan" className="hs-btn hs-btn-ghost">
                <BookOpenText size={17} weight="fill" aria-hidden="true" />
                {t({ vi: 'Hướng dẫn sử dụng', en: 'How it works' })}
              </Link>
            </div>
            {story && tr && (
              <div className="hh-player" aria-live="polite">
                {n.mode === 'audio' && <audio ref={n.bindAudio} src={n.audioSrc} preload="metadata" {...n.audioEvents} />}
                <div className="hh-player-row">
                  {n.mode !== 'none' && (
                    <button type="button" className="hh-play" onClick={toggle} aria-label={n.playing ? t({ vi: 'Tạm dừng', en: 'Pause' }) : t({ vi: 'Nghe thử', en: 'Hear the story' })}>
                      {n.playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
                    </button>
                  )}
                  <div className="hh-player-info">
                    <span className="hh-player-label">
                      {t({ vi: 'Nghe thử', en: 'Hear a story' })} · {minutes(tr.narration_text)} {t({ vi: 'phút', en: 'min' })}
                    </span>
                    <Link to={`/diem/${story.id}`} className="hh-player-title" title={t({ vi: 'Nghe trọn câu chuyện', en: 'Hear the full story' })}>
                      {poiTitle(story, lang)} <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                  <span className="hh-step">
                    <button type="button" className="hs-round" onClick={() => goTo(cur - 1)} aria-label={t({ vi: 'Câu chuyện trước', en: 'Previous story' })}>
                      <CaretLeft size={13} />
                    </button>
                    <span className="hs-count">
                      {cur + 1}/{stories.length}
                    </span>
                    <button type="button" className="hs-round" onClick={() => goTo(cur + 1)} aria-label={t({ vi: 'Câu chuyện tiếp theo', en: 'Next story' })}>
                      <CaretRight size={13} />
                    </button>
                  </span>
                </div>
                <div className="hs-progress" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <p className="sr-only">{excerpt(tr.narration_text)}</p>
                {n.mode === 'speech' && (
                  <p className="hs-note">{t({ vi: 'Đọc bằng giọng của trình duyệt. Trong app có file ghi âm và chạy cả khi mất mạng.', en: 'Read by your browser voice. The app has recorded audio and works offline.' })}</p>
                )}
                {n.error && <p className="hs-note hs-error">{n.error}</p>}
              </div>
            )}
            {error ? <LoadError message={error} onRetry={retry} /> : !data ? <Loading /> : null}
          </div>
        </div>

        <div className="hh-visual">
          <span className="hh-blob" aria-hidden="true" />
          <figure className="hh-photo">
            {photo && <img key={photo.src} src={photo.src} alt={photo.caption[ui]} fetchPriority="high" />}
            {photo && (
              <figcaption>
                {photo.caption[ui]}
                {photo.author && ` · ${t({ vi: 'Ảnh', en: 'Photo' })}: ${photo.author}`}
              </figcaption>
            )}
            {stories.length > 1 && (
              <div className="hh-dots" role="group" aria-label={t({ vi: 'Chọn câu chuyện', en: 'Choose a story' })}>
                {stories.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className={i === cur ? 'on' : ''}
                    aria-label={poiTitle(s, lang)}
                    aria-current={i === cur ? 'true' : undefined}
                    onClick={() => goTo(i)}
                  />
                ))}
              </div>
            )}
          </figure>
          {nextStory && nextPhoto && (
            <button type="button" className="hh-next" onClick={() => goTo(cur + 1)}>
              <img src={nextPhoto.src} alt="" />
              <span>
                <small>{t({ vi: 'Câu chuyện tiếp theo', en: 'Next story' })}</small>
                <strong>{poiTitle(nextStory, lang)}</strong>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <svg className="hh-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 C 300 20, 560 96, 860 70 C 1100 50, 1280 20, 1440 40 L1440 90 L0 90 Z" fill="#ffffff" />
        </svg>
      </section>

      {data && grid.length > 0 && (
        <section className="hs-section">
          <div className="wrap">
            <div className="hs-head">
              <div>
                <p className="hs-eyebrow">{t({ vi: 'Khám phá Quận 4', en: 'Explore District 4' })}</p>
                <h2 className="hs-h2">{t({ vi: 'Chọn điểm tiếp theo', en: 'Find your next stop' })}</h2>
              </div>
              <Link to="/diem" className="hs-more">
                {t({ vi: `Tất cả ${pois.length} điểm`, en: `All ${pois.length} places` })} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="hs-bento">
              {grid.map((p, i) => (
                <PlaceTile key={p.id} poi={p} big={i === 0} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data && data.qrcodes.length > 0 && (
        <section className="hs-qrband-wrap" id="ma-qr">
          <div className="wrap">
            <div className="hs-qrband">
              <img className="hs-qr-phone" src="/images/ai/phone-qr.png" alt="" width={329} height={420} loading="lazy" />
              <div className="hs-qr-copy">
                <h2 className="hs-h3">{t({ vi: 'Mã QR ở các trạm xe buýt', en: 'QR codes at bus stops' })}</h2>
                <p>
                  {t({
                    vi: `${data.qrcodes.length} mã đang dán ở trạm. Chỉ cần quét mã để nghe thuyết minh mọi lúc, mọi nơi.`,
                    en: `${data.qrcodes.length} codes are posted at stops. Scan one to hear the narration anytime, anywhere.`,
                  })}
                </p>
                <button type="button" className="hs-btn hs-btn-primary hs-btn-sm" aria-expanded={showQrList} aria-controls="ds-ma-qr" onClick={() => setShowQrList((v) => !v)}>
                  {showQrList ? t({ vi: 'Thu gọn', en: 'Hide list' }) : t({ vi: 'Xem danh sách', en: 'See the list' })} <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
              <ul className="hs-qr-mini">
                {data.qrcodes.map((q) => {
                  const poi = data.pois.find((p) => p.id === q.poi_id);
                  const name = poi ? poiTitle(poi, lang) : '';
                  const label = (q.label ?? name).replace(/^Trạm xe buýt\s+/i, '');
                  return (
                    <li key={q.payload}>
                      <Link to={`/q/${q.payload}`} title={t({ vi: `Mở trang nghe ${name}`, en: `Open ${name}` })}>
                        <QrImage text={qrLink(q.payload)} alt={t({ vi: `Mã QR nghe về ${name}`, en: `QR code for ${name}` })} />
                        <span>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            {showQrList && (
              <div id="ds-ma-qr" className="hs-qr-full">
                <StopQrList />
              </div>
            )}
          </div>
        </section>
      )}

      {data && data.tours.length > 0 && (
        <section className="hs-section">
          <div className="wrap">
            <div className="hs-head">
              <div>
                <p className="hs-eyebrow">{t({ vi: 'Gợi ý tour', en: 'Suggested tours' })}</p>
                <h2 className="hs-h2">{t({ vi: 'Đi theo tour', en: 'Follow a tour' })}</h2>
              </div>
              <Link to="/tour" className="hs-more">
                {t({ vi: 'Tất cả tour', en: 'All tours' })} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="hs-tours">
              {tourCovers(data.tours.slice(0, 6), data).map(([tour, cover]) => (
                <TourTile key={tour.id} tour={tour} data={data} cover={cover} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PlaceTile({ poi, big }: { poi: Poi; big: boolean }) {
  const { lang, ui } = useLang();
  const t = useT();
  const photo = poiPhoto(poi);
  return (
    <Link to={`/diem/${poi.id}`} className={`hs-tile${big ? ' hs-tile-big' : ''}`}>
      {photo && <img src={photo.src} alt={photo.caption[ui]} loading="lazy" />}
      {poi.price ? <span className="hs-price">{poi.price.toLocaleString('vi-VN')}đ</span> : null}
      <span className="hs-tile-body">
        {big && (
          <span className="hs-badge">
            <Star size={12} weight="fill" aria-hidden="true" /> {t({ vi: 'Điểm nổi bật', en: 'Featured' })}
          </span>
        )}
        <span className="hs-tile-title">{poiTitle(poi, lang)}</span>
        <span className="hs-tile-meta">
          <MapPin size={13} weight="fill" aria-hidden="true" /> {big ? `${ward(poi.address)}, Quận 4` : ward(poi.address)}
        </span>
      </span>
      <span className="hs-go" aria-hidden="true">
        <ArrowRight size={big ? 18 : 14} />
      </span>
    </Link>
  );
}

/** Ảnh bìa cho từng tour: lấy ảnh điểm đầu tiên chưa tour nào dùng, để các thẻ không trùng ảnh. */
function tourCovers(tours: Tour[], data: SyncData): [Tour, Photo | null][] {
  const used = new Set<string>();
  return tours.map((tour) => {
    const photos = tourStops(tour, data)
      .map((s) => poiPhoto(s))
      .filter((p): p is Photo => !!p);
    const cover = photos.find((p) => !used.has(p.src)) ?? photos[0] ?? null;
    if (cover) used.add(cover.src);
    return [tour, cover];
  });
}

function TourTile({ tour, data, cover }: { tour: Tour; data: SyncData; cover: Photo | null }) {
  const t = useT();
  const stops = tourStops(tour, data);
  const km = tourLength(stops) / 1000;
  const mins = Math.round((km / 4.5) * 60 + stops.length * 4);
  return (
    <Link to={`/tour/${tour.id}`} className="hs-tour">
      <span className="hs-tour-img">{cover && <img src={cover.src} alt="" />}</span>
      <span className="hs-tour-body">
        <span className="hs-tour-meta">
          <Clock size={13} weight="bold" aria-hidden="true" /> ~{mins} {t({ vi: 'phút', en: 'min' })} · {stops.length} {t({ vi: 'điểm', en: 'stops' })} · ~{km.toFixed(1)} km
        </span>
        <span className="hs-tour-title">{tour.name}</span>
        {tour.description && <span className="hs-tour-sub">{tour.description}</span>}
      </span>
      <span className="hs-go hs-go-light" aria-hidden="true">
        <ArrowRight size={14} />
      </span>
    </Link>
  );
}
