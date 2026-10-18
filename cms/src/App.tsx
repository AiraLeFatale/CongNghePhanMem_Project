import { createBrowserRouter, Link, Outlet, RouterProvider, useRouteError } from 'react-router';
import { AuthProvider, RequireAuth } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PoiListPage } from './pages/PoiListPage';
import { PoiEditPage } from './pages/PoiEditPage';
import { QrPage } from './pages/QrPage';
import { TourListPage } from './pages/TourListPage';
import { TourEditPage } from './pages/TourEditPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AnalyticsReportPage } from './pages/AnalyticsReportPage';
import { AccountPage } from './pages/AccountPage';

function Root() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

function NotFound() {
  return (
    <div className="state state-empty">
      <div className="state-icon" aria-hidden="true">
        404
      </div>
      <h3>Không tìm thấy trang</h3>
      <p>Đường dẫn không tồn tại hoặc đã bị đổi.</p>
      <Link to="/" className="btn btn-primary">
        Về trang tổng quan
      </Link>
    </div>
  );
}

function RouteError() {
  const err = useRouteError();
  console.warn(err);
  return (
    <div className="state state-error" role="alert" style={{ minHeight: '60vh' }}>
      <div className="state-icon" aria-hidden="true">
        !
      </div>
      <h3>Đã xảy ra lỗi khi hiển thị trang</h3>
      <p>{err instanceof Error ? err.message : 'Lỗi không xác định'}</p>
      <a href="/" className="btn btn-primary">
        Tải lại trang tổng quan
      </a>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/analytics/report',
        element: (
          <RequireAuth>
            <AnalyticsReportPage />
          </RequireAuth>
        ),
      },
      {
        element: (
          <RequireAuth>
            <Layout />
          </RequireAuth>
        ),
        errorElement: <RouteError />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'pois', element: <PoiListPage /> },
          { path: 'pois/:id', element: <PoiEditPage /> },
          { path: 'tours', element: <TourListPage /> },
          { path: 'tours/:id', element: <TourEditPage /> },
          { path: 'qr', element: <QrPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'account', element: <AccountPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
