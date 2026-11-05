// Usage: node scripts/app-icons.mjs [01-30]
// Draws the PWA install icons from one monkey avatar: the clandrei lime monkey on the olive band.
// pwa-192/512 fill the square (the OS rounds them); pwa-maskable keeps the monkey inside the
// 80% safe zone so circle and squircle masks never crop it. Renders with Playwright's Chromium.
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium } from '@playwright/test';

const avatar = (process.argv[2] ?? '01').padStart(2, '0');
const source = await readFile(`public/avatars/${avatar}.svg`, 'utf8');
const path = source.match(/ d="([^"]+)"/)?.[1];
if (!path) throw new Error(`public/avatars/${avatar}.svg is not a monkey avatar`);

const OLIVE = '#555242';
const LIME = '#bef000';
// Width of the monkey as a share of the icon: generous for plain icons, safe-zone for maskable.
const icons = [
  ['pwa/public/pwa-192.png', 192, 0.72],
  ['pwa/public/pwa-512.png', 512, 0.72],
  ['pwa/public/pwa-maskable.png', 512, 0.56],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, share] of icons) {
  const width = size * share;
  const height = (width * 175) / 197;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" fill="${OLIVE}"/>` +
      `<svg x="${(size - width) / 2}" y="${(size - height) / 2}" width="${width}" height="${height}" viewBox="0 0 197 175" shape-rendering="crispEdges"><path fill="${LIME}" d="${path}"/></svg>` +
      `</svg></body>`,
  );
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log(`PWA icons: monkey ${avatar}`);
