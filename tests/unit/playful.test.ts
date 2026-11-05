import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import seed from '../../src/content/content-seed.json';
import { tarot, tarotDeckSchema } from '../../src/domain/tarot';
test('a complete 78-card deck preserves the original readings and all four suits', () => {
  expect(tarot).toHaveLength(78);
  expect(tarot.filter((c) => c.arcana === 'major')).toHaveLength(22);
  for (const suit of ['swords', 'cups', 'wands', 'pentacles'])
    expect(tarot.filter((c) => c.suit === suit)).toHaveLength(14);
  for (const original of seed.tarot) {
    // Titles, and for 41 cards the mantra and action, come from the owner's deck doc;
    // the remaining reading fields stay as seeded.
    const {
      groundedMantra: _legacyMantra,
      title: _renamed,
      nextAction: _action,
      ...reading
    } = original;
    expect(tarot.find((c) => c.id === original.id)).toMatchObject(reading);
    expect(_legacyMantra.length).toBeGreaterThan(0);
    expect(_renamed.length + _action.length).toBeGreaterThan(0);
  }
  // Mantras are short private lines; the doc's versions are not always first person.
  for (const card of tarot) expect(card.groundedMantra.length).toBeGreaterThan(10);
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
