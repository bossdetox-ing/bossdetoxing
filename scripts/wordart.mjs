// Renders every situation card label as a static Office-WordArt-Gallery SVG, one file per locale:
// public/wordart/<locale>/<id>.svg (six pain ids + every other scenario id). Glyphs are converted
// to outlines at build time from the macOS system fonts the gallery used, so no device needs them.
// Run after changing a label: npx vite-node scripts/wordart.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import opentype from 'opentype.js';
import { en } from '../src/content/en.ts';
import { content } from '../src/domain/content.ts';
import { pains } from '../src/domain/pains.ts';

const fontDir = '/System/Library/Fonts/Supplemental';
const fonts = {
  impact: opentype.loadSync(`${fontDir}/Impact.ttf`),
  black: opentype.loadSync(`${fontDir}/Arial Black.ttf`),
  arial: opentype.loadSync(`${fontDir}/Arial Bold.ttf`),
  times: opentype.loadSync(`${fontDir}/Times New Roman Bold.ttf`),
};
// Hard colour bands (stripes) are written as [colour, colour, …] pairs at equal offsets.
const bands = (...colors) =>
  colors.flatMap((c, i) => [
    [c, i / colors.length],
    [c, (i + 1) / colors.length],
  ]);

// One gallery cell per card. No slanted/italic styles.
const presets = {
  // Pains
  threats: {
    font: 'impact',
    colors: ['#fff36b', '#ffc400', '#ff7a00', '#e23d00'],
    edge: '#6e1d00',
    edgeWidth: 1.2,
    side: '#a33000',
    depth: 10,
    dx: 0.5,
    dy: 0.9,
    warp: 'rise',
  }, // r5c4
  guilt: {
    font: 'black',
    colors: ['#ff7cff', '#f000f0', '#a100e6', '#5200b0'],
    edge: '#33075f',
    edgeWidth: 1,
    shadow: { dx: 6, dy: 5, color: '#1d1030', opacity: 0.45 },
    warp: 'none',
  }, // r3c2
  chaos: {
    font: 'arial',
    horizontal: true,
    colors: ['#ff1a1a', '#ff9500', '#ffee00', '#22c34a', '#0a84ff', '#7a1fd1'],
    edge: '#1e1e1e',
    edgeWidth: 0.9,
    shadow: { dx: 4, dy: 4, color: '#000', opacity: 0.3 },
    warp: 'wave',
  }, // r3c4
  questions: {
    font: 'black',
    colors: ['#ffffff', '#c9ccd2', '#4f5660', '#f2f4f6', '#8c939c'],
    edge: '#15191e',
    edgeWidth: 1.2,
    side: '#30353c',
    depth: 3,
    dx: 0.6,
    dy: 0.7,
    shine: true,
    warp: 'arch',
  }, // r1c3 + r5c1
  gossip: {
    font: 'impact',
    colors: ['#e9fcff', '#62d9ff', '#0a7cff', '#08208f'],
    edge: '#021457',
    edgeWidth: 1,
    side: '#00104a',
    depth: 4,
    dx: 0.6,
    dy: 0.6,
    shine: true,
    warp: 'inflate',
  }, // r4c4
  meetings: {
    font: 'times',
    colors: ['#f7d49a', '#c7873e', '#8a4b16', '#e0ad66', '#6b3510'],
    edge: '#2e1404',
    edgeWidth: 1.1,
    side: '#4a2508',
    depth: 3,
    dx: 0.7,
    dy: 0.7,
    warp: 'none',
  }, // r4c1
  // More patterns
  vague_accusation: {
    font: 'arial',
    colors: ['#ffffff', '#8fb8ff'],
    edge: '#1d3a6e',
    edgeWidth: 1.5,
    shadow: { dx: 3, dy: 3, color: '#2f4f86', opacity: 0.35 },
    warp: 'none',
  }, // r2c2
  public_criticism: {
    font: 'black',
    colors: ['#3a3a3a', '#000000'],
    edge: '#000',
    edgeWidth: 0.6,
    shadow: { dx: 5, dy: 5, color: '#8a8a8a', opacity: 0.6 },
    warp: 'rise',
  }, // r1c4
  unattributed_consensus: {
    font: 'arial',
    colors: ['#d9c9ff', '#8a6cff', '#3a2bb8'],
    edge: '#1d1466',
    edgeWidth: 1,
    shadow: { dx: 4, dy: 4, color: '#1d1466', opacity: 0.35 },
    warp: 'arch',
  }, // r2c3
  withheld_information: {
    font: 'times',
    colors: ['#ffffff', '#8a8a8a'],
    edge: '#222',
    edgeWidth: 1.3,
    side: '#7a7a7a',
    depth: 2,
    dx: 0.6,
    dy: 0.6,
    warp: 'none',
  }, // r2c4
  responsibility_diffusion: {
    font: 'black',
    colors: ['#8fd0ff', '#2f8cff', '#0040b0'],
    edge: '#00205b',
    edgeWidth: 1,
    side: '#001a4a',
    depth: 4,
    dx: 0.6,
    dy: 0.7,
    shine: true,
    warp: 'wave',
  }, // r2c5
  micromanagement: {
    font: 'black',
    colors: ['#fff7b0', '#f5c400', '#b87a00', '#ffe15a'],
    edge: '#6b4400',
    edgeWidth: 1.1,
    side: '#7a4d00',
    depth: 3,
    dx: 0.6,
    dy: 0.7,
    shine: true,
    warp: 'none',
  }, // r3c1
  competing_priorities: {
    font: 'times',
    colors: ['#c9f7b8', '#4fc24a', '#14701f'],
    edge: '#0b3d12',
    edgeWidth: 1.1,
    shadow: { dx: 4, dy: 5, color: '#0b3d12', opacity: 0.35 },
    warp: 'inflate',
  }, // r3c3
  credit_dispute: {
    font: 'arial',
    colors: ['#dff3ff', '#5fb3ff'],
    edge: '#0d3f73',
    edgeWidth: 1.4,
    side: '#1f5f99',
    depth: 2,
    dx: 0.5,
    dy: 0.5,
    warp: 'arch',
  }, // r3c5
  workload_overload: {
    font: 'times',
    stops: bands('#e3262e', '#ffffff', '#1f4fbf'),
    edge: '#1a1a1a',
    edgeWidth: 1.1,
    shadow: { dx: 4, dy: 4, color: '#000', opacity: 0.3 },
    warp: 'rise',
  }, // r4c2
  surveillance_concern: {
    font: 'impact',
    colors: ['#ffe27a', '#ff9f00', '#a65300'],
    edge: '#5a2a00',
    edgeWidth: 1.1,
    side: '#7a3a00',
    depth: 8,
    dx: 0.5,
    dy: 0.9,
    warp: 'rise',
  }, // r4c3
  no_response: {
    font: 'black',
    colors: ['#fffb8f', '#d6cf00', '#6f6a00'],
    edge: '#3a3800',
    edgeWidth: 1,
    shadow: { dx: 4, dy: 4, color: '#3a3800', opacity: 0.3 },
    warp: 'wave',
  }, // r4c5
  suspected_retaliation: {
    font: 'impact',
    colors: ['#f4f4f4', '#a0a0a0', '#4a4a4a'],
    edge: '#1e1e1e',
    edgeWidth: 1,
    side: '#2c2c2c',
    depth: 8,
    dx: 0.6,
    dy: 0.8,
    shine: true,
    warp: 'inflate',
  }, // r5c3
  after_meeting_replay: {
    font: 'times',
    stops: bands('#ff2a2a', '#1a1a1a', '#ff2a2a', '#1a1a1a'),
    edge: '#000',
    edgeWidth: 0.9,
    warp: 'wave',
  }, // r5c5
  ordinary_disagreement: {
    font: 'arial',
    colors: ['#3a3a3a', '#111111'],
    edge: '#000',
    edgeWidth: 0.6,
    shadow: { dx: 3, dy: 3, color: '#000', opacity: 0.18 },
    warp: 'none',
  }, // r1c1
};

const SIZE = 64;
const LEFT = 14;
const WIDTH = 234;

function envelope(warp, t) {
  if (warp === 'arch')
    return { lift: Math.sin(t * Math.PI) * 18, scale: 0.82 + Math.sin(t * Math.PI) * 0.18 };
  if (warp === 'wave')
    return { lift: -Math.sin(t * Math.PI * 2) * 9, scale: 0.86 + Math.cos(t * Math.PI * 2) * 0.12 };
  if (warp === 'inflate') {
    const scale = 0.7 + Math.sin(t * Math.PI) * 0.42;
    return { lift: -(scale - 1) * 26, scale };
  }
  if (warp === 'rise') return { lift: t * 6, scale: 0.62 + t * 0.5 };
  return { lift: 0, scale: 1 };
}

function lineGlyphs(font, text, size, baseline, width, warp) {
  const letters = Array.from(text);
  const advances = letters.map((l) => font.getAdvanceWidth(l, size));
  const natural = advances.reduce((a, b) => a + b, 0);
  const stretch = Math.min(width / natural, 1.6);
  let cursor = 0;
  return letters
    .map((letter, i) => {
      const advance = advances[i] * stretch;
      const { lift, scale } = envelope(warp, (cursor + advance / 2) / (natural * stretch));
      const x = LEFT + cursor;
      cursor += advance;
      // Bake position, stretch and envelope into the outline so gradients span the whole word.
      const path = font.getPath(letter, 0, 0, size);
      const y0 = baseline - lift * (size / SIZE);
      for (const c of path.commands)
        for (const [kx, ky] of [
          ['x', 'y'],
          ['x1', 'y1'],
          ['x2', 'y2'],
        ])
          if (kx in c) {
            c[kx] = x + c[kx] * stretch;
            c[ky] = y0 + c[ky] * scale;
          }
      const d = path.toPathData(2);
      return d ? `<path d="${d}"/>` : '';
    })
    .join('');
}

// Long labels break at the space nearest the middle; each line keeps gallery proportions.
function lines(label, font) {
  if (font.getAdvanceWidth(label, SIZE) <= WIDTH * 1.3 || !label.includes(' ')) return [label];
  const spaces = [...label.matchAll(/ /g)].map((m) => m.index);
  const cut = spaces.reduce((best, i) =>
    Math.abs(i - label.length / 2) < Math.abs(best - label.length / 2) ? i : best,
  );
  return [label.slice(0, cut), label.slice(cut + 1)];
}

function render(label, style) {
  const p = presets[style];
  if (!p) throw new Error(`No WordArt preset for ${style}`);
  const font = fonts[p.font];
  const rows = lines(label, font);
  const size = rows.length === 1 ? SIZE : 44;
  const width = Math.max(
    WIDTH,
    ...rows.map((r) => Math.min(font.getAdvanceWidth(r, size), WIDTH * 1.2)),
  );
  const baselines = rows.length === 1 ? [78] : [46, 94];
  const glyphs = rows
    .map((r, i) => lineGlyphs(font, r, size, baselines[i], width, p.warp))
    .join('');
  const stops = (p.stops ?? p.colors.map((c, i) => [c, i / (p.colors.length - 1)]))
    .map(([c, o]) => `<stop offset="${(o * 100).toFixed(1)}%" stop-color="${c}"/>`)
    .join('');
  const gradient = p.horizontal
    ? `<linearGradient id="f" gradientUnits="userSpaceOnUse" x1="${LEFT}" y1="0" x2="${LEFT + width}" y2="0">${stops}</linearGradient>`
    : `<linearGradient id="f" gradientUnits="userSpaceOnUse" x1="0" y1="${rows.length === 1 ? 14 : 8}" x2="0" y2="${rows.length === 1 ? 84 : 98}">${stops}</linearGradient>`;
  const layers = [];
  if (p.shadow)
    layers.push(
      `<use href="#l" transform="translate(${p.shadow.dx} ${p.shadow.dy})" fill="${p.shadow.color}" fill-opacity="${p.shadow.opacity}"/>`,
    );
  for (let i = p.depth ?? 0; i > 0; i--)
    layers.push(
      `<use href="#l" transform="translate(${(i * p.dx).toFixed(2)} ${(i * p.dy).toFixed(2)})" fill="${p.side}" stroke="${p.side}" stroke-width="1.2"/>`,
    );
  layers.push(`<use href="#l" fill="url(#f)" stroke="${p.edge}" stroke-width="${p.edgeWidth}"/>`);
  if (p.shine)
    layers.push(
      `<use href="#l" transform="translate(-.4 -.5)" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".55"/>`,
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(width + LEFT * 2 + 8)} 104"><defs>${gradient}<g id="l">${glyphs}</g></defs><g stroke-linejoin="round" paint-order="stroke fill">${layers.join('')}</g></svg>\n`;
}

const locales = { en: { copy: en, scenarios: content.scenarios } };
for (const [locale, { copy, scenarios }] of Object.entries(locales)) {
  await mkdir(`public/wordart/${locale}`, { recursive: true });
  const cards = [
    ...pains.map((pain) => [pain.id, copy.redesign.pains[pain.id]]),
    ...scenarios
      .filter((s) => !pains.some((p) => p.scenarioId === s.id))
      .map((s) => [s.id, s.label]),
  ];
  for (const [id, label] of cards)
    await writeFile(`public/wordart/${locale}/${id}.svg`, render(label, id));
  console.log(`WordArt: ${cards.length} cards × ${locale}`);
}
