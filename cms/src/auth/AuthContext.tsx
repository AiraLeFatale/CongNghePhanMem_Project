/**
 * Ngữ cảnh xác thực (auth) dùng chung cho CMS.
 * Quản lý token/người dùng trong localStorage, xử lý đăng nhập, đăng xuất,
 * phiên hết hạn và component chặn route RequireAuth.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { api, setUnauthorizedHandler } from '../lib/api';
import { tokenStore } from '../lib/storage';
import type { AdminUser } from '../lib/types';
import { useToast } from '../components/Toast';

// Hợp đồng dữ liệu và hàm mà AuthContext cung cấp cho các component con.
interface AuthState {
  user: AdminUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

// Giá trị mặc định là null để useAuth phát hiện khi dùng ngoài AuthProvider.
const AuthContext = createContext<AuthState | null>(null);

// Provider giữ trạng thái đăng nhập và cung cấp login/logout cho toàn bộ ứng dụng.
export function AuthProvider({ children }: { children: ReactNode }) {
  // Khởi tạo từ localStorage để giữ phiên đăng nhập sau khi tải lại trang.
  const [token, setToken] = useState<string | null>(() => tokenStore.getToken());
  const [user, setUser] = useState<AdminUser | null>(() => tokenStore.getUser<AdminUser>());
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  // Giữ vị trí hiện tại trong ref để handler 401 luôn đọc được route mới nhất.
  const locRef = useRef(location);
  locRef.current = location;
  // Cờ đảm bảo thông báo hết hạn phiên chỉ hiện một lần.
  const expiredNotified = useRef(false);

  // Xoá token/người dùng khỏi bộ nhớ và localStorage rồi quay về trang đăng nhập.
  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Đăng ký handler cho lỗi 401 từ lớp API: đá người dùng về /login kèm đường dẫn hiện tại.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!tokenStore.getToken() && !token) return;
      tokenStore.clear();
      setToken(null);
      setUser(null);
      if (!expiredNotified.current) {
        expiredNotified.current = true;
        toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      }
      // Lưu lại URL hiện tại để sau khi đăng nhập có thể quay về đúng trang.
      const here = locRef.current.pathname + locRef.current.search;
      navigate(`/login?next=${encodeURIComponent(here)}`, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, toast, token]);

  // Gọi API đăng nhập, lưu token/người dùng vào storage và state.
  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    tokenStore.setToken(res.token);
    tokenStore.setUser(res.user);
    expiredNotified.current = false;
    setToken(res.token);
    setUser(res.user);
  }, []);

  // Memo hoá giá trị context để hạn chế render lại các consumer không liên quan.
  const value = useMemo(() => ({ user, token, login, logout }), [user, token, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook truy cập trạng thái đăng nhập; báo lỗi nếu dùng ngoài AuthProvider.
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}

// Chặn route riêng tư: chưa đăng nhập thì chuyển sang /login kèm tham số next.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    // Giữ lại đường dẫn đích để sau khi đăng nhập quay về đúng trang.
    const next = location.pathname + location.search;
    return <Navigate to={next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login'} replace />;
  }
  return <>{children}</>;
}
