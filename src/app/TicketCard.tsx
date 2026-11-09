import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Card } from '../components/ui/card';
import { ArtCredit, CardCorner, CardLetter, correspondenceLabel, lordTitle } from './ArtCredit';
import { ShareCard } from './ShareCard';
import { cardArt, isSticker } from '../domain/card-art';
import type { Sky } from '../domain/cosmos';
import { tarotReflection, type tarot } from '../domain/tarot';
import { ReadMore } from './components';
import tints from '../content/card-tints.json';
import { messages as t } from '../content';

type Card = (typeof tarot)[number];
const tint = tints as Record<
  string,
  { hi: string; lo: string; base: string; stub: string; stubDark: string }
>;

// The painting's colours as custom properties (scripts/card-tints.py), for cards and deck tiles.
export function paintStyle(id: string) {
  const colours = tint[id];
  return (
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
}

// A tarot card as a ticket: the art in a window tinted from its own painting, a frosted sheet
// with the title and mantra, and the reply line torn off as a stub in the painting's colour.
// Today's draw adds its label and share key; the deck dialog brings its own title and share.
export function TicketCard({
  card,
  sky,
  day,
  title,
  cardProps,
}: {
  card: Card;
  sky: Sky;
  day?: string;
  title?: ReactNode;
  cardProps?: HTMLAttributes<HTMLDivElement>;
}) {
  const art = cardArt(card.id);
  const daily = day !== undefined;
  return (
    <div className="ticket" data-suit={card.suit ?? 'major'} style={paintStyle(card.id)}>
      <Card
        role="article"
        className={daily ? 'tarot-card daily-card ticket-card' : 'tarot-card ticket-card'}
        data-arcana={card.id}
        data-suit={card.suit ?? 'major'}
        data-card-id={card.id}
        data-day={day}
        {...cardProps}
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
            {daily && (
              <h1 className="daily-label" tabIndex={-1}>
                {t.daily.title}
              </h1>
            )}
            <div className="ticket-head">
              {title ?? <h2>{card.title}</h2>}
              {daily && <ShareCard card={card} className="ticket-share" />}
            </div>
            <p className="ticket-pair">
              <span>{card.traditionalName}</span>
              <i aria-hidden="true" />
              <span>{lordTitle(card) ?? correspondenceLabel(card)}</span>
            </p>
            {!daily && <p className="symbolism">{card.fictionalSymbolism}</p>}
            <p className="mantra">{card.groundedMantra}</p>
            <ReadMore id={card.id} reflection={tarotReflection(card.id)} />
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
