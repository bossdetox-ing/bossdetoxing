import { artCredit, cardArt } from '../domain/card-art';
import { correspondence, esoteric, glyphIcon } from '../domain/correspondence';
import { lordTitle } from './ArtCredit';
import type { tarot } from '../domain/tarot';

// A shareable 1080×1350 (4:5) card image drawn on the device: no server, nothing leaves it
// until the person shares or saves the file. The boss's name never appears on it.
type Card = (typeof tarot)[number];
const W = 1080;
const H = 1350;
const INK = '#16191c';
const MUTED = '#5f5e58';

async function image(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
function lines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const radius = i % 2 ? r * 0.28 : r;
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

export async function cardImage(card: Card) {
  await Promise.all([
    document.fonts.load('600 84px Minipax'),
    document.fonts.load('600 40px "IBM Plex Mono"'),
    document.fonts.load('500 32px "IBM Plex Mono"'),
    document.fonts.load('400 24px "IBM Plex Mono"'),
  ]);
  const { numeral, glyphs } = correspondence(card);
  const [art, ...icons] = await Promise.all([
    image(cardArt(card.id)),
    ...glyphs.map((g) => image(glyphIcon(g))),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Paper, then the artwork scaled up from a tiny copy: a soft blur that works in every browser.
  ctx.fillStyle = '#efeee8';
  ctx.fillRect(0, 0, W, H);
  const tiny = document.createElement('canvas');
  tiny.width = 18;
  tiny.height = 22;
  tiny.getContext('2d')!.drawImage(art!, 0, 0, 18, 22);
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = 0.75;
  ctx.drawImage(tiny, -160, -160, W + 320, H + 320);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgb(255 255 255 / 0.42)';
  ctx.fillRect(0, 0, W, H);

  // The card: frosted panel, double frame, star pips, sheen.
  rounded(ctx, 70, 70, W - 140, H - 140, 40);
  ctx.fillStyle = 'rgb(255 255 255 / 0.5)';
  ctx.fill();
  const sheen = ctx.createLinearGradient(70, 70, 600, 700);
  sheen.addColorStop(0, 'rgb(255 255 255 / 0.85)');
  sheen.addColorStop(1, 'rgb(255 255 255 / 0)');
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  rounded(ctx, 94, 94, W - 188, H - 188, 24);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  star(ctx, W / 2, 94, 16);
  star(ctx, W / 2, H - 94, 16);

  // Corner: numeral and its Golden Dawn glyphs.
  ctx.font = '600 38px "IBM Plex Mono", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(numeral, 134, 160);
  let x = 134 + ctx.measureText(numeral).width + 16;
  for (const icon of icons) {
    ctx.drawImage(icon, x, 132, 56, 56);
    x += 64;
  }

  // The sticker, fitted into the art window.
  const scale = Math.min(700 / art!.naturalWidth, 560 / art!.naturalHeight);
  const aw = art!.naturalWidth * scale;
  const ah = art!.naturalHeight * scale;
  ctx.drawImage(art!, (W - aw) / 2, 220 + (560 - ah) / 2, aw, ah);

  // Title, traditional name, mantra.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = '600 76px Minipax, Georgia, serif';
  let y = 880;
  for (const line of lines(ctx, card.title, 840)) {
    ctx.fillText(line, W / 2, y);
    y += 80;
  }
  if (card.traditionalName !== card.title) {
    ctx.font = '500 30px "IBM Plex Mono", monospace';
    ctx.fillStyle = MUTED;
    ctx.fillText(card.traditionalName, W / 2, y - 18);
    y += 40;
  }
  const lord = lordTitle(card);
  if (lord) {
    ctx.font = '400 26px "IBM Plex Mono", monospace';
    ctx.fillStyle = MUTED;
    ctx.fillText(lord, W / 2, y - 18);
    y += 36;
  }
  ctx.font = '600 38px "IBM Plex Mono", monospace';
  ctx.fillStyle = INK;
  for (const line of lines(ctx, card.groundedMantra, 820)) {
    ctx.fillText(line, W / 2, y + 30);
    y += 52;
  }

  // A major's Hebrew letter sits bottom-right inside the frame.
  const letter = esoteric(card).letter;
  if (letter) {
    ctx.font = '400 64px "Noto Sans Hebrew", "Arial Hebrew", "Times New Roman", serif';
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(letter.glyph, W - 134, 186);
  }

  // Footer: the painting and the app.
  const credit = artCredit(card.id);
  ctx.font = '400 22px "IBM Plex Mono", monospace';
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'left';
  if (credit) ctx.fillText(`${credit.artist}, ${credit.year}`.slice(0, 44), 134, H - 140);
  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.fillText('bossdetox.ing', W - 134, H - 140);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no image'))), 'image/png'),
  );
}

// Phones open the system share sheet; elsewhere the PNG is saved as a download.
export async function shareCard(card: Card) {
  const blob = await cardImage(card);
  const file = new File([blob], `${card.id.replace('card_', 'bossdetox-')}.png`, {
    type: 'image/png',
  });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: card.title });
      return 'shared' as const;
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return 'cancelled' as const;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved' as const;
}
