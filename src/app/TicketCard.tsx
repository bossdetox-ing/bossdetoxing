import type { CSSProperties } from 'react';
import { Card } from '../components/ui/card';
import { ArtCredit, CardCorner, CardLetter, correspondenceLabel, lordTitle } from './ArtCredit';
import { ShareCard } from './ShareCard';
import { cardArt, isSticker } from '../domain/card-art';
import type { Sky } from '../domain/cosmos';
import type { tarot } from '../domain/tarot';
import tints from '../content/card-tints.json';
import { messages as t } from '../content';

type Card = (typeof tarot)[number];
const tint = tints as Record<
  string,
  { hi: string; lo: string; base: string; stub: string; stubDark: string }
>;

// With the clandrei palette (data-palette="clandrei"), today's card is a ticket. The art sits in a
// window tinted from its own painting, a frosted sheet carries the title and mantra, and the
// reply line tears off as a stub in the painting's colour, light or deep to suit the theme.
export function TicketCard({ card, day, sky }: { card: Card; day: string; sky: Sky }) {
  const art = cardArt(card.id);
  const colours = tint[card.id];
  const style = (
    colours
      ? {
          '--win-hi': colours.hi,
          '--win-lo': colours.lo,
          '--paint': colours.base,
          '--stub-light': colours.stub,
          '--stub-dark': colours.stubDark,
        }
      : {}
  ) as CSSProperties;
  return (
    <div className="ticket" data-suit={card.suit ?? 'major'} style={style}>
      <Card
        role="article"
        className="tarot-card daily-card ticket-card"
        data-arcana={card.id}
        data-suit={card.suit ?? 'major'}
        data-card-id={card.id}
        data-day={day}
      >
        <div className="ticket-inner">
          <span className="ticket-wash" aria-hidden="true">
            <img src={art} alt="" />
          </span>
          <div className="ticket-window">
            <CardCorner card={card} sky={sky} />
            <ArtCredit card={card} sky={sky} />
            <img
              className="tarot-art"
              data-sticker={isSticker(card.id) || undefined}
              src={art}
              alt={card.fictionalSymbolism}
            />
            <CardLetter card={card} />
          </div>
          <div className="ticket-glass">
            <h1 className="daily-label" tabIndex={-1}>
              {t.daily.title}
            </h1>
            <div className="ticket-head">
              <h2>{card.title}</h2>
              <ShareCard card={card} className="ticket-share" />
            </div>
            <p className="ticket-pair">
              <span>{card.traditionalName}</span>
              <i aria-hidden="true" />
              <span>{lordTitle(card) ?? correspondenceLabel(card)}</span>
            </p>
            <p className="mantra">{card.groundedMantra}</p>
          </div>
        </div>
      </Card>
      <div className="ticket-stub">
        <span className="stub-label">
          {t.replyRows.say} · {t.replyRows.write}
        </span>
        <p>{card.nextAction}</p>
      </div>
    </div>
  );
}
