import { loadDaily } from '../../browser/daily';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Icon } from '../PixelIcon';
import { ArtCredit, CardCorner, CardLetter, lordTitle } from '../ArtCredit';
import { CardGlass } from '../CardGlass';
import { ShareCard } from '../ShareCard';
import { TicketCard } from '../TicketCard';
import { tarot } from '../../domain/tarot';
import { dailyCard } from '../../domain/daily';
import { cardArt, isSticker } from '../../domain/card-art';
import { cosmicWeather } from '../../domain/cosmos';
import { horoscope, moonReading, type Reading } from '../../domain/horoscope';
import { cleanBossName, withBossName } from '../../domain/boss-name';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { localDay } from '../../domain/calendar';
import { messages as t } from '../../content';
import type { Navigate } from '../App';
// The shuffle plays once per app launch, not on every return to this view.
let shuffled = false;
// The clandrei palette is set before the first render (pwa/main.tsx, entrypoints/sidepanel).
const ticket = () => document.documentElement.dataset.palette === 'clandrei';
export function Daily({
  navigate,
  strongLanguage,
  timeZone,
  bossName,
}: {
  navigate: Navigate;
  strongLanguage: boolean;
  timeZone: string;
  bossName: string;
}) {
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState<ReturnType<typeof dailyCard>>();
  const [error, setError] = useState(false);
  const [shuffle] = useState(() => !shuffled);
  useEffect(() => {
    shuffled = true;
  }, []);
  const day = localDay(now.toISOString());
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const card = await loadDaily(day);
        if (active) {
          setSelected(card);
          setError(false);
        }
      } catch {
        if (active) {
          setSelected((current) => (current?.day === day ? current : dailyCard(undefined, day)));
          setError(true);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [day]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const weather = useMemo(() => cosmicWeather(now, timeZone), [now, timeZone]);
  const { date, moon, forecast } = useMemo(() => {
    const zone = weather.timeZone;
    const day = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: zone });
    const time = new Intl.DateTimeFormat('en', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: zone,
    });
    const at = (value: Date) => time.format(value);
    return {
      date: (value?: Date) => (value ? day.format(value) : ''),
      moon: moonReading(weather, at),
      forecast: horoscope(weather, at),
    };
  }, [weather]);
  const card =
    selected?.day === day ? tarot.find((card) => card.id === selected.cardId) : undefined;
  return (
    <div className="daily-view">
      <Card className="cosmic-weather">
        <span className="moon-icon" aria-hidden="true">
          <img src={`/moon/phase-${weather.phase}.png`} alt="" />
          <img className="moon-sign" src={moon.sign} alt="" />
        </span>
        <div className="moon-heading">
          <h2>{moon.title}</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button className="icon-button" aria-label={t.sky.moonDates}>
                <Icon name="info" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="info-popover">
              <p>
                {t.sky.nextNew} {date(weather.nextNewMoon)}
              </p>
              <p>
                {t.sky.nextFull} {date(weather.nextFullMoon)}
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <p>
          {weather.phase === 4 && strongLanguage
            ? t.cosmic.fullUnfiltered
            : withBossName(moon.line, bossName)}
        </p>
        <section className="forecast">
          <SkyReading reading={forecast.headline} bossName={bossName} />
        </section>
        <Accordion type="single" collapsible className="forecast-rest">
          <AccordionItem value="rest">
            <AccordionTrigger>{t.sky.rest}</AccordionTrigger>
            <AccordionContent>
              <ul>
                {forecast.rest.map((reading) => (
                  <li key={reading.key}>
                    <SkyReading reading={reading} bossName={bossName} />
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
      <Button className="primary daily-help" onClick={() => navigate('situations')}>
        {cleanBossName(bossName)
          ? t.daily.helpNamed.replace('{name}', cleanBossName(bossName))
          : strongLanguage
            ? t.daily.helpStrong
            : t.daily.help}
      </Button>
      {card ? (
        <div className="tarot-stack" data-shuffle={shuffle || undefined}>
          {/* Decorative backs; the Browse button below is the accessible route. */}
          {(['left', 'right'] as const).map((side) => (
            <button
              key={side}
              type="button"
              className="tarot-back"
              data-side={side}
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => navigate('tarot')}
            />
          ))}
          {ticket() ? (
            <>
              <TicketCard card={card} day={day} sky={weather} />
              {/* Face-down top card for the shuffle; it flips away to reveal today's card. */}
              {shuffle && <span className="tarot-flip" aria-hidden="true" />}
            </>
          ) : (
            <Card
              role="article"
              className="tarot-card daily-card"
              data-arcana={card.id}
              data-suit={card.suit ?? 'major'}
              data-card-id={card.id}
              data-day={day}
            >
              <CardGlass src={cardArt(card.id)} />
              <h1 className="daily-label" tabIndex={-1}>
                {t.daily.title}
              </h1>
              <img
                className="tarot-art"
                data-sticker={isSticker(card.id) || undefined}
                src={cardArt(card.id)}
                alt={card.fictionalSymbolism}
              />
              <CardCorner card={card} sky={weather} />
              <ArtCredit card={card} sky={weather} />
              <h2>{card.title}</h2>
              {card.traditionalName !== card.title && (
                <p className="arcana-name">{card.traditionalName}</p>
              )}
              {lordTitle(card) && <p className="arcana-lord">{lordTitle(card)}</p>}
              <CardLetter card={card} />
              <p className="mantra">{card.groundedMantra}</p>
              <p>{card.nextAction}</p>
            </Card>
          )}
        </div>
      ) : (
        <p role="status">{t.busy}</p>
      )}
      {error && <p role="alert">{t.daily.failed}</p>}
      {card && !ticket() && <ShareCard card={card} className="daily-share" />}
      <Button className="daily-browse" onClick={() => navigate('tarot')}>
        {t.daily.deck}
      </Button>
    </div>
  );
}
function SkyReading({ reading, bossName }: { reading: Reading; bossName: string }) {
  return (
    <div className="sky-reading">
      <span className="sky-icons" aria-hidden="true">
        {reading.icons.map((icon) => (
          <img key={icon} src={icon} alt="" />
        ))}
      </span>
      <h3>{reading.title}</h3>
      {reading.when && <p className="cosmic-meta">{reading.when}</p>}
      <p>{withBossName(reading.line, bossName)}</p>
    </div>
  );
}
