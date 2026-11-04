import {
  Body,
  Ecliptic,
  GeoVector,
  Illumination,
  MoonPhase,
  SearchGlobalSolarEclipse,
  SearchLunarEclipse,
  SearchMoonPhase,
} from 'astronomy-engine';

const HOUR = 3600000;
const DAY = 24 * HOUR;
// Geocentric ecliptic longitude: the tropical zodiac astrologers use.
const longitude = (body: Body, at: Date) => Ecliptic(GeoVector(body, at, true)).elon;
const signOf = (lon: number) => Math.floor(lon / 30) % 12;
const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;
// Apparent motion over a day; negative means the planet appears to move backwards.
function motion(body: Body, at: Date) {
  const before = longitude(body, new Date(at.getTime() - DAY / 2));
  const after = longitude(body, new Date(at.getTime() + DAY / 2));
  return ((after - before + 540) % 360) - 180;
}

const bodies = {
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
} as const;
export type SkyBody = keyof typeof bodies;
const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;
export type Planet = (typeof planets)[number];

// Major aspects and the 3° orb used for transits worth a headline.
export const aspects = [
  ['conjunction', 0],
  ['sextile', 60],
  ['square', 90],
  ['trine', 120],
  ['opposition', 180],
] as const;
export type Aspect = (typeof aspects)[number][0];
const ORB = 3;
// Planet pairs with an office meaning; the slower planet comes first.
export const pairs = [
  ['saturn', 'mercury'],
  ['mars', 'mercury'],
  ['jupiter', 'mercury'],
  ['mars', 'venus'],
  ['saturn', 'mars'],
  ['saturn', 'jupiter'],
  ['saturn', 'sun'],
  ['mars', 'sun'],
] as const;
type PairOf<T> = T extends readonly [infer A extends string, infer B extends string]
  ? `${A}-${B}`
  : never;
export type Pair = PairOf<(typeof pairs)[number]>;

function aspectBetween(a: number, b: number) {
  const separation = Math.abs(((a - b + 540) % 360) - 180);
  for (const [name, angle] of aspects) {
    const orb = Math.abs(separation - angle);
    if (orb <= ORB) return { aspect: name, separation, orb };
  }
  return undefined;
}

// The Moon is void of course after its last major aspect to a planet before it changes sign.
// Planets barely move in two days, so they are interpolated; the Moon is sampled hourly.
function voidOfCourse(now: Date, moonNow: number) {
  const start = signOf(moonNow);
  const samples = [moonNow];
  let hours = 0;
  while (hours < 72) {
    hours += 1;
    const lon = longitude(Body.Moon, new Date(now.getTime() + hours * HOUR));
    if (signOf(lon) !== start) break;
    samples.push(lon);
  }
  const ingress = new Date(now.getTime() + hours * HOUR);
  for (const key of ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
    const from = longitude(bodies[key], now);
    const drift = ((longitude(bodies[key], ingress) - from + 540) % 360) - 180;
    for (let i = 1; i < samples.length; i++) {
      const planetBefore = from + (drift * (i - 1)) / hours;
      const planetAfter = from + (drift * i) / hours;
      const before = wrap(samples[i - 1]! - planetBefore);
      const after = wrap(samples[i]! - planetAfter);
      for (const [, angle] of aspects)
        for (const target of angle === 0 || angle === 180 ? [angle] : [angle, 360 - angle]) {
          const crossed =
            target === 0 ? after < before : before <= target && after >= target && after > before;
          if (crossed) return undefined;
        }
    }
  }
  return { until: ingress };
}

// Astronomy depends only on the instant; the zone only decides which local date/time is shown.
export function cosmicWeather(now: Date, timeZone = '') {
  const phase = Math.floor((MoonPhase(now) + 22.5) / 45) % 8;
  const lon = Object.fromEntries(
    Object.entries(bodies).map(([key, body]) => [key, longitude(body, now)]),
  ) as Record<SkyBody, number>;
  const mercuryMotion = motion(Body.Mercury, now);
  const lunar = SearchLunarEclipse(now);
  const solar = SearchGlobalSolarEclipse(new Date(now.getTime() - 3 * DAY));
  const eclipses = [
    { kind: 'lunar' as const, peak: lunar.peak.date },
    { kind: 'solar' as const, peak: solar.peak.date },
  ].filter(
    (e) =>
      e.peak.getTime() - now.getTime() < 14 * DAY && now.getTime() - e.peak.getTime() < 3 * DAY,
  );
  return {
    phase,
    illuminated: Math.round(Illumination(Body.Moon, now).phase_fraction * 100),
    mercury: mercuryMotion < -0.01 ? 'retrograde' : mercuryMotion > 0.01 ? 'direct' : 'stationary',
    moon: { sign: signOf(lon.moon) },
    sun: { sign: signOf(lon.sun) },
    planets: planets.map((id) => {
      const today = motion(bodies[id], now) < 0;
      // A station: the planet changes direction within two days either side.
      const before = motion(bodies[id], new Date(now.getTime() - 2 * DAY)) < 0;
      const after = motion(bodies[id], new Date(now.getTime() + 2 * DAY)) < 0;
      return {
        id,
        sign: signOf(lon[id]),
        retrograde: today,
        station:
          before !== after ? (after ? ('retrograde' as const) : ('direct' as const)) : undefined,
      };
    }),
    aspects: pairs
      .map(([a, b]) => {
        const found = aspectBetween(lon[a], lon[b]);
        return found && { pair: `${a}-${b}` as Pair, a, b, ...found };
      })
      .filter((found) => found !== undefined)
      .sort((x, y) => x.orb - y.orb),
    voidOfCourse: voidOfCourse(now, lon.moon),
    eclipses,
    nextNewMoon: SearchMoonPhase(0, now, 40)?.date,
    nextFullMoon: SearchMoonPhase(180, now, 40)?.date,
    timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
export type Sky = ReturnType<typeof cosmicWeather>;
