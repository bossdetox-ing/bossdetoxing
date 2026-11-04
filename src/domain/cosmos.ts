import { Body, Ecliptic, GeoVector, Illumination, MoonPhase } from 'astronomy-engine';
// Astronomy depends only on the instant; the zone only decides which local date/time is shown.
export function cosmicWeather(now: Date, timeZone = '') {
  const angle = MoonPhase(now);
  const phase = Math.floor((angle + 22.5) / 45) % 8;
  const before = Ecliptic(GeoVector(Body.Mercury, new Date(now.getTime() - 43200000), true)).elon;
  const after = Ecliptic(GeoVector(Body.Mercury, new Date(now.getTime() + 43200000), true)).elon;
  const motion = ((after - before + 540) % 360) - 180;
  return {
    phase,
    illuminated: Math.round(Illumination(Body.Moon, now).phase_fraction * 100),
    mercury: motion < -0.01 ? 'retrograde' : motion > 0.01 ? 'direct' : 'stationary',
    timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
