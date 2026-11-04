import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// The build copies these shared folders from the repo's public/ (scripts/pwa.mjs);
// in dev they are served straight from there.
const shared = fileURLToPath(new URL('../public', import.meta.url));
const folders = ['art', 'avatars', 'icons', 'fonts', 'wordart', 'moon', 'sky', 'rocks', 'disguise'];
const types: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};
const sharedPublic: Plugin = {
  name: 'shared-public',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/'));
      const file = join(shared, path);
      if (
        !folders.includes(path.split('/')[1] ?? '') ||
        !existsSync(file) ||
        !statSync(file).isFile()
      )
        return next();
      res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
      createReadStream(file).pipe(res);
    });
  },
};

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [tailwindcss(), sharedPublic],
  publicDir: 'public',
  build: { outDir: 'dist', emptyOutDir: true, modulePreload: { polyfill: false } },
  server: { host: '127.0.0.1', port: 5193, strictPort: true },
  preview: { host: '127.0.0.1', port: 5191, strictPort: true },
});
