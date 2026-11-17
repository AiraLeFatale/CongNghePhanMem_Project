import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { ArrowRight, CheckCircle, Headphones, List, X } from '@phosphor-icons/react';
import { LANGS, useLang, useT } from '../lib/i18n';
import { useLivePresence } from '../lib/useLive';
import { LangSelect } from './LangSelect';
import { Flag } from './Flag';

export function Layout() {
  const t = useT();
  const { lang, setLang } = useLang();
  useLivePresence(lang);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
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
      <header className={`header${scrolled ? ' scrolled' : ''}`}>
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
            <Link to="/diem" className="header-cta">
              <Headphones size={17} weight="fill" aria-hidden="true" />
              {t({ vi: 'Nghe ngay', en: 'Listen now' })}
            </Link>
            <button type="button" className="menu-btn" aria-expanded={open} aria-label={open ? 'Đóng menu' : 'Mở menu'} onClick={() => setOpen((v) => !v)}>
              {open ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer ft">
        <div className="wrap">
          <section className="ft-cta" aria-labelledby="ft-cta-title">
            <span className="ft-cta-icon" aria-hidden="true">
              <Headphones size={26} weight="fill" />
            </span>
            <div className="ft-cta-copy">
              <h2 id="ft-cta-title">{t({ vi: 'Sẵn sàng khám phá Quận 4?', en: 'Ready to explore District 4?' })}</h2>
              <p>
                {t({
                  vi: 'Chọn một điểm để nghe ngay hoặc quét mã QR ở trạm xe buýt. Miễn phí, không cần tài khoản.',
                  en: 'Pick a place to listen now or scan a QR code at a bus stop. Free, no account needed.',
                })}
              </p>
            </div>
            <div className="ft-cta-actions">
              <Link to="/diem" className="ft-btn ft-btn-primary">
                {t({ vi: 'Xem các điểm', en: 'See all places' })} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link to="/huong-dan" className="ft-btn ft-btn-ghost">
                {t({ vi: 'Cách sử dụng', en: 'How it works' })}
              </Link>
            </div>
          </section>
        </div>

        <div className="wrap ft-grid">
          <div className="ft-brand">
            <Link to="/" className="ft-logo">
              <img src="/logo-light.png" alt="Thuyết minh Quận 4" width={381} height={150} loading="lazy" />
            </Link>
            <p>
              {t({
                vi: 'Thuyết minh tự động về bến cảng, cây cầu và khu chợ của Khánh Hội, Vĩnh Hội, Xóm Chiếu, nghe bằng 6 ngôn ngữ.',
                en: 'Audio stories about the wharves, bridges and markets of Khanh Hoi, Vinh Hoi and Xom Chieu, in 6 languages.',
              })}
            </p>
            <ul className="ft-badges">
              {[t({ vi: 'Miễn phí', en: 'Free' }), t({ vi: 'Không cần đăng ký', en: 'No sign-up' }), t({ vi: 'Nghe cả khi mất mạng (app)', en: 'Works offline (app)' })].map((b) => (
                <li key={b}>
                  <CheckCircle size={15} weight="fill" aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
          </div>
          <nav className="ft-col" aria-label={t({ vi: 'Khám phá', en: 'Explore' })}>
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
          <nav className="ft-col" aria-label={t({ vi: 'Hỗ trợ', en: 'Help' })}>
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
          <div className="ft-col ft-langs">
            <h2>{t({ vi: 'Nghe bằng 6 ngôn ngữ', en: 'Listen in 6 languages' })}</h2>
            <ul>
              {LANGS.map((l) => (
                <li key={l.code}>
                  <button type="button" lang={l.code} className={l.code === lang ? 'current' : ''} aria-pressed={l.code === lang} onClick={() => setLang(l.code)}>
                    <Flag code={l.code} />
                    <span>{l.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ft-bottom">
          <div className="wrap ft-bottom-inner">
            <span>
              © 2026 Thuyết minh Quận 4 · {t({ vi: 'Đồ án môn Công nghệ phần mềm', en: 'Software Engineering course project' })}
            </span>
            <span className="ft-legal">
              <Link to="/huong-dan#rieng-tu">{t({ vi: 'Quyền riêng tư', en: 'Privacy' })}</Link>
              <Link to="/nguon-anh">{t({ vi: 'Nguồn ảnh', en: 'Photo credits' })}</Link>
              <span>{t({ vi: 'Bản đồ © OpenStreetMap', en: 'Map data © OpenStreetMap' })}</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
