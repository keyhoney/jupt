import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// API 키는 클라이언트에 노출되지 않습니다. Cloudflare Pages Function(/api/search)에서만 env로 사용합니다.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': { target: 'http://127.0.0.1:8789', changeOrigin: true },
      },
    },
});
