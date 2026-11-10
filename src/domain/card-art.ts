import famous from '../content/famous-art.json';

// Every tarot card shows a public-domain artwork sticker (src/content/famous-art.json).
const stickers = new Set(famous.map((item) => item.card));
export const isSticker = (id: string) => stickers.has(id);
export const cardArt = (id: string) => `/art/famous/${id}.webp`;
export const artCredit = (id: string) => famous.find((item) => item.card === id);
