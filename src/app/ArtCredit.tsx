import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { artCredit } from '../domain/card-art';
import { correspondence, esoteric, glyphIcon, inSky, type Glyph } from '../domain/correspondence';
import type { Sky } from '../domain/cosmos';
import type { tarot } from '../domain/tarot';
import { messages as t } from '../content';
import { Icon } from './PixelIcon';

type Card = (typeof tarot)[number];
const glyphName = (glyph: Glyph) =>
  glyph.kind === 'sign'
    ? t.sky.signs[glyph.sign]!
    : glyph.kind === 'element'
      ? t.sky.elements[glyph.element]
      : t.sky.bodies[glyph.planet];
export const correspondenceLabel = (card: Card) =>
  correspondence(card).glyphs.map(glyphName).join(' in ');

// The Book T title of a pip (2–10), e.g. "Lord of Swiftness".
export function lordTitle(card: Card) {
  const lord = esoteric(card).lord;
  return lord
    ? t.card.lord.replace(
        '{title}',
        t.card.lords[lord.suit as keyof typeof t.card.lords][lord.number - 2]!,
      )
    : undefined;
}
// Majors carry their Golden Dawn Hebrew letter in the bottom-right corner.
export function CardLetter({ card }: { card: Card }) {
  const letter = esoteric(card).letter;
  return letter ? (
    <span className="card-letter" lang="he" aria-hidden="true">
      {letter.glyph}
    </span>
  ) : null;
}
function loreLines(card: Card) {
  const lore = esoteric(card);
  const lines: string[] = [];
  if (lore.letter) {
    const [name, meaning] = t.card.letters[lore.letter.index]!;
    lines.push(t.card.hebrew.replace('{name}', name!).replace('{meaning}', meaning!));
  }
  if (lore.sefirah !== undefined) {
    const [name, meaning] = t.card.sefirot[lore.sefirah]!;
    lines.push(t.card.sefirah.replace('{name}', name!).replace('{meaning}', meaning!));
  }
  return lines;
}

// Top-left corner: numeral or rank, its Golden Dawn glyphs, and a mark when the sky matches.
export function CardCorner({ card, sky }: { card: Card; sky?: Sky }) {
  const { numeral, glyphs } = correspondence(card);
  return (
    <div className="card-corner" aria-hidden="true">
      <span className="corner-row">
        <span className="card-numeral">{numeral}</span>
        {glyphs.map((glyph) => (
          <img key={glyphIcon(glyph)} src={glyphIcon(glyph)} alt="" />
        ))}
      </span>
      {sky && inSky(card, sky) && <span className="sky-badge">{t.card.inSky}</span>}
    </div>
  );
}

// The ⓘ popover: the painting behind the sticker and the card's correspondence.
export function ArtCredit({ card, sky }: { card: Card; sky?: Sky }) {
  const credit = artCredit(card.id);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="icon-button art-credit" aria-label={t.artCredit}>
          <Icon name="info" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="info-popover">
        {credit && (
          <>
            <p className="art-credit-work">{credit.work}</p>
            <p>
              {credit.artist}, {credit.year}
            </p>
          </>
        )}
        <p className="cosmic-meta">
          {t.card.correspondence.replace('{label}', correspondenceLabel(card))}
        </p>
        {loreLines(card).map((line) => (
          <p key={line} className="cosmic-meta">
            {line}
          </p>
        ))}
        {sky && inSky(card, sky) && <p className="cosmic-meta">{t.card.inSkyNote}</p>}
      </PopoverContent>
    </Popover>
  );
}
