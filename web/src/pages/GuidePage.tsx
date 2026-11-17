import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useT } from '../lib/i18n';
import { useTitle } from '../lib/useContent';

const TOC = [
  { id: 'quet-qr', vi: 'Quét mã QR ở trạm xe buýt', en: 'Scan a QR code at a bus stop' },
  { id: 'nghe-tren-web', vi: 'Nghe trên website', en: 'Listen on the website' },
  { id: 'ung-dung', vi: 'Dùng ứng dụng điện thoại', en: 'Use the mobile app' },
  { id: 'cau-hoi', vi: 'Câu hỏi thường gặp', en: 'FAQ' },
  { id: 'rieng-tu', vi: 'Quyền riêng tư', en: 'Privacy' },
  { id: 'quan-tri', vi: 'Dành cho đơn vị quản lý nội dung', en: 'For content managers' },
];

export function GuidePage() {
  const t = useT();
  const { hash } = useLocation();
  useTitle(t({ vi: 'Hướng dẫn sử dụng', en: 'How it works' }));
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="wrap section guide">
      <h1 className="page-title">{t({ vi: 'Hướng dẫn sử dụng', en: 'How it works' })}</h1>
      <p className="lead">
        {t({
          vi: 'Có 3 cách nghe thuyết minh: quét mã QR, mở website hoặc dùng ứng dụng. Cả 3 cách đều miễn phí và không cần tài khoản.',
          en: 'There are three ways to listen: scan a QR code, open the website or use the app. All are free and need no account.',
        })}
      </p>
      <div className="guide-layout">
        <nav className="toc" aria-label={t({ vi: 'Mục lục', en: 'Contents' })}>
          <ul>
            {TOC.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{t(s)}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="guide-body">
          <section id="quet-qr">
            <h2>{t(TOC[0])}</h2>
            <ol className="steps">
              <li>
                <strong>{t({ vi: 'Mở camera điện thoại', en: 'Open your phone camera' })}</strong>
                <p>
                  {t({
                    vi: 'iPhone và hầu hết điện thoại Android đọc được mã QR ngay trong camera. Một số máy Android cần mở Google Lens hoặc ứng dụng Zalo (mục Quét mã).',
                    en: 'iPhones and most Android phones read QR codes in the built-in camera. Some Android phones need Google Lens.',
                  })}
                </p>
              </li>
              <li>
                <strong>{t({ vi: 'Hướng vào mã dán ở trạm và chạm vào đường link', en: 'Point at the code and tap the link' })}</strong>
                <p>
                  {t({
                    vi: 'Trang của điểm gần trạm sẽ mở trên trình duyệt, có dòng "Bạn vừa quét mã tại…" để bạn biết đã quét đúng chỗ.',
                    en: 'The page for the nearby place opens in your browser, with a line saying where you scanned.',
                  })}
                </p>
              </li>
              <li>
                <strong>{t({ vi: 'Chọn ngôn ngữ và bấm nút phát', en: 'Choose a language and press play' })}</strong>
                <p>
                  {t({
                    vi: 'Trình phát nằm ở cuối màn hình. Có thể lùi, tới 15 giây và đổi tốc độ. Nội dung chữ hiện ngay bên dưới để đọc khi ở nơi ồn.',
                    en: 'The player sits at the bottom of the screen with 15-second skip and speed control. The full text is on the page for noisy places.',
                  })}
                </p>
              </li>
            </ol>
          </section>

          <section id="nghe-tren-web">
            <h2>{t(TOC[1])}</h2>
            <p>
              {t({ vi: 'Vào mục', en: 'Go to' })} <Link to="/diem">{t({ vi: 'Điểm thuyết minh', en: 'Places' })}</Link>{' '}
              {t({
                vi: 'để chọn một điểm, hoặc mục',
                en: 'to pick a place, or',
              })}{' '}
              <Link to="/tour">{t({ vi: 'Tour gợi ý', en: 'Tours' })}</Link>{' '}
              {t({
                vi: 'để đi theo lộ trình có sẵn. Trong tour, cuối mỗi trang có nút "Điểm tiếp theo".',
                en: 'to follow a ready-made route. Each tour stop has a "Next stop" link at the bottom.',
              })}
            </p>
            <p>
              {t({
                vi: 'Điểm nào đã có file thu âm thì phát file đó. Điểm chưa có thu âm sẽ được đọc bằng giọng đọc có sẵn trên điện thoại, nên chất lượng giọng tuỳ máy.',
                en: 'Places with a recording play that file. Others are read aloud by your device’s built-in voice, so quality depends on the device.',
              })}
            </p>
          </section>

          <section id="ung-dung">
            <h2>{t(TOC[2])}</h2>
            <p>
              {t({
                vi: 'Ứng dụng tải sẵn toàn bộ nội dung khi có mạng, sau đó dùng được cả khi mất sóng. Khi bạn đi vào vòng bán kính của một điểm, thuyết minh tự phát; nếu 2 điểm chồng nhau, điểm có mức ưu tiên cao hơn được phát trước.',
                en: 'The app downloads all content while online and then works offline. Walk into a place’s radius and narration starts; if two places overlap, the higher-priority one plays first.',
              })}
            </p>
            <ul className="bullets">
              <li>{t({ vi: 'Cho phép quyền vị trí để tự phát theo GPS.', en: 'Allow location access for automatic playback.' })}</li>
              <li>{t({ vi: 'Nút "Quét QR" trong app đọc được cùng mã dán ở trạm xe buýt.', en: 'The in-app "Scan QR" reads the same codes as the bus stops.' })}</li>
              <li>{t({ vi: 'Ứng dụng đang ở giai đoạn thử nghiệm và chưa có trên kho ứng dụng.', en: 'The app is in testing and not yet in the app stores.' })}</li>
            </ul>
          </section>

          <section id="cau-hoi">
            <h2>{t(TOC[3])}</h2>
            <div className="faq">
              {[
                {
                  q: { vi: 'Có mất phí không?', en: 'Is it free?' },
                  a: { vi: 'Không. Bạn chỉ tốn dữ liệu di động để tải trang và file audio.', en: 'Yes. You only use mobile data to load the page and audio.' },
                },
                {
                  q: { vi: 'Quét mã mà không thấy gì xảy ra?', en: 'Nothing happens when I scan?' },
                  a: {
                    vi: 'Giữ điện thoại cách mã 20 đến 40 cm, đủ sáng, và chờ đường link hiện ra rồi chạm vào. Nếu camera không hỗ trợ, dùng Google Lens hoặc Zalo.',
                    en: 'Hold the phone 20 to 40 cm away in good light and wait for the link to appear, then tap it. If your camera cannot read QR codes, use Google Lens.',
                  },
                },
                {
                  q: { vi: 'Bấm phát mà không có tiếng?', en: 'I press play but hear nothing?' },
                  a: {
                    vi: 'Kiểm tra nút gạt im lặng (iPhone) và âm lượng. Nếu điểm dùng giọng đọc của máy, một số trình duyệt cần tải giọng tiếng Việt trong phần cài đặt ngôn ngữ.',
                    en: 'Check the silent switch and volume. For device-voice stops, some browsers need the voice for that language installed.',
                  },
                },
                {
                  q: { vi: 'Ngôn ngữ của tôi không bấm được?', en: 'My language is greyed out?' },
                  a: {
                    vi: 'Điểm đó chưa có bản dịch sang ngôn ngữ này. Trang sẽ hiển thị tiếng Anh hoặc tiếng Việt thay thế.',
                    en: 'That place has not been translated into your language yet. The page shows English or Vietnamese instead.',
                  },
                },
              ].map((f) => (
                <details key={f.q.vi}>
                  <summary>{t(f.q)}</summary>
                  <p>{t(f.a)}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="rieng-tu">
            <h2>{t(TOC[4])}</h2>
            <p>
              {t({
                vi: 'Hệ thống không yêu cầu tên, số điện thoại hay tài khoản. Khi bạn nghe, chỉ ghi lại điểm đã nghe, ngôn ngữ, thời lượng nghe và một mã phiên ngẫu nhiên (xoá khi đóng tab). Ứng dụng gửi thêm vị trí đã làm tròn khoảng 11 m để vẽ bản đồ nhiệt, không gắn với danh tính.',
                en: 'No name, phone number or account is needed. When you listen we record only the place, language, listening time and a random session code (cleared when you close the tab). The app also sends locations rounded to about 11 m for a heat map, never tied to your identity.',
              })}
            </p>
          </section>

          <section id="quan-tri">
            <h2>{t(TOC[5])}</h2>
            <p>
              {t({
                vi: 'Nội dung trên trang được quản lý trong hệ thống quản trị (CMS) dành cho cán bộ phụ trách. Các việc chính:',
                en: 'Content is managed in a CMS for staff. The main tasks:',
              })}
            </p>
            <ol className="steps steps-compact">
              <li>
                <strong>{t({ vi: 'Thêm điểm thuyết minh', en: 'Add a place' })}</strong>
                <p>{t({ vi: 'Bấm lên bản đồ để đặt vị trí, nhập bán kính kích hoạt và mức ưu tiên, viết nội dung tiếng Việt.', en: 'Click the map to place it, set the trigger radius and priority, write the Vietnamese text.' })}</p>
              </li>
              <li>
                <strong>{t({ vi: 'Dịch và tạo giọng đọc', en: 'Translate and generate audio' })}</strong>
                <p>{t({ vi: 'Nút "Dịch tất cả ngôn ngữ còn trống" dịch tự động; nút "Tạo giọng đọc (TTS)" tạo file audio, hoặc tải lên file thu âm.', en: '"Translate all empty languages" fills translations; "Generate voice (TTS)" makes audio, or upload a recording.' })}</p>
              </li>
              <li>
                <strong>{t({ vi: 'Tạo và in mã QR', en: 'Create and print QR codes' })}</strong>
                <p>{t({ vi: 'Ở trang của điểm, nhập tên trạm rồi bấm "Tạo mã QR". Mục "Mã QR trạm xe" in nhiều mã một lần trên khổ A4.', en: 'On the place page, enter the stop name and create a code. "QR codes" prints many codes on A4.' })}</p>
              </li>
              <li>
                <strong>{t({ vi: 'Xem thống kê', en: 'Review statistics' })}</strong>
                <p>{t({ vi: 'Lượt nghe, thời gian nghe, ngôn ngữ, cách kích hoạt và bản đồ nhiệt; xuất Excel hoặc PDF.', en: 'Plays, listening time, languages, triggers and heat map; export to Excel or PDF.' })}</p>
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
