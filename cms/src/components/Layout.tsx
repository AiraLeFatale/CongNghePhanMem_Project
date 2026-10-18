import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './Icon';

const NAV = [
  { to: '/', label: 'Tổng quan', icon: 'home', end: true },
  { to: '/pois', label: 'Điểm thuyết minh', icon: 'pin' },
  { to: '/tours', label: 'Tour tham quan', icon: 'route' },
  { to: '/qr', label: 'Mã QR', icon: 'qr' },
  { to: '/analytics', label: 'Thống kê', icon: 'chart' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

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
          <Icon name={open ? 'x' : 'menu'} size={22} />
        </button>
        <span className="brand-text">Thuyết minh Quận 4</span>
      </header>
      <aside id="sidebar" className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="speaker" size={20} />
          </span>
          <span>
            <strong>Thuyết minh Quận 4</strong>
            <small>Hệ thống quản trị nội dung</small>
          </span>
        </div>
        <nav aria-label="Điều hướng chính">
          <ul className="nav">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  <Icon name={n.icon} />
                  <span>{n.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/account" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon name="user" />
            <span className="truncate">{user?.full_name || user?.username || 'Tài khoản'}</span>
          </NavLink>
          <button type="button" className="nav-link nav-button" onClick={logout}>
            <Icon name="logout" />
            <span>Đăng xuất</span>
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
