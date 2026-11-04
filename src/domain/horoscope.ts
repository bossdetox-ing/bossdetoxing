import type { Sky } from './cosmos';
import { messages as t } from '../content';

// `when` is set only for events with a time worth showing (eclipses).
export type Reading = { key: string; title: string; when?: string; line: string; icons: string[] };
const c = t.sky;
// Local images only: Fluent Emoji 3D for the zodiac, Sun and Saturn; drawn SVGs for the rest.
const signIcon = (sign: number) => `/sky/${c.signs[sign]!.toLowerCase()}.png`;
const bodyIcon = (body: string, phase: number) =>
  body === 'moon'
    ? `/moon/phase-${phase}.png`
    : `/sky/${body}.${body === 'sun' || body === 'saturn' ? 'png' : 'svg'}`;
// Lines read "Observation. Action."; retrogrades keep their own observation with the sign's action.
const observation = (line: string) => line.slice(0, line.indexOf('. ') + 1);
const action = (line: string) => line.slice(line.indexOf('. ') + 2);

// The Moon block reads the phase, the Moon's sign and the void-of-course window together;
// the window's end time is in the line itself.
export function moonReading(sky: Sky, time: (date: Date) => string) {
  const sign = c.signs[sky.moon.sign]!;
  return {
    title: `${t.cosmic.phases[sky.phase]} in ${sign}`,
    sign: signIcon(sky.moon.sign),
    line: sky.voidOfCourse
      ? c.voidLine.replace('{time}', time(sky.voidOfCourse.until))
      : c.inSign.moon[sky.moon.sign]!,
  };
}

// Every planet reading pairs a real event with a fictional boss forecast, loudest first:
// eclipse, station, Mercury retrograde, hard aspect, other retrograde, soft aspect, planet in sign.
export function horoscope(sky: Sky, time: (date: Date) => string) {
  const ranked: [number, Reading][] = [];
  for (const eclipse of sky.eclipses) {
    const { title, line } = c.eclipse[eclipse.kind];
    const icons =
      eclipse.kind === 'solar' ? [bodyIcon('sun', 0), bodyIcon('moon', 0)] : [bodyIcon('moon', 4)];
    ranked.push([100, { key: eclipse.kind, title, when: time(eclipse.peak), line, icons }]);
  }
  for (const planet of sky.planets) {
    const name = c.bodies[planet.id];
    const sign = c.signs[planet.sign]!;
    const icons = [bodyIcon(planet.id, sky.phase), signIcon(planet.sign)];
    const inSign =
      planet.id in c.inSign ? c.inSign[planet.id as keyof typeof c.inSign][planet.sign] : undefined;
    if (planet.station)
      ranked.push([
        80,
        {
          key: `${planet.id}-station`,
          title: `${name} ${c.stations[planet.station]} in ${sign}`,
          icons,
          line: `${name} ${c.station[planet.station]}`,
        },
      ]);
    else if (planet.retrograde)
      ranked.push([
        planet.id === 'mercury' ? 70 : 50,
        {
          key: planet.id,
          title: `${name} ${c.retrograde} in ${sign}`,
          icons,
          line: inSign
            ? `${observation(c.retro[planet.id])} ${action(inSign)}`
            : c.retro[planet.id],
        },
      ]);
    else if (inSign)
      ranked.push([
        planet.id === 'mercury' ? 30 : 20,
        { key: planet.id, title: `${name} in ${sign}`, icons, line: inSign },
      ]);
  }
  for (const found of sky.aspects) {
    const tone =
      found.aspect === 'conjunction'
        ? 'conjunction'
        : found.aspect === 'square' || found.aspect === 'opposition'
          ? 'hard'
          : 'soft';
    ranked.push([
      tone === 'hard' ? 60 : 40,
      {
        key: found.pair,
        title: `${c.bodies[found.a]} ${c.verbs[found.aspect]} ${c.bodies[found.b]}`,
        icons: [bodyIcon(found.a, sky.phase), bodyIcon(found.b, sky.phase)],
        line: c.pairs[found.pair][tone],
      },
    ]);
  }
  const readings = ranked.sort((a, b) => b[0] - a[0]).map(([, reading]) => reading);
  return { headline: readings[0]!, rest: readings.slice(1) };
}
