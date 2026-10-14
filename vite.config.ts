import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const TARGET_API_URL =
  process.env.VITE_MANAGEMENT_API_URL || 'https://cbbackend.runagent.io';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 3000,
    proxy: {
      '/api/v1': {
        target: TARGET_API_URL,
        changeOrigin: true,
      },
      // Bản sao của Pages Function `functions/_api/[[path]].js` cho lúc chạy local:
      // production đi qua Function, còn `npm run dev` thì vite đứng ra chuyển tiếp.
      // Thiếu cái này thì local gọi /_api vào hư không.
      '/_api': {
        target: process.env.VITE_HRM_API_URL || 'https://alan-hrm.amcare.vn',
        changeOrigin: true,
        rewrite: (duongDan) => duongDan.replace(/^\/_api/, ''),
      },
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
});
