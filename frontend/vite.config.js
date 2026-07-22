import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // During local dev, proxy /api requests to the Express backend
    // (assumed to run on port 8080) so the frontend can just call
    // relative paths like "/api/summarize" in both dev and prod.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
