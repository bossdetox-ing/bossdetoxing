import { expect, test } from 'vitest';
import { content, contentSchema } from '../../src/domain/content';
import { copyRisks } from '../../src/domain/copy-review';
import { shuffled } from '../../src/domain/session';
import { resolveLocale } from '../../src/content';
import { professionalResponse } from '../../src/domain/scripts';
import {
  customThreatSchema,
  isCustomThreat,
  newCustomThreatId,
} from '../../src/domain/custom-threats';
test('every threat has a spoken line per rock that differs from the written reply', () => {
  // Every threat has its own line to say out loud, different from the written reply.
  for (const s of content.scenarios)
    for (const tone of ['yellow', 'grey', 'firm'] as const) {
      const said = professionalResponse(s, tone, 'spoken');
      expect(said.length).toBeGreaterThan(10);
      expect(said).not.toBe(professionalResponse(s, tone, 'written'));
    }
});
test('locale packs preserve nested English fallback without mixing missing content', () => {
  const pack = resolveLocale({
    locale: 'es',
    messages: { home: 'Inicio', tones: { yellow: 'Cálido' } },
  });
  expect(pack.messages.home).toBe('Inicio');
  expect(pack.messages.tones.yellow).toBe('Cálido');
  expect(pack.messages.tones.firm).toBe('Firm Rock');
  expect(pack.content).toBe(content);
});
test('all content IDs, references, counts and safety distinctions validate', () => {
  expect(contentSchema.safeParse(content).success).toBe(true);
  expect(content.scenarios).toHaveLength(20);
  for (const scenario of content.scenarios)
    expect(Object.values(scenario.responses)).toHaveLength(3);
  for (const behavior of content.behaviors) {
    expect(behavior.alternativeExplanations.length).toBeGreaterThan(0);
    expect(behavior.doNotInfer.length).toBeGreaterThan(0);
  }
});
test('rejects missing tone, unknown reference, duplicated ID and predictive cards', () => {
  for (const mutate of [
    (data: typeof content) => {
      data.scenarios[0]!.responses.firm = '';
    },
    (data: typeof content) => {
      data.scenarios[0]!.techniqueIds.push('unknown');
    },
    (data: typeof content) => {
      data.scenarios.push(data.scenarios[0]!);
    },
    (data: typeof content) => {
      Object.assign(data.tarot[0]!, { notPrediction: false });
    },
  ]) {
    const fixture = structuredClone(content);
    mutate(fixture);
    expect(contentSchema.safeParse(fixture).success).toBe(false);
  }
});
test('copy review flags likely secrets while making no comprehensive detection claim', () => {
  expect(copyRisks('token: sample-only')).toBe(true);
  expect(copyRisks('fake@example.test')).toBe(true);
  expect(copyRisks('https://internal.example.test')).toBe(true);
  expect(copyRisks('What is the deliverable?')).toBe(false);
});
test('shuffled keeps every item exactly once', () => {
  const ids = content.scenarios.map((s) => s.id);
  expect(new Set(shuffled(ids, () => 0.5))).toEqual(new Set(ids));
});
test('own threats validate their id, word length, style and description', () => {
  const id = newCustomThreatId();
  expect(isCustomThreat(id)).toBe(true);
  const item = { id, label: 'ASAP', style: 'neon', say: 'Say', write: '' };
  expect(customThreatSchema.safeParse(item).success).toBe(true);
  expect(customThreatSchema.safeParse({ ...item, description: 'Short' }).success).toBe(true);
  for (const bad of [
    { ...item, id: 'dismissal_warning' },
    { ...item, label: ' ' },
    { ...item, label: 'x'.repeat(25) },
    { ...item, style: 'comic-sans' },
    { ...item, description: 'x'.repeat(141) },
  ])
    expect(customThreatSchema.safeParse(bad).success).toBe(false);
});
test('suggested passphrases are six distinct-looking EFF short-list words', async () => {
  const { suggestPassphrase } = await import('../../src/domain/passphrase');
  const list = new Set<string>((await import('../../src/content/eff-short-words.json')).default);
  const first = suggestPassphrase();
  const words = first.replace('yo-yo', 'yoyo').split('-');
  expect(words).toHaveLength(6);
  for (const word of words) expect(list.has(word === 'yoyo' ? 'yo-yo' : word)).toBe(true);
  expect(first.length).toBeGreaterThanOrEqual(12);
  expect(suggestPassphrase()).not.toBe(first);
});
