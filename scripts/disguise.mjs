// Builds the tab/toolbar icon set from src/domain/disguise.ts. Run after changing that list:
//   node scripts/disguise.mjs
// <dir>/disguise/<id>.svg        favicon: black glyph, white when the browser is dark
// <dir>/disguise/mono/<id>.svg   picker: black glyph (the app inverts it in dark themes)
// public/disguise/png/<id>-<light|dark>-<16|32>.png  extension toolbar icons
// Look-alikes and monkeys go to public/ (extension + web); brands only to pwa/public/.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { brands, lookAlikes, monkeys } from '../src/domain/disguise.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

async function source(id) {
  if (id === 'blank') return { viewBox: '0 0 24 24', body: '' };
  const file = id.startsWith('monkey-')
    ? `public/avatars/${id.slice(7)}.svg`
    : brands.includes(id)
      ? `src/assets/brand-icons/${id}.svg`
      : `node_modules/pixelarticons/svg/${id}.svg`;
  const svg = await readFile(file, 'utf8');
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/ fill="[^"]*"/g, '');
  return { viewBox, body };
}
const svg = ({ viewBox, body }, style) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" shape-rendering="${viewBox === '0 0 24 24' ? 'crispEdges' : 'geometricPrecision'}"><style>${style}</style>${body}</svg>\n`;
const adaptive = '*{fill:#0b0d0c}@media (prefers-color-scheme:dark){*{fill:#fff}}';

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [dir, ids] of [
  ['public', [...lookAlikes, ...monkeys]],
  ['pwa/public', brands],
]) {
  await mkdir(`${dir}/disguise/mono`, { recursive: true });
  for (const id of ids) {
    const src = await source(id);
    await writeFile(`${dir}/disguise/${id}.svg`, svg(src, adaptive));
    await writeFile(`${dir}/disguise/mono/${id}.svg`, svg(src, '*{fill:#0b0d0c}'));
    if (dir !== 'public') continue;
    await mkdir('public/disguise/png', { recursive: true });
    for (const [scheme, color] of [
      ['light', '#0b0d0c'],
      ['dark', '#ffffff'],
    ])
      for (const size of [16, 32]) {
        await page.setViewportSize({ width: size, height: size });
        await page.setContent(
          `<html><body style="margin:0;background:transparent">${svg(src, `*{fill:${color}}`).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
        );
        await page.screenshot({
          path: `public/disguise/png/${id}-${scheme}-${size}.png`,
          omitBackground: true,
        });
      }
  }
}
await browser.close();
console.log(
  `Disguise icons: ${lookAlikes.length + monkeys.length} shared, ${brands.length} web-only`,
);
