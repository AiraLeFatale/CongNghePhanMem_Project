import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { List, X } from '@phosphor-icons/react';
import { useLang, useT } from '../lib/i18n';
import { useLivePresence } from '../lib/useLive';
import { LangSelect } from './LangSelect';

export function Layout() {
  const t = useT();
  const { lang } = useLang();
  useLivePresence(lang);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const nav = [
    { to: '/diem', label: t({ vi: 'Điểm thuyết minh', en: 'Places' }) },
    { to: '/tour', label: t({ vi: 'Tour gợi ý', en: 'Tours' }) },
    { to: '/huong-dan', label: t({ vi: 'Hướng dẫn', en: 'How it works' }) },
  ];

  return (
    <div className="site">
      <a href="#main" className="skip-link">
        {t({ vi: 'Bỏ qua tới nội dung', en: 'Skip to content' })}
      </a>
      <header className="header">
        <div className="wrap header-inner">
          <Link to="/" className="logo">
            <img src="/logo.png" alt="Thuyết minh Quận 4" className="logo-img" width={381} height={150} />
          </Link>
          <nav className={`nav${open ? ' open' : ''}`} aria-label={t({ vi: 'Điều hướng chính', en: 'Main navigation' })}>
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-tools">
            <LangSelect />
            <button type="button" className="menu-btn" aria-expanded={open} aria-label={open ? 'Đóng menu' : 'Mở menu'} onClick={() => setOpen((v) => !v)}>
              {open ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="wrap footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo logo-footer">
              <img src="/logo.png" alt="Thuyết minh Quận 4" className="logo-img" width={381} height={150} loading="lazy" />
            </Link>
            <p className="footer-note">
              {t({
                vi: 'Thuyết minh tự động đa ngôn ngữ cho khách tham quan và hành khách xe buýt ở các phường Khánh Hội, Vĩnh Hội, Xóm Chiếu.',
                en: 'Automatic multilingual narration for visitors and bus passengers in Khanh Hoi, Vinh Hoi and Xom Chieu wards.',
              })}
            </p>
            <ul className="footer-badges">
              <li>{t({ vi: 'Miễn phí', en: 'Free' })}</li>
              <li>{t({ vi: '6 ngôn ngữ', en: '6 languages' })}</li>
              <li>{t({ vi: 'Không cần tài khoản', en: 'No sign-up' })}</li>
            </ul>
          </div>
          <nav aria-label={t({ vi: 'Khám phá', en: 'Explore' })}>
            <h2>{t({ vi: 'Khám phá', en: 'Explore' })}</h2>
            <ul>
              <li>
                <Link to="/diem">{t({ vi: 'Điểm thuyết minh', en: 'Places' })}</Link>
              </li>
              <li>
                <Link to="/tour">{t({ vi: 'Tour gợi ý', en: 'Tours' })}</Link>
              </li>
              <li>
                <Link to="/huong-dan">{t({ vi: 'Hướng dẫn sử dụng', en: 'How it works' })}</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label={t({ vi: '3 cách nghe', en: '3 ways to listen' })}>
            <h2>{t({ vi: '3 cách nghe', en: '3 ways to listen' })}</h2>
            <ul>
              <li>
                <Link to="/huong-dan#quet-qr">{t({ vi: 'Quét mã QR tại trạm xe buýt', en: 'Scan the QR at a bus stop' })}</Link>
              </li>
              <li>
                <Link to="/huong-dan#ung-dung">{t({ vi: 'Tự phát bằng ứng dụng', en: 'Auto-play with the app' })}</Link>
              </li>
              <li>
                <Link to="/huong-dan#nghe-tren-web">{t({ vi: 'Nghe ngay trên web', en: 'Listen on the web' })}</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label={t({ vi: 'Hỗ trợ', en: 'Help' })}>
            <h2>{t({ vi: 'Hỗ trợ', en: 'Help' })}</h2>
            <ul>
              <li>
                <Link to="/huong-dan#cau-hoi">{t({ vi: 'Câu hỏi thường gặp', en: 'FAQ' })}</Link>
              </li>
              <li>
                <Link to="/huong-dan#rieng-tu">{t({ vi: 'Quyền riêng tư', en: 'Privacy' })}</Link>
              </li>
              <li>
                <Link to="/nguon-anh">{t({ vi: 'Nguồn ảnh', en: 'Photo credits' })}</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="wrap footer-bottom">
          <span>
            © 2026 Thuyết minh Quận 4 · {t({ vi: 'Đồ án môn Công nghệ phần mềm', en: 'Software Engineering course project' })}
          </span>
          <span>{t({ vi: 'Bản đồ: © OpenStreetMap', en: 'Map data: © OpenStreetMap' })}</span>
        </div>
      </footer>
    </div>
  );
}
