import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    env: {
      VITE_API_BASE_URL: 'http://localhost:3000',
      VITE_APP_ENV: 'test',
    },
    exclude: ['e2e/**', 'node_modules/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/testing/setup-tests.ts'],
    css: true,
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
