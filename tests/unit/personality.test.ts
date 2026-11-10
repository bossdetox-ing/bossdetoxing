import { expect, test } from 'vitest';
import { defaults } from '../../src/browser/settings';
import { headings, chooseHeading, headingText } from '../../src/domain/headings';
import { randomLogo, avatarCount } from '../../src/domain/logo';
import { dailyCard, dailySchema } from '../../src/domain/daily';
import { cosmicWeather } from '../../src/domain/cosmos';
import { horoscope } from '../../src/domain/horoscope';
import { disguiseTitle } from '../../src/domain/disguise';
import { withBossName, cleanBossName } from '../../src/domain/boss-name';
import { headingText as heading } from '../../src/domain/headings';
import { artCredit, cardArt } from '../../src/domain/card-art';
import { tarot } from '../../src/domain/tarot';
import { content } from '../../src/domain/content';
import { replyVariants, responseSet, responseVersion } from '../../src/domain/replies';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
test('strong language defaults on; pronouns default neutral', () => {
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
test('sky model matches known 2026 events', () => {
  const nov4 = cosmicWeather(new Date('2026-11-04T13:55:00Z'));
  const planet = (sky: typeof nov4, id: string) => sky.planets.find((p) => p.id === id)!;
  expect(planet(nov4, 'mercury')).toMatchObject({ sign: 7, retrograde: true }); // Scorpio
  expect(planet(nov4, 'venus')).toMatchObject({ sign: 6, retrograde: true }); // Libra
  expect(planet(nov4, 'saturn')).toMatchObject({ sign: 0, retrograde: true }); // Aries
  expect(nov4.nextNewMoon!.toISOString().slice(0, 10)).toBe('2026-11-09');
  expect(nov4.nextFullMoon!.toISOString().slice(0, 10)).toBe('2026-11-24');
  expect(planet(cosmicWeather(new Date('2026-11-13T12:00:00Z')), 'mercury').station).toBe('direct');
  expect(cosmicWeather(new Date('2026-08-11T12:00:00Z')).eclipses[0]?.kind).toBe('solar');
  expect(cosmicWeather(new Date('2026-08-27T12:00:00Z')).eclipses[0]?.kind).toBe('lunar');
});
test('boss forecast reads every real event and ranks the loudest first', () => {
  const time = (date: Date) => date.toISOString();
  const eclipse = horoscope(cosmicWeather(new Date('2026-08-11T12:00:00Z')), time);
  expect(eclipse.headline.title).toBe('Solar eclipse');
  const station = horoscope(cosmicWeather(new Date('2026-11-13T12:00:00Z')), time);
  expect(station.headline.title).toMatch(/stations direct/);
  for (let day = 0; day < 365; day += 5) {
    const { headline, rest } = horoscope(cosmicWeather(new Date(Date.UTC(2026, 0, 1 + day))), time);
    for (const reading of [headline, ...rest]) {
      expect(reading.title).not.toMatch(/undefined/);
      expect(reading.line.length).toBeGreaterThan(10);
    }
  }
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
test('tab title shows the real name only with a boss headshot', () => {
  expect(disguiseTitle('monkey-07')).toBe('bossdetox.ing — Your pocket ward');
  expect(disguiseTitle('gmail')).toBe('Gmail');
  expect(disguiseTitle('mail')).toBe('Inbox');
  expect(disguiseTitle('blank')).toBe('New tab');
});
test('every tarot card has a credited artwork sticker', () => {
  for (const card of tarot) {
    expect(cardArt(card.id)).toBe(`/art/famous/${card.id}.webp`);
    expect(artCredit(card.id)?.alt).toMatch(/\w{3}/);
  }
});
test('a named boss replaces pronouns and "the boss" in headings and forecasts', () => {
  expect(heading('doing', 'they', true, true, 'Balthazar')).toBe("What's Balthazar doing now?");
  expect(heading('doing', 'they', true, true, '  ')).toBe('What are they doing now?');
  expect(withBossName("The boss's mood flips fast.", 'Pazuzu')).toBe("Pazuzu's mood flips fast.");
  expect(withBossName('Nothing the boss decides now will stick.', 'Pazuzu')).toBe(
    'Nothing Pazuzu decides now will stick.',
  );
  expect(cleanBossName('  Damien   the   Omen ')).toBe('Damien the Omen');
});
