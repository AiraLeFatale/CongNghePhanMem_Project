import { createBrowserRouter, RouterProvider } from 'react-router';
import { LangProvider } from './lib/i18n';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { PlacesPage } from './pages/PlacesPage';
import { PlacePage } from './pages/PlacePage';
import { QrPage } from './pages/QrPage';
import { ToursPage } from './pages/ToursPage';
import { TourPage } from './pages/TourPage';
import { GuidePage } from './pages/GuidePage';
import { CreditsPage } from './pages/CreditsPage';
import { NotFoundPage } from './pages/NotFoundPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'diem', element: <PlacesPage /> },
      { path: 'diem/:id', element: <PlacePage /> },
      { path: 'q/:code', element: <QrPage /> },
      { path: 'tour', element: <ToursPage /> },
      { path: 'tour/:id', element: <TourPage /> },
      { path: 'huong-dan', element: <GuidePage /> },
      { path: 'nguon-anh', element: <CreditsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <LangProvider>
      <RouterProvider router={router} />
    </LangProvider>
  );
}
