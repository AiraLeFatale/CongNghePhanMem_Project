/**
 * Trang đăng nhập của CMS.
 * Xác thực tài khoản quản trị, hiển thị lỗi và chuyển hướng về trang đích
 * được truyền qua tham số ?next trên URL.
 */
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/api';
import { useDocumentTitle } from '../lib/useAsync';
import { Icon } from '../components/Icon';
import { Spinner } from '../components/States';

// Chuẩn hoá tham số ?next, chỉ chấp nhận đường dẫn nội bộ an toàn.
function safeNext(next: string | null): string {
  // Chỉ cho chuyển hướng nội bộ để tránh open-redirect.
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) return '/';
  return next;
}

// Trang đăng nhập: quản lý state form, gọi login và điều hướng sau khi thành công.
export function LoginPage() {
  useDocumentTitle('Đăng nhập');
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  // Đã có token và không đang đăng nhập thì vào thẳng trang đích.
  if (token && !busy) return <Navigate to={next} replace />;

  // Kiểm tra dữ liệu nhập, gọi API đăng nhập rồi chuyển hướng.
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Đăng nhập thất bại'));
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit} noValidate aria-describedby={error ? 'login-error' : undefined}>
        <div className="login-brand">
          <span className="brand-mark brand-mark-lg" aria-hidden="true">
            <Icon name="speaker" size={26} />
          </span>
          <div>
            <h1>Thuyết minh tự động Quận 4</h1>
            <p>Đăng nhập trang quản trị nội dung</p>
          </div>
        </div>
        {/* Thông báo lỗi đăng nhập, được liên kết với form qua aria-describedby. */}
        {error && (
          <div className="alert alert-error" id="login-error" role="alert">
            {error}
          </div>
        )}
        <div className="field">
          <label htmlFor="username">Tên đăng nhập</label>
          <input id="username" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Mật khẩu</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy && <Spinner small />} {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <p className="login-foot">Hệ thống thuyết minh đa ngôn ngữ cho khách du lịch và hành khách xe buýt.</p>
      </form>
    </div>
  );
}
