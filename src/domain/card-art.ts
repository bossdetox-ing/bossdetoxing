import famous from '../content/famous-art.json';

// Cards with a public-domain artwork character use its sticker; the rest keep original art.
const stickers = new Set(famous.map((item) => item.card));
export const isSticker = (id: string) => stickers.has(id);
export const cardArt = (id: string) =>
  isSticker(id) ? `/art/famous/${id}.webp` : `/art/${id}.svg`;
export const artCredit = (id: string) => famous.find((item) => item.card === id);
