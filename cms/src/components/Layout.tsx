import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './Icon';

const LOGO = `${import.meta.env.BASE_URL}logo.png`;
const LOGO_LIGHT = `${import.meta.env.BASE_URL}logo-light.png`;

const NAV_GROUPS: { title?: string; items: { to: string; label: string; icon: string; end?: boolean }[] }[] = [
  { items: [{ to: '/', label: 'Tổng quan', icon: 'home', end: true }] },
  {
    title: 'Nội dung',
    items: [
      { to: '/pois', label: 'Điểm thuyết minh', icon: 'pin' },
      { to: '/tours', label: 'Tour tham quan', icon: 'route' },
      { to: '/qr', label: 'Mã QR trạm xe', icon: 'qr' },
    ],
  },
  {
    title: 'Báo cáo',
    items: [
      { to: '/analytics', label: 'Thống kê sử dụng', icon: 'chart' },
      { to: '/orders', label: 'Thanh toán', icon: 'wallet' },
    ],
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts.length > 1 ? parts[0] : '';
  const last = parts[parts.length - 1] ?? '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || '?';
}

export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const displayName = user?.full_name || user?.username || 'Tài khoản';

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className={`shell${open ? ' nav-open' : ''}`}>
      <a href="#main" className="skip-link">
        Bỏ qua tới nội dung chính
      </a>
      <header className="topbar">
        <button
          type="button"
          className="icon-btn"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'x' : 'menu'} size={20} />
        </button>
        <a href="/" target="_blank" rel="noopener" className="brand-home" title="Mở trang chủ website (tab mới)">
          <img src={LOGO} alt="Thuyết minh Quận 4 – mở trang chủ" className="brand-logo-top" width={381} height={150} />
        </a>
      </header>
      <aside id="sidebar" className="sidebar">
        <div className="brand">
          <a href="/" target="_blank" rel="noopener" className="brand-home" title="Mở trang chủ website (tab mới)">
            <img src={LOGO_LIGHT} alt="Thuyết minh Quận 4 – mở trang chủ" className="brand-logo" width={381} height={150} />
          </a>
        </div>
        <nav aria-label="Điều hướng chính" className="nav-groups">
          {NAV_GROUPS.map((g, i) => (
            <div key={i} className="nav-group">
              {g.title && <p className="nav-heading">{g.title}</p>}
              <ul className="nav">
                {g.items.map((n) => (
                  <li key={n.to}>
                    <NavLink to={n.to} end={n.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                      <Icon name={n.icon} size={17} />
                      <span>{n.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="nav-group">
            <p className="nav-heading">Website</p>
            <ul className="nav">
              <li>
                <a href="/" target="_blank" rel="noopener" className="nav-link">
                  <Icon name="globe" size={17} />
                  <span>Xem trang chủ</span>
                  <Icon name="external" size={13} className="nav-ext" />
                </a>
              </li>
            </ul>
          </div>
        </nav>
        <SidebarSkyline />
        <div className="sidebar-footer">
          <NavLink to="/account" className={({ isActive }) => `user-chip${isActive ? ' active' : ''}`}>
            <span className="avatar" aria-hidden="true">
              {initials(displayName)}
            </span>
            <span className="user-meta">
              <span className="truncate">{displayName}</span>
              <small className="truncate">{user?.username ? `Quản trị viên · ${user.username}` : 'Quản trị viên'}</small>
            </span>
          </NavLink>
          <button type="button" className="icon-btn" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất">
            <Icon name="logout" size={17} />
          </button>
        </div>
      </aside>
      <div className="backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

/** Hình cầu dây văng và nhà cao tầng nét mảnh ở chân thanh bên. */
function SidebarSkyline() {
  const cables = [];
  for (const px of [70, 170]) {
    for (let i = 1; i <= 6; i++) {
      cables.push(<line key={`${px}l${i}`} x1={px} y1={22 + i * 3} x2={px - i * 12} y2={78} />);
      cables.push(<line key={`${px}r${i}`} x1={px} y1={22 + i * 3} x2={px + i * 12} y2={78} />);
    }
  }
  const towers = [[8, 46, 14], [24, 34, 12], [196, 40, 14], [212, 28, 12], [226, 50, 14]];
  return (
    <svg className="sidebar-skyline" viewBox="0 0 240 96" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        {towers.map(([x, y, w]) => (
          <rect key={x} x={x} y={y} width={w} height={96 - y} />
        ))}
      </g>
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.8">
        {cables}
      </g>
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M70 16 L67 84 M70 16 L73 84 M170 16 L167 84 M170 16 L173 84" />
        <path d="M0 78 Q 120 72 240 78" />
      </g>
      <path d="M0 90 Q 120 84 240 92" stroke="currentColor" strokeOpacity="0.5" />
    </svg>
  );
}
