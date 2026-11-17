import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CaretLeft, CaretRight, DeviceMobile, Globe, Pause, Play, QrCode } from '@phosphor-icons/react';
import { LANGS, pickTranslation, poiTitle, useLang, useT } from '../lib/i18n';
import { useContent, useTitle } from '../lib/useContent';
import { poiPhoto } from '../lib/photos';
import { useNarration } from '../lib/useNarration';
import type { Poi } from '../lib/types';
import { LoadError, Loading } from '../components/States';
import { TourCard } from './ToursPage';
import { StopQrList } from '../components/StopQrList';
import '../home.css';

/** Đoạn mở đầu của bài thuyết minh, cắt ở ranh giới câu gần nhất. */
function excerpt(text: string, max = 190) {
  const s = text.trim().replace(/\s+/g, ' ');
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > 80 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Ước lượng thời lượng đọc (khoảng 150 từ mỗi phút). */
function minutes(text: string) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 150));
}

/** Trang chủ: phần đầu cho nghe thử ngay một câu chuyện, bên dưới là lưới điểm ảnh lớn. */
export function HomePage() {
  const t = useT();
  const { lang, ui } = useLang();
  useTitle('');
  const { data, error, retry } = useContent();
  const [idx, setIdx] = useState(0);

  const pois = data ? [...data.pois].sort((a, b) => b.priority - a.priority) : [];
  const stories = pois.filter((p) => poiPhoto(p) && pickTranslation(p, lang)?.narration_text.trim());
  const story = stories.length ? stories[idx % stories.length] : undefined;
  const tr = story ? pickTranslation(story, lang) : undefined;
  const n = useNarration(story?.id, tr, 'manual');
  const photo = story ? poiPhoto(story) : null;
  const pct = n.mode === 'audio' && n.duration ? (n.position / n.duration) * 100 : stories.length ? ((idx % stories.length) + 1) / stories.length * 100 : 0;

  const go = (d: number) => {
    n.pause();
    setIdx((i) => (i + d + stories.length) % stories.length);
  };
  const toggle = () => (n.playing ? n.pause() : n.play());

  const grid = pois.filter((p) => poiPhoto(p)).slice(0, 5);

  return (
    <div className="hs">
      <section className="hs-hero">
        <div className="wrap hs-hero-grid">
          <div className="hs-copy">
            <p className="hs-eyebrow">{t({ vi: 'Thuyết minh Quận 4 · 6 ngôn ngữ', en: 'District 4 audio guide · 6 languages' })}</p>
            <h1 className="hs-title">{t({ vi: 'Đi tới đâu. Nghe tới đó.', en: 'Walk on. Hear the story.' })}</h1>
            <p className="hs-lead">
              {t({
                vi: 'Bến cảng, cây cầu và khu chợ của Khánh Hội, Vĩnh Hội, Xóm Chiếu tự kể chuyện của mình. Quét mã ở trạm xe buýt hoặc mở app là nghe, không cần đăng ký.',
                en: 'The wharves, bridges and markets of Khanh Hoi, Vinh Hoi and Xom Chieu tell their own stories. Scan the code at a bus stop or open the app. No sign-up.',
              })}
            </p>
            <div className="hs-cta">
              <Link to="/diem" className="hs-btn hs-btn-primary">
                {t({ vi: 'Xem các điểm', en: 'Browse places' })}
              </Link>
              {story && tr && n.mode !== 'none' && (
                <button type="button" className="hs-btn hs-btn-ghost" onClick={toggle}>
                  {n.playing ? <Pause size={16} weight="fill" aria-hidden="true" /> : <Play size={16} weight="fill" aria-hidden="true" />}
                  {n.playing ? t({ vi: 'Tạm dừng', en: 'Pause' }) : t({ vi: 'Nghe thử', en: 'Hear the story' })}
                  <span className="hs-dur"> · {minutes(tr.narration_text)} {t({ vi: 'phút', en: 'min' })}</span>
                </button>
              )}
            </div>

            {error ? (
              <LoadError message={error} onRetry={retry} />
            ) : !data ? (
              <Loading />
            ) : story && tr ? (
              <div className="hs-story" aria-live="polite">
                {n.mode === 'audio' && <audio ref={n.bindAudio} src={n.audioSrc} preload="metadata" {...n.audioEvents} />}
                <p className="hs-story-label">
                  {t({ vi: 'Câu chuyện có thật', en: 'A real story' })} · {poiTitle(story, lang)}
                </p>
                <p className="hs-story-text">{excerpt(tr.narration_text)}</p>
                <Link to={`/diem/${story.id}`} className="hs-link">
                  {t({ vi: 'Nghe trọn câu chuyện', en: 'Hear the full story' })} <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <div className="hs-stepper">
                  <button type="button" className="hs-round" onClick={() => go(-1)} aria-label={t({ vi: 'Câu chuyện trước', en: 'Previous story' })}>
                    <CaretLeft size={16} />
                  </button>
                  <span className="hs-count">
                    {(idx % stories.length) + 1} / {stories.length}
                  </span>
                  <button type="button" className="hs-round" onClick={() => go(1)} aria-label={t({ vi: 'Câu chuyện tiếp theo', en: 'Next story' })}>
                    <CaretRight size={16} />
                  </button>
                  <button type="button" className="hs-round" onClick={toggle} aria-label={n.playing ? t({ vi: 'Tạm dừng', en: 'Pause' }) : t({ vi: 'Phát', en: 'Play' })}>
                    {n.playing ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
                  </button>
                </div>
                <div className="hs-progress" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <p className="hs-note">
                  {n.mode === 'speech'
                    ? t({ vi: 'Đọc bằng giọng của trình duyệt. Trong app có file ghi âm và chạy cả khi mất mạng.', en: 'Read by your browser voice. The app has recorded audio and works offline.' })
                    : t({ vi: `Bấm phát để nghe câu chuyện về ${poiTitle(story, lang)}.`, en: `Tap play to hear the story of ${poiTitle(story, lang)}.` })}
                </p>
                {n.error && <p className="hs-note hs-error">{n.error}</p>}
              </div>
            ) : null}
          </div>

          <figure className="hs-photo">
            {photo && <img key={photo.src} src={photo.src} alt={photo.caption[ui]} fetchPriority="high" />}
            {photo && (
              <figcaption>
                {photo.caption[ui]}
                {photo.author && ` · ${t({ vi: 'Ảnh', en: 'Photo' })}: ${photo.author}`}
              </figcaption>
            )}
          </figure>
        </div>
      </section>

      {data && grid.length > 0 && (
        <section className="hs-places">
          <div className="wrap">
            <div className="hs-head">
              <h2 className="hs-h2">{t({ vi: 'Chọn điểm tiếp theo', en: 'Find your next stop' })}</h2>
              <div className="hs-head-side">
                <p>{t({ vi: 'Nghe trước khi đi, hoặc mở ngay khi đang đứng trước công trình.', en: 'Listen before you go, or right when you are standing in front of it.' })}</p>
                <div className="hs-head-links">
                  <Link to="/diem" className="hs-link">
                    {t({ vi: `Tất cả ${pois.length} điểm`, en: `All ${pois.length} places` })} <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  <Link to="/tour" className="hs-link">
                    {t({ vi: 'Đi theo tour', en: 'Follow a tour' })} <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="hs-grid">
              {grid.map((p, i) => (
                <StopCard key={p.id} poi={p} big={i === 0} />
              ))}
            </div>
          </div>
        </section>
      )}

      {data && data.qrcodes.length > 0 && (
        <section className="hs-qr" id="ma-qr">
          <div className="wrap">
            <div className="hs-head">
              <h2 className="hs-h2">{t({ vi: 'Mã QR ở các trạm xe buýt', en: 'QR codes at bus stops' })}</h2>
              <div className="hs-head-side">
                <p>
                  {t({
                    vi: `${data.qrcodes.length} mã đang dán ở trạm. Đưa camera điện thoại vào mã trên màn hình này để thử ngay, hoặc gõ mã nhập tay trong app.`,
                    en: `${data.qrcodes.length} codes are posted at stops. Point your phone camera at a code on this screen to try it, or type the manual code in the app.`,
                  })}
                </p>
              </div>
            </div>
            <StopQrList />
          </div>
        </section>
      )}

      <section className="hs-ways">
        <div className="wrap">
          <h2 className="hs-h2">{t({ vi: 'Ba cách để nghe', en: 'Three ways to listen' })}</h2>
          <ol className="hs-ways-list">
            <li>
              <QrCode size={26} aria-hidden="true" />
              <h3>{t({ vi: 'Quét mã ở trạm xe buýt', en: 'Scan the code at a bus stop' })}</h3>
              <p>{t({ vi: 'Mở camera điện thoại, hướng vào mã dán ở trạm, chạm vào đường link hiện ra. Không cần cài app.', en: 'Open your phone camera, point it at the code at the stop and tap the link. No app needed.' })}</p>
              <Link to="/huong-dan#quet-qr" className="hs-link">
                {t({ vi: 'Xem cách quét', en: 'How to scan' })} <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <DeviceMobile size={26} aria-hidden="true" />
              <h3>{t({ vi: 'Tự phát khi đi tới', en: 'Plays as you arrive' })}</h3>
              <p>{t({ vi: 'Với app, thuyết minh tự bắt đầu khi bạn bước vào khu vực của một điểm, kể cả khi không có mạng.', en: 'With the app, narration starts on its own when you walk into a place, even offline.' })}</p>
            </li>
            <li>
              <Globe size={26} aria-hidden="true" />
              <h3>{t({ vi: 'Nghe ngay trên web', en: 'Listen on the web' })}</h3>
              <p>{t({ vi: 'Chọn một điểm trên trang này để nghe trước chuyến đi, hoặc nghe lại sau khi về.', en: 'Pick a place here to listen before your trip, or again afterwards.' })}</p>
            </li>
          </ol>
        </div>
      </section>

      {data && data.tours.length > 0 && (
        <section className="hs-tours">
          <div className="wrap">
            <div className="hs-head">
              <h2 className="hs-h2">{t({ vi: 'Đi theo tour', en: 'Follow a tour' })}</h2>
              <div className="hs-head-side">
                <Link to="/tour" className="hs-link">
                  {t({ vi: 'Tất cả tour', en: 'All tours' })} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="tour-grid">
              {data.tours.map((tour) => (
                <TourCard key={tour.id} tour={tour} data={data} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="hs-langs">
        <div className="wrap hs-langs-inner">
          <h2 className="hs-h2">{t({ vi: 'Nghe bằng ngôn ngữ của bạn', en: 'Listen in your language' })}</h2>
          <ul>
            {LANGS.map((l) => (
              <li key={l.code} lang={l.code}>
                {l.label}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function StopCard({ poi, big }: { poi: Poi; big: boolean }) {
  const { lang, ui } = useLang();
  const t = useT();
  const photo = poiPhoto(poi);
  const langs = LANGS.filter((l) => poi.translations.some((x) => x.language_code === l.code && x.narration_text.trim()));
  return (
    <Link to={`/diem/${poi.id}`} className={`hs-card${big ? ' hs-card-big' : ''}`}>
      {photo && <img src={photo.src} alt={photo.caption[ui]} loading="lazy" />}
      <span className="hs-card-body">
        <span className="hs-card-meta">
          {poi.address ? `${poi.address.split(',')[0]} · ` : ''}
          {langs.length} {t({ vi: 'ngôn ngữ', en: langs.length === 1 ? 'language' : 'languages' })}
        </span>
        <span className="hs-card-title">{poiTitle(poi, lang)}</span>
        {poi.price ? <span className="hs-price">{poi.price.toLocaleString('vi-VN')}đ</span> : null}
        {big && photo && <span className="hs-card-sub">{photo.caption[ui]}</span>}
      </span>
    </Link>
  );
}
