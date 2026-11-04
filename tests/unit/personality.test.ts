import { expect, test } from 'vitest';
import { defaults } from '../../src/browser/settings';
import { headings, chooseHeading, headingText } from '../../src/domain/headings';
import { randomLogo, avatarCount } from '../../src/domain/logo';
import { dailyCard, dailySchema } from '../../src/domain/daily';
import { cosmicWeather } from '../../src/domain/cosmos';
import { content } from '../../src/domain/content';
import { replyVariants, responseSet, responseVersion } from '../../src/domain/replies';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
test('humor and strong language default on; pronouns default neutral', () => {
  expect(defaults.humor).toBe(true);
  expect(defaults.strongLanguage).toBe(true);
  expect(defaults.bossPronouns).toBe('they');
});
test('headings vary without repetition, use grammatical pronouns and respect plain mode', () => {
  let current: string | undefined;
  for (let i = 0; i < 100; i++) {
    const next = chooseHeading(true, true, current);
    expect(next).not.toBe(current);
    current = next;
  }
  for (const headline of headings) {
    expect(headline.templates.they).not.toMatch(/what's they|is they|does they|has they/i);
    for (const value of Object.values(headline.templates)) expect(value.endsWith('?')).toBe(true);
  }
  for (let i = 0; i < 50; i++) {
    const id = chooseHeading(false, false);
    expect(headings.find((h) => h.id === id)?.tone).toBe('plain');
    expect(headingText(id, 'he', false, false)).toMatch(/\bhe\b|\bhim\b|\bhis\b/);
  }
  expect(headingText('chef', 'she', false, false)).not.toMatch(/fuck|asshole|bullshit/i);
});
test('all 30 traced logos exist and adjacent navigation excludes the current logo', () => {
  const hashes = new Set<string>();
  for (let current = 0; current < avatarCount; current++) {
    for (const random of [() => 0, () => 0.5, () => 0.9999])
      expect(randomLogo(current, random)).not.toBe(current);
    const svg = readFileSync(`public/avatars/${String(current + 1).padStart(2, '0')}.svg`, 'utf8');
    expect(svg).toContain('<path');
    expect(svg).not.toMatch(/<image|<script|href=/);
    hashes.add(createHash('sha256').update(svg).digest('hex'));
  }
  expect(hashes.size).toBe(30);
});
test('daily card stays fixed for the day and excludes yesterday on rollover', () => {
  const first = dailyCard(undefined, '2026-11-04', () => 0.5);
  expect(dailyCard(first, '2026-11-04', () => 0)).toEqual(first);
  const next = dailyCard(first, '2026-11-05', () => 0.5);
  expect(next.cardId).not.toBe(first.cardId);
  expect(dailySchema.safeParse({ ...first, privateNote: 'must not persist' }).success).toBe(false);
  expect(Object.keys(first).sort()).toEqual(['cardId', 'day']);
});
test('offline astronomy returns physical phase data without behavioral predictions', () => {
  const weather = cosmicWeather(new Date('2024-04-08T18:21:00Z'));
  expect(weather.phase).toBe(0);
  expect(weather.illuminated).toBeLessThan(1);
  expect(['retrograde', 'direct', 'stationary']).toContain(weather.mercury);
  expect(weather).not.toHaveProperty('behavior');
});
test('professional variants cover all situations and keep profanity in the private voice', () => {
  for (const s of content.scenarios) {
    expect(replyVariants[s.id]).toBeDefined();
    const first = responseVersion(s.id);
    expect(responseVersion(s.id)).not.toBe(first);
    for (let v = 0; v < 3; v++)
      for (const response of Object.values(responseSet(s, v)))
        expect(response).not.toMatch(
          /\b(fuck|asshole|motherfucker|bullshit|narcissist|psychopath)\b/i,
        );
  }
});
