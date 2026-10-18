import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { api, setUnauthorizedHandler } from '../lib/api';
import { tokenStore } from '../lib/storage';
import type { AdminUser } from '../lib/types';
import { useToast } from '../components/Toast';

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStore.getToken());
  const [user, setUser] = useState<AdminUser | null>(() => tokenStore.getUser<AdminUser>());
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const locRef = useRef(location);
  locRef.current = location;
  const expiredNotified = useRef(false);

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

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
      const here = locRef.current.pathname + locRef.current.search;
      navigate(`/login?next=${encodeURIComponent(here)}`, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, toast, token]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    tokenStore.setToken(res.token);
    tokenStore.setUser(res.user);
    expiredNotified.current = false;
    setToken(res.token);
    setUser(res.user);
  }, []);

  const value = useMemo(() => ({ user, token, login, logout }), [user, token, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    const next = location.pathname + location.search;
    return <Navigate to={next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login'} replace />;
  }
  return <>{children}</>;
}
