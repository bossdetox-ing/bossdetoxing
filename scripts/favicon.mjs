// Usage: node scripts/favicon.mjs [01-30]
// Writes the site and PWA favicon from one monkey avatar on the brand-yellow tile.
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const avatar = (process.argv[2] ?? '01').padStart(2, '0');
const source = await readFile(`public/avatars/${avatar}.svg`, 'utf8');
const viewBox = source.match(/viewBox="([^"]+)"/)?.[1];
const body = source.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
if (!viewBox || !body) throw new Error(`public/avatars/${avatar}.svg is not a monkey avatar`);

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><!-- avatar ${avatar} --><rect width="256" height="256" rx="56" fill="#fbef32"/><svg x="20" y="20" width="216" height="216" viewBox="${viewBox}" shape-rendering="crispEdges">${body}</svg></svg>\n`;

for (const path of ['website/public/favicon.svg', 'pwa/public/favicon.svg'])
  await writeFile(path, favicon);
console.log(`Favicon: monkey ${avatar}`);
