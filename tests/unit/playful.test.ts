import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import seed from '../../BOSSDETOX_ING_V1_HANDOFF/CONTENT_SEED.json';
import { tarot, tarotDeckSchema } from '../../src/domain/tarot';
import { bingo, bingoBoard, customSquares } from '../../src/domain/bingo';
test('a complete 78-card deck preserves the original readings and all four suits', () => {
  expect(tarot).toHaveLength(78);
  expect(tarot.filter((c) => c.arcana === 'major')).toHaveLength(22);
  for (const suit of ['swords', 'cups', 'wands', 'pentacles'])
    expect(tarot.filter((c) => c.suit === suit)).toHaveLength(14);
  for (const original of seed.tarot) {
    const { groundedMantra: _legacyMantra, ...reading } = original;
    expect(tarot.find((c) => c.id === original.id)).toMatchObject(reading);
    expect(_legacyMantra.length).toBeGreaterThan(0);
  }
  for (const card of tarot) expect(card.groundedMantra).toMatch(/^(I |My )/);
  expect(new Set(tarot.map((c) => c.title)).size).toBe(78);
  const bad = structuredClone(tarot);
  bad[0]!.number = bad[1]!.number;
  expect(tarotDeckSchema.safeParse(bad).success).toBe(false);
  expect(
    tarot.every(
      (c) =>
        c.notPrediction &&
        !/narcissist|psychopath|you will|predicts/i.test(
          c.fictionalSymbolism + c.groundedMantra + c.nextAction,
        ),
    ),
  ).toBe(true);
});
test('every tarot card has distinct, nonempty original local art', () => {
  const hashes = new Set(
    tarot.map((card) => {
      const art = readFileSync(`public/art/${card.id}.svg`, 'utf8');
      expect(art.length).toBeGreaterThan(500);
      expect(art).not.toMatch(/<script|<image|<foreignObject|onload=|href=/);
      return createHash('sha256').update(art).digest('hex');
    }),
  );
  expect(hashes.size).toBe(78);
});
test('Bingo bank is unique, random boards avoid prior suggestions, and custom text stays literal', () => {
  expect(bingo).toHaveLength(120);
  expect(new Set(bingo.map((item) => item.text.toLowerCase())).size).toBe(120);
  for (const text of seed.bingoSquares) expect(bingo.some((item) => item.text === text)).toBe(true);
  const first = bingoBoard([], undefined, () => 0.5);
  const second = bingoBoard([], undefined, () => 0.2, first);
  expect(new Set(first).size).toBe(9);
  expect(second).toHaveLength(9);
  expect(second.some((text) => first.includes(text))).toBe(false);
  expect(customSquares('  Custom square\ncustom square\n<img src=x>\n')).toEqual([
    'Custom square',
    '<img src=x>',
  ]);
  const own = customSquares('My fictional observation');
  expect(bingoBoard(own, undefined, () => 0.5)).toContain(own[0]);
  expect(() => customSquares('x'.repeat(141))).toThrow('bingo-limit');
  expect(() => customSquares(Array.from({ length: 61 }, (_, i) => `${i}`).join('\n'))).toThrow(
    'bingo-limit',
  );
});
