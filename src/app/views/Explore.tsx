import { cosmicWeather } from '../../domain/cosmos';
import { TicketCard, paintStyle } from '../TicketCard';
import { ShareCard } from '../ShareCard';
import { artCredit, cardArt, isSticker } from '../../domain/card-art';
import { correspondenceLabel, lordTitle } from '../ArtCredit';
import { Icon } from '../PixelIcon';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { useState } from 'react';
import { messages as t } from '../../content';
import { content } from '../../domain/content';
import { shuffled } from '../../domain/session';
import { PageTitle } from '../components';

// Everything a reader might search for: names, titles, sky, lines on the card and the painting.
const searchText = (card: (typeof content.tarot)[number]) => {
  const credit = artCredit(card.id);
  return [
    card.title,
    card.traditionalName,
    lordTitle(card),
    correspondenceLabel(card),
    card.fictionalSymbolism,
    card.groundedMantra,
    card.nextAction,
    credit?.artist,
    credit?.work,
  ]
    .join(' ')
    .toLowerCase();
};
export function Tarot() {
  const cards = content.tarot;
  // Drawing walks a shuffled copy, so repeated draws show every card before any repeats.
  const [deck] = useState(() => shuffled(cards));
  const [draws, setDraws] = useState(0);
  const [open, setOpen] = useState<number>();
  // Today's real sky, for the cards it echoes; the zone only matters for displayed times.
  const [sky] = useState(() => cosmicWeather(new Date()));
  const [pointer, setPointer] = useState<{ x: number; y: number }>();
  const [query, setQuery] = useState('');
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = cards
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => words.every((word) => searchText(item).includes(word)));
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
      <input
        className="search-field"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.deck.search}
        aria-label={t.deck.search}
      />
      <section className="deck-grid" aria-label={t.deck.choose}>
        {visible.map(({ item, index }) => (
          <Button key={item.id} onClick={() => setOpen(index)} style={paintStyle(item.id)}>
            <span className="deck-window">
              <img
                src={cardArt(item.id)}
                data-sticker={isSticker(item.id) || undefined}
                alt=""
                loading="lazy"
              />
            </span>
            <span>{item.title}</span>
            {item.traditionalName !== item.title && <small>{item.traditionalName}</small>}
          </Button>
        ))}
      </section>
      {visible.length === 0 && <p className="muted">{t.deck.noResults}</p>}
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
            <TicketCard
              card={card}
              sky={sky}
              title={
                <DialogTitle asChild>
                  <h2>{card.title}</h2>
                </DialogTitle>
              }
              cardProps={{
                onPointerDown: (event) => setPointer({ x: event.clientX, y: event.clientY }),
                onPointerUp: (event) => {
                  const dx = pointer ? event.clientX - pointer.x : 0;
                  if (
                    pointer &&
                    Math.abs(dx) > 60 &&
                    Math.abs(dx) > Math.abs(event.clientY - pointer.y) * 1.5
                  )
                    step(dx < 0 ? 1 : -1);
                  setPointer(undefined);
                },
              }}
            />
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
