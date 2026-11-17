import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { List, SpeakerHigh, X } from '@phosphor-icons/react';
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
            <span className="logo-mark" aria-hidden="true">
              <SpeakerHigh size={16} weight="fill" />
            </span>
            <span>
              Thuyết minh <b>Quận 4</b>
            </span>
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
          <div>
            <Link to="/" className="logo logo-footer">
              <span className="logo-mark" aria-hidden="true">
                <SpeakerHigh size={16} weight="fill" />
              </span>
              <span>
                Thuyết minh <b>Quận 4</b>
              </span>
            </Link>
            <p className="footer-note">
              {t({
                vi: 'Thuyết minh tự động đa ngôn ngữ cho khách tham quan và hành khách xe buýt ở các phường Khánh Hội, Vĩnh Hội, Xóm Chiếu.',
                en: 'Automatic multilingual narration for visitors and bus passengers in Khanh Hoi, Vinh Hoi and Xom Chieu wards.',
              })}
            </p>
          </div>
          <div>
            <h2>{t({ vi: 'Khám phá', en: 'Explore' })}</h2>
            <ul>
              <li>
                <Link to="/diem">{t({ vi: 'Điểm thuyết minh', en: 'Places' })}</Link>
              </li>
              <li>
                <Link to="/tour">{t({ vi: 'Tour gợi ý', en: 'Tours' })}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>{t({ vi: 'Hỗ trợ', en: 'Help' })}</h2>
            <ul>
              <li>
                <Link to="/huong-dan">{t({ vi: 'Hướng dẫn sử dụng', en: 'How it works' })}</Link>
              </li>
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
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>{t({ vi: 'Đồ án môn Công nghệ phần mềm', en: 'Software Engineering course project' })}</span>
          <span>{t({ vi: 'Bản đồ: © OpenStreetMap', en: 'Map data: © OpenStreetMap' })}</span>
        </div>
      </footer>
    </div>
  );
}
