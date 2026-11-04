import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [tailwindcss()],
  publicDir: 'public',
  build: { outDir: 'dist', emptyOutDir: true, modulePreload: { polyfill: false } },
  server: { host: '127.0.0.1', port: 5191, strictPort: true },
  preview: { host: '127.0.0.1', port: 5191, strictPort: true },
});
