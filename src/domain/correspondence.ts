import type { Sky } from './cosmos';
import type { tarot } from './tarot';

// Golden Dawn correspondences, the attributions most modern decks follow. Signs are 0 = Aries.
type Card = (typeof tarot)[number];
export type Glyph =
  | { kind: 'sign'; sign: number }
  | { kind: 'planet'; planet: Planet }
  | { kind: 'element'; element: Element };
type Planet = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
type Element = 'fire' | 'water' | 'air' | 'earth';

const sign = (s: number): Glyph => ({ kind: 'sign', sign: s });
const planet = (p: Planet): Glyph => ({ kind: 'planet', planet: p });
const element = (e: Element): Glyph => ({ kind: 'element', element: e });

const majors: Record<string, Glyph> = {
  'The Fool': element('air'),
  'The Magician': planet('mercury'),
  'The High Priestess': planet('moon'),
  'The Empress': planet('venus'),
  'The Emperor': sign(0),
  'The Hierophant': sign(1),
  'The Lovers': sign(2),
  'The Chariot': sign(3),
  Strength: sign(4),
  'The Hermit': sign(5),
  'Wheel of Fortune': planet('jupiter'),
  Justice: sign(6),
  'The Hanged One': element('water'),
  Death: sign(7),
  Temperance: sign(8),
  'The Devil': sign(9),
  'The Tower': planet('mars'),
  'The Star': sign(10),
  'The Moon': sign(11),
  'The Sun': planet('sun'),
  Judgement: element('fire'),
  'The World': planet('saturn'),
};
const suitElement: Record<string, Element> = {
  wands: 'fire',
  cups: 'water',
  swords: 'air',
  pentacles: 'earth',
};
// The decans: each pip 2–10 is a planet in a sign.
const decans: Record<string, [Planet, number][]> = {
  wands: [
    ['mars', 0],
    ['sun', 0],
    ['venus', 0],
    ['saturn', 4],
    ['jupiter', 4],
    ['mars', 4],
    ['mercury', 8],
    ['moon', 8],
    ['saturn', 8],
  ],
  cups: [
    ['venus', 3],
    ['mercury', 3],
    ['moon', 3],
    ['mars', 7],
    ['sun', 7],
    ['venus', 7],
    ['saturn', 11],
    ['jupiter', 11],
    ['mars', 11],
  ],
  swords: [
    ['moon', 6],
    ['saturn', 6],
    ['jupiter', 6],
    ['venus', 10],
    ['mercury', 10],
    ['moon', 10],
    ['jupiter', 2],
    ['mars', 2],
    ['sun', 2],
  ],
  pentacles: [
    ['jupiter', 9],
    ['mars', 9],
    ['sun', 9],
    ['mercury', 1],
    ['moon', 1],
    ['saturn', 1],
    ['sun', 5],
    ['venus', 5],
    ['mercury', 5],
  ],
};
const roman = [
  '0',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX',
  'XXI',
];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'P', 'Kn', 'Q', 'K'];

export function correspondence(card: Card) {
  if (card.arcana === 'major')
    return { numeral: roman[card.number]!, glyphs: [majors[card.traditionalName]!] };
  const decan =
    card.number >= 2 && card.number <= 10 ? decans[card.suit!]![card.number - 2] : undefined;
  return {
    numeral: ranks[card.number - 1]!,
    glyphs: decan ? [planet(decan[0]), sign(decan[1])] : [element(suitElement[card.suit!]!)],
  };
}

// A card is "in today's sky" when the real sky repeats its attribution right now.
export function inSky(card: Card, sky: Sky) {
  const glyphs = correspondence(card).glyphs;
  const planetSign = (p: Planet) =>
    p === 'moon'
      ? sky.moon.sign
      : p === 'sun'
        ? sky.sun.sign
        : sky.planets.find((x) => x.id === p)!.sign;
  if (glyphs.length === 2) {
    const [p, s] = glyphs as [{ kind: 'planet'; planet: Planet }, { kind: 'sign'; sign: number }];
    return planetSign(p.planet) === s.sign;
  }
  const only = glyphs[0]!;
  if (only.kind === 'sign') return sky.moon.sign === only.sign || sky.sun.sign === only.sign;
  if (only.kind === 'planet' && only.planet !== 'sun' && only.planet !== 'moon')
    return sky.planets.find((x) => x.id === only.planet)!.retrograde;
  if (only.kind === 'planet' && only.planet === 'moon') return sky.phase === 0 || sky.phase === 4;
  return false;
}

const signFile = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];
// Local images only: Fluent Emoji 3D zodiac, Sun, Saturn and full moon; drawn planets and elements.
export function glyphIcon(glyph: Glyph) {
  if (glyph.kind === 'sign') return `/sky/${signFile[glyph.sign]}.png`;
  if (glyph.kind === 'element') return `/sky/${glyph.element}.svg`;
  if (glyph.planet === 'moon') return '/moon/phase-4.png';
  return `/sky/${glyph.planet}.${glyph.planet === 'sun' || glyph.planet === 'saturn' ? 'png' : 'svg'}`;
}

// Golden Dawn Hebrew letters for the Major Arcana, by traditional name.
const hebrew: Record<string, number> = {
  'The Fool': 0,
  'The Magician': 1,
  'The High Priestess': 2,
  'The Empress': 3,
  'The Emperor': 4,
  'The Hierophant': 5,
  'The Lovers': 6,
  'The Chariot': 7,
  Strength: 8,
  'The Hermit': 9,
  'Wheel of Fortune': 10,
  Justice: 11,
  'The Hanged One': 12,
  Death: 13,
  Temperance: 14,
  'The Devil': 15,
  'The Tower': 16,
  'The Star': 17,
  'The Moon': 18,
  'The Sun': 19,
  Judgement: 20,
  'The World': 21,
};
const letters = 'אבגדהוזחטיכלמנסעפצקרשת';

// The esoteric layers beyond astrology: a Hebrew letter for each major, a Sefirah for each
// numbered minor (Ace = Kether ... Ten = Malkuth) and the Book T "Lord of" title for pips 2–10.
export function esoteric(card: Card) {
  if (card.arcana === 'major') {
    const index = hebrew[card.traditionalName]!;
    return { letter: { index, glyph: letters[index]! } };
  }
  if (card.number > 10) return {};
  return {
    sefirah: card.number - 1,
    lord: card.number >= 2 ? { suit: card.suit!, number: card.number } : undefined,
  };
}
