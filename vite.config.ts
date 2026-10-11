import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 600 },
  server: {
    host: process.env.HOST || '127.0.0.1',
    proxy: { '/api': `http://127.0.0.1:${process.env.PORT || 8787}` },
  },
});
