/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: /api và /uploads proxy sang backend. Production: backend phục vụ luôn thư mục dist/ (xem backend/src/app.js).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.DEV_PROXY_TARGET || 'http://localhost:4000';
  const proxy = {
    '/api': { target, changeOrigin: true },
    '/uploads': { target, changeOrigin: true },
  };
  return {
    plugins: [react()],
    server: { port: 5174, host: true, proxy },
    preview: { port: 4174, proxy },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  };
});
