import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Bind to all interfaces so other devices on the same network can connect
    host: '0.0.0.0',
    proxy: {
      // Every request starting with /api is forwarded to the backend.
      // This means VITE_API_BASE_URL=/api/v1 works on ANY machine —
      // no hardcoded IPs needed.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Forward cookies (needed for the refresh token cookie)
        secure: false,
      },
    },
  },
});
