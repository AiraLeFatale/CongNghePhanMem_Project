import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { List, X } from '@phosphor-icons/react';
import { LANGS, useLang, useT } from '../lib/i18n';
import { useLivePresence } from '../lib/useLive';
import { LangSelect } from './LangSelect';
import { FooterWave } from './HomeArt';

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
    { to: '/', label: t({ vi: 'Trang chủ', en: 'Home' }) },
    { to: '/diem', label: t({ vi: 'Điểm thuyết minh', en: 'Places' }) },
    { to: '/tour', label: t({ vi: 'Tour gợi ý', en: 'Tours' }) },
    { to: '/huong-dan', label: t({ vi: 'Hướng dẫn', en: 'How it works' }) },
  ];

  return (
    <div className={`site${pathname === '/' ? ' site-home' : ''}`}>
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
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
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
        <FooterWave className="footer-wave" />
        <div className="footer-main">
          <div className="wrap footer-grid">
            <div className="footer-brand">
              <Link to="/" className="logo logo-footer">
                <img src="/logo-light.png" alt="Thuyết minh Quận 4" className="logo-img" width={381} height={150} />
              </Link>
              <p className="footer-tagline">{t({ vi: 'Khám phá Quận 4 – Lan tỏa giá trị lịch sử', en: 'Discover District 4 – Share its history' })}</p>
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
                  <Link to="/huong-dan#quet-qr">{t({ vi: 'Quét mã QR tại trạm', en: 'Scan a bus-stop QR' })}</Link>
                </li>
              </ul>
            </nav>
            <nav aria-label={t({ vi: 'Hỗ trợ', en: 'Help' })}>
              <h2>{t({ vi: 'Hỗ trợ', en: 'Help' })}</h2>
              <ul>
                <li>
                  <Link to="/huong-dan">{t({ vi: 'Hướng dẫn sử dụng', en: 'How it works' })}</Link>
                </li>
                <li>
                  <Link to="/huong-dan#cau-hoi">{t({ vi: 'Câu hỏi thường gặp', en: 'FAQ' })}</Link>
                </li>
                <li>
                  <Link to="/huong-dan#ung-dung">{t({ vi: 'Ứng dụng di động', en: 'Mobile app' })}</Link>
                </li>
              </ul>
            </nav>
            <div className="footer-langs">
              <h2>{t({ vi: 'Nghe bằng 6 ngôn ngữ', en: 'Listen in 6 languages' })}</h2>
              <ul>
                {LANGS.map((l) => (
                  <li key={l.code} lang={l.code}>
                    {l.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="wrap footer-bottom-inner">
            <span>
              © 2026 Thuyết minh Quận 4 · {t({ vi: 'Đồ án môn Công nghệ phần mềm', en: 'Software Engineering course project' })}
            </span>
            <span className="footer-legal">
              <Link to="/huong-dan#rieng-tu">{t({ vi: 'Quyền riêng tư', en: 'Privacy' })}</Link>
              <Link to="/nguon-anh">{t({ vi: 'Nguồn ảnh', en: 'Photo credits' })}</Link>
              <span>{t({ vi: 'Bản đồ: © OpenStreetMap', en: 'Map data: © OpenStreetMap' })}</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
