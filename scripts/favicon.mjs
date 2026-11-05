// Usage: node scripts/favicon.mjs [01-30] [extra/favicon.svg …]
// Writes the PWA favicon (and any extra paths) from one monkey avatar on the brand-yellow tile.
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const [choice = '01', ...extra] = process.argv.slice(2);
const avatar = choice.padStart(2, '0');
const source = await readFile(`public/avatars/${avatar}.svg`, 'utf8');
const viewBox = source.match(/viewBox="([^"]+)"/)?.[1];
const body = source.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
if (!viewBox || !body) throw new Error(`public/avatars/${avatar}.svg is not a monkey avatar`);

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><!-- avatar ${avatar} --><rect width="256" height="256" rx="56" fill="#fbef32"/><svg x="20" y="20" width="216" height="216" viewBox="${viewBox}" shape-rendering="crispEdges">${body}</svg></svg>\n`;

for (const path of ['pwa/public/favicon.svg', ...extra]) await writeFile(path, favicon);
console.log(`Favicon: monkey ${avatar}`);
