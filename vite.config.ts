/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { pageMiddleware } from './server/pageFetch.mjs';

/** Blog URL → Pins: /api/page and /api/image run inside the dev/preview server (see server/pageFetch.mjs). */
const pageReader = (): Plugin => ({
  name: 'pincraft-page-reader',
  configureServer: (server) => void server.middlewares.use(pageMiddleware()),
  configurePreviewServer: (server) => void server.middlewares.use(pageMiddleware()),
});

// The optional AI proxy (server/ai-proxy.mjs) runs on 8787. API keys live only there.
export default defineConfig({
  plugins: [react(), pageReader()],
  build: {
    rollupOptions: {
      output: { manualChunks: { react: ['react', 'react-dom'], canvas: ['konva', 'react-konva'] } },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
  },
});
