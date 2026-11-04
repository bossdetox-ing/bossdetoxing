import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const directory = 'pwa/dist';
for (const folder of ['art', 'avatars', 'icons', 'fonts', 'wordart', 'moon', 'disguise'])
  await cp(`public/${folder}`, `${directory}/${folder}`, { recursive: true });
for (const file of ['pwa-192.png', 'pwa-512.png', 'pwa-maskable.png'])
  await cp(`pwa/public/${file}`, `${directory}/${file}`);
await cp('LICENSE', `${directory}/LICENSE.txt`);
await cp('.output/chrome-mv3/THIRD_PARTY_NOTICES.txt', `${directory}/THIRD_PARTY_NOTICES.txt`);
async function files(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? files(join(folder, entry.name)) : join(folder, entry.name),
      ),
    )
  ).flat();
}
const paths = (await files(directory))
  .filter((path) => !path.endsWith('/sw.js') && !path.endsWith('/_headers'))
  .sort();
const digest = createHash('sha256');
for (const path of paths) digest.update(path).update(await readFile(path));
const version = digest.digest('hex').slice(0, 16);
const urls = paths.map((path) => '/' + path.slice(directory.length + 1));
urls.push('/');
const worker = `const CACHE = 'bossdetox-static-${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('bossdetox-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(event.request, { ignoreVary: true });
    if (saved) return saved;
    if (event.request.mode === 'navigate') return (await cache.match('/index.html')) || fetch(event.request);
    return fetch(event.request);
  }));
});
`;
await writeFile(`${directory}/sw.js`, worker);
console.log(`PWA: ${urls.length} local assets, offline cache ${version}`);
