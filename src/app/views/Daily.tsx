import { loadDaily } from '../../browser/daily';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { tarot } from '../../domain/tarot';
import { dailyCard } from '../../domain/daily';
import { cosmicWeather } from '../../domain/cosmos';
import { localDay } from '../../domain/calendar';
import { messages as t } from '../../content';
import { PageTitle } from '../components';
import type { Navigate } from '../App';
export function Daily({
  navigate,
  strongLanguage,
  timeZone,
}: {
  navigate: Navigate;
  strongLanguage: boolean;
  timeZone: string;
}) {
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState<ReturnType<typeof dailyCard>>();
  const [error, setError] = useState(false);
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
  const card =
    selected?.day === day ? tarot.find((card) => card.id === selected.cardId) : undefined;
  return (
    <div className="daily-view">
      <PageTitle>{t.daily.title}</PageTitle>
      {card ? (
        <>
          <div className="tarot-deck">
            <Card
              role="article"
              className="tarot-card daily-card"
              data-arcana={card.id}
              data-suit={card.suit ?? 'major'}
              data-card-id={card.id}
              data-day={day}
            >
              <img
                className="tarot-art"
                src={`/art/${card.id}.svg`}
                alt={card.fictionalSymbolism}
              />
              <h2>{card.title}</h2>
              <p className="mantra">{card.groundedMantra}</p>
              <p>{card.nextAction}</p>
            </Card>
          </div>
        </>
      ) : (
        <p role="status">{t.busy}</p>
      )}
      {error && <p role="alert">{t.daily.failed}</p>}
      <Button className="primary daily-help" onClick={() => navigate('situations')}>
        {t.daily.help}
      </Button>
      <Card className="cosmic-weather">
        <img className="moon-icon" src={`/moon/phase-${weather.phase}.png`} alt="" />
        <h2>{t.cosmic.phases[weather.phase]}</h2>
        <p className="cosmic-meta">
          {weather.illuminated}% {t.cosmic.illuminated} ·{' '}
          {new Intl.DateTimeFormat('en', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: weather.timeZone,
          }).format(now)}{' '}
          · {weather.timeZone}
        </p>
        {weather.mercury !== 'retrograde' && (
          <p>{t.cosmic.mercury[weather.mercury as keyof typeof t.cosmic.mercury]}</p>
        )}
        <p>
          {weather.mercury === 'retrograde'
            ? t.cosmic.retrogradeLine
            : weather.phase === 4 && strongLanguage
              ? t.cosmic.fullUnfiltered
              : t.cosmic.lines[weather.phase]}
        </p>
      </Card>
      <Button className="daily-browse" onClick={() => navigate('tarot')}>
        {t.daily.deck}
      </Button>
    </div>
  );
}
