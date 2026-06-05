import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  /** Inline PostCSS so Tailwind always runs (avoids missed postcss.config discovery). */
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: path.resolve(__dirname, 'tailwind.config.cjs') }),
        autoprefixer(),
      ],
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      /** Django FileField URLs are under MEDIA_URL (default /media/); same-origin as /api in dev */
      '/media': { target: 'http://localhost:8000', changeOrigin: true },
      /** Django admin at /admin/admin/ (React app uses /admin/dashboard, etc.) */
      '/admin/admin': { target: 'http://localhost:8000', changeOrigin: true },
      '/static': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
