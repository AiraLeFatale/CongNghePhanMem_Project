/**
 * Điểm khởi động của ứng dụng React (CMS).
 * Import CSS toàn cục (Leaflet, styles) và gắn component App vào phần tử #root.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { App } from './App';

// Tạo root React gắn vào #root trong index.html; StrictMode giúp phát hiện lỗi tiềm ẩn ở môi trường phát triển.
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
