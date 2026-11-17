import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './Icon';

const LOGO = `${import.meta.env.BASE_URL}logo.png`;

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
        <img src={LOGO} alt="Thuyết minh Quận 4" className="brand-logo-top" width={381} height={150} />
      </header>
      <aside id="sidebar" className="sidebar">
        <div className="brand">
          <img src={LOGO} alt="Thuyết minh Quận 4" className="brand-logo" width={381} height={150} />
          <small>Quản trị nội dung</small>
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
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/account" className={({ isActive }) => `user-chip${isActive ? ' active' : ''}`}>
            <span className="avatar" aria-hidden="true">
              {initials(displayName)}
            </span>
            <span className="user-meta">
              <span className="truncate">{displayName}</span>
              {user?.username && <small className="truncate">{user.username}</small>}
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
