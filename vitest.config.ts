import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{ts,tsx}'],
    },
    alias: {
      '@tauri-apps/api/core': path.resolve(__dirname, './src/test/mocks/tauri.ts'),
      '@tauri-apps/plugin-store': path.resolve(__dirname, './src/test/mocks/tauri.ts'),
    },
  },
});
