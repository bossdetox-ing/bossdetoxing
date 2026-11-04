import { ArtCredit, CardCorner, CardLetter, lordTitle } from '../ArtCredit';
import { cosmicWeather } from '../../domain/cosmos';
import { CardGlass } from '../CardGlass';
import { ShareCard } from '../ShareCard';
import { cardArt, isSticker } from '../../domain/card-art';
import { Icon } from '../PixelIcon';
import { Card } from '../../components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { useState } from 'react';
import { messages as t } from '../../content';
import { content } from '../../domain/content';
import { shuffled } from '../../domain/session';
import { PageTitle } from '../components';

export function Tarot() {
  const cards = content.tarot;
  // Drawing walks a shuffled copy, so repeated draws show every card before any repeats.
  const [deck] = useState(() => shuffled(cards));
  const [draws, setDraws] = useState(0);
  const [open, setOpen] = useState<number>();
  // Today's real sky, for the cards it echoes; the zone only matters for displayed times.
  const [sky] = useState(() => cosmicWeather(new Date()));
  const [pointer, setPointer] = useState<{ x: number; y: number }>();
  const card = open === undefined ? undefined : cards[open];
  const step = (by: number) =>
    setOpen((index) => (index === undefined ? index : (index + by + cards.length) % cards.length));
  function draw() {
    const drawn = deck[draws % deck.length]!;
    setDraws((value) => value + 1);
    setOpen(cards.findIndex((c) => c.id === drawn.id));
  }
  return (
    <>
      <PageTitle>{t.tarot}</PageTitle>
      <Button className="primary" onClick={draw}>
        {t.draw}
      </Button>
      <section className="deck-grid" aria-label={t.deck.choose}>
        {cards.map((item, index) => (
          <Button key={item.id} onClick={() => setOpen(index)}>
            <CardGlass src={cardArt(item.id)} />
            <img
              src={cardArt(item.id)}
              data-sticker={isSticker(item.id) || undefined}
              alt=""
              loading="lazy"
            />
            <span>{item.title}</span>
            {item.traditionalName !== item.title && <small>{item.traditionalName}</small>}
          </Button>
        ))}
      </section>
      <Dialog open={card !== undefined} onOpenChange={(next) => !next && setOpen(undefined)}>
        {card && open !== undefined && (
          <DialogContent
            aria-describedby={undefined}
            // Escape closes the card here instead of hiding and locking the whole app.
            onEscapeKeyDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') step(1);
              if (event.key === 'ArrowLeft') step(-1);
            }}
          >
            <div className="dialog-bar">
              <span className="dialog-count">
                {t.deck.position
                  .replace('{n}', String(open + 1))
                  .replace('{total}', String(cards.length))}
              </span>
              <DialogClose asChild>
                <Button className="icon-button" aria-label={t.deck.close}>
                  <Icon name="close" />
                </Button>
              </DialogClose>
            </div>
            <Card
              role="article"
              className="tarot-card"
              data-arcana={card.id}
              data-suit={card.suit ?? 'major'}
              onPointerDown={(event) => setPointer({ x: event.clientX, y: event.clientY })}
              onPointerUp={(event) => {
                const dx = pointer ? event.clientX - pointer.x : 0;
                if (
                  pointer &&
                  Math.abs(dx) > 60 &&
                  Math.abs(dx) > Math.abs(event.clientY - pointer.y) * 1.5
                )
                  step(dx < 0 ? 1 : -1);
                setPointer(undefined);
              }}
            >
              <CardGlass src={cardArt(card.id)} />
              <img
                className="tarot-art"
                data-sticker={isSticker(card.id) || undefined}
                src={cardArt(card.id)}
                alt={card.fictionalSymbolism}
              />
              <CardCorner card={card} sky={sky} />
              <ArtCredit card={card} sky={sky} />
              <DialogTitle asChild>
                <h2>{card.title}</h2>
              </DialogTitle>
              {card.traditionalName !== card.title && (
                <p className="arcana-name">{card.traditionalName}</p>
              )}
              {lordTitle(card) && <p className="arcana-lord">{lordTitle(card)}</p>}
              <CardLetter card={card} />
              <p className="symbolism">{card.fictionalSymbolism}</p>
              <p className="mantra">{card.groundedMantra}</p>
              <p>{card.nextAction}</p>
            </Card>
            <div className="dialog-nav">
              <Button aria-label={t.deck.previous} onClick={() => step(-1)}>
                <Icon name="back" />
              </Button>
              <ShareCard card={card} className="dialog-share" />
              <Button aria-label={t.deck.next} onClick={() => step(1)}>
                <Icon name="next" />
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
