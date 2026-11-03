import { useEffect, useState } from 'react';
import type { Settings } from '../../browser/settings';
import { messages as t } from '../../content';
import { content } from '../../domain/content';
import { hasLine, remainingSeconds, shuffled } from '../../domain/session';
import type { Navigate } from '../App';
import { Field, PageTitle, Select } from '../components';
import { TechniqueDetails } from './Support';

export function Explore({
  navigate,
  settings,
  serious,
}: {
  navigate: Navigate;
  settings: Settings;
  serious: boolean;
}) {
  const humor = settings.humor && !settings.quiet && !serious;
  return (
    <>
      <PageTitle>{t.libraryTitle}</PageTitle>
      <div className="action-list">
        {(['bestiary', ...(humor ? (['tarot', 'bingo'] as const) : []), 'focus'] as const).map(
          (key) => (
            <button key={key} onClick={() => navigate(key)}>
              <span>
                <strong>{t[key]}</strong>
                <small>{t[`${key}Sub`]}</small>
              </span>
              <span aria-hidden="true">↗</span>
            </button>
          ),
        )}
      </div>
      {!humor && <p className="muted">{t.humorOff}</p>}
      <button className="text-button" onClick={() => navigate('reply')}>
        {t.techniques}
      </button>
    </>
  );
}
export function Bestiary({ navigate }: { navigate: Navigate }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [layer, setLayer] = useState('0');
  const behavior = content.behaviors.find((b) => b.id === selected);
  const matches = content.behaviors.filter((b) =>
    `${b.title} ${b.observedIndicators.join(' ')}`.toLowerCase().includes(search.toLowerCase()),
  );
  const scenario = content.scenarios.find((s) => `behavior_${s.id}` === selected);
  return (
    <>
      <PageTitle intro={t.bestiarySub}>{t.bestiary}</PageTitle>
      {!behavior ? (
        <>
          <Field label={t.librarySearch} value={search} onChange={setSearch} />
          {matches.length === 0 && <p>{t.noResults}</p>}
          <div className="action-list">
            {matches.map((b) => (
              <button key={b.id} onClick={() => setSelected(b.id)}>
                <span>{b.title}</span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className="text-button" onClick={() => setSelected('')}>
            ← {t.back}
          </button>
          <h2>{behavior.title}</h2>
          {[
            { title: t.observed, items: behavior.observedIndicators },
            { title: t.alternatives, items: behavior.alternativeExplanations },
            { title: t.doNotInfer, items: behavior.doNotInfer },
          ].map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </section>
          ))}
          <h3>{t.sampleResponse}</h3>
          <p>{scenario?.responses.yellow ?? t.generic}</p>
          <h3>{t.factualFollowUp}</h3>
          <p>{behavior.factualFollowUp}</p>
          <Select
            label={t.layers}
            value={layer}
            onChange={(value) => {
              setLayer(value);
              if (value === '3') navigate('serious');
            }}
            options={t.layerNames.map((label, i) => ({ value: String(i), label }))}
          />
          <p>{t.layerGuidance[Number(layer)]}</p>
          <details>
            <summary>{t.techniques}</summary>
            {behavior.techniqueIds.map((id) => (
              <TechniqueDetails
                key={id}
                technique={content.techniques.find((item) => item.id === id)!}
              />
            ))}
          </details>
        </>
      )}
    </>
  );
}
export function Tarot({ navigate }: { navigate: Navigate }) {
  const [deck] = useState(() => shuffled(content.tarot));
  const [draw, setDraw] = useState(0);
  const [weather, setWeather] = useState(0);
  const [pointer, setPointer] = useState<{ x: number; y: number }>();
  const card = deck[draw % deck.length]!;
  return (
    <>
      <PageTitle eyebrow={t.symbolic}>{t.tarot}</PageTitle>
      <article
        className="tarot-card"
        onPointerDown={(event) => setPointer({ x: event.clientX, y: event.clientY })}
        onPointerUp={(event) => {
          if (
            pointer &&
            Math.abs(event.clientX - pointer.x) > 60 &&
            Math.abs(event.clientX - pointer.x) > Math.abs(event.clientY - pointer.y) * 1.5
          )
            setDraw((value) => value + 1);
          setPointer(undefined);
        }}
      >
        <p className="eyebrow">{String((draw % deck.length) + 1).padStart(2, '0')} / XII</p>
        <img className="tarot-art" src={`/art/${card.id}.webp`} alt={card.fictionalSymbolism} />
        <h2>{card.title}</h2>
        <p className="symbolism">{card.fictionalSymbolism}</p>
        <p className="mantra">{card.groundedMantra}</p>
        <p className="eyebrow">{t.nextAction}</p>
        <p>{card.nextAction}</p>
      </article>
      <button onClick={() => setDraw((d) => d + 1)}>{t.draw}</button>
      <details>
        <summary>{t.weather}</summary>
        <p>{content.corporateWeather[weather % content.corporateWeather.length]}</p>
        <button onClick={() => setWeather((w) => w + 1)}>{t.nextWeather}</button>
      </details>
      <p className="muted">{t.tarotEnd}</p>
      <button className="primary" onClick={() => navigate('home')}>
        {t.done}
      </button>
    </>
  );
}
export function Bingo({ navigate }: { navigate: Navigate }) {
  const [squares, setSquares] = useState(() => shuffled(content.bingoSquares).slice(0, 9));
  const [marks, setMarks] = useState<number[]>([]);
  const [ended, setEnded] = useState(false);
  return (
    <>
      <PageTitle eyebrow={t.symbolic} intro={t.bingoHint}>
        {t.bingo}
      </PageTitle>
      {!ended ? (
        <>
          <div className="bingo-grid">
            {squares.map((text, i) => (
              <button
                key={text}
                aria-pressed={marks.includes(i)}
                onClick={() =>
                  setMarks((current) =>
                    current.includes(i) ? current.filter((n) => n !== i) : [...current, i],
                  )
                }
              >
                {text}
              </button>
            ))}
          </div>
          {hasLine(marks) && (
            <p role="status" className="notice">
              {t.bingoLine}
            </p>
          )}
          <button
            onClick={() => {
              setMarks([]);
              setSquares([]);
              setEnded(true);
            }}
          >
            {t.endSession}
          </button>
          <button className="text-button" onClick={() => navigate('diary')}>
            {t.diary}
          </button>
        </>
      ) : (
        <>
          <p role="status">{t.bingoEnded}</p>
          <button
            onClick={() => {
              setMarks([]);
              setSquares(shuffled(content.bingoSquares).slice(0, 9));
              setEnded(false);
            }}
          >
            {t.bingoReset}
          </button>
          <button onClick={() => navigate('home')}>{t.done}</button>
        </>
      )}
    </>
  );
}
export function Focus() {
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [deadline, setDeadline] = useState<number>();
  const [task, setTask] = useState('');
  useEffect(() => {
    if (deadline === undefined) return;
    const tick = () => {
      const value = remainingSeconds(deadline, Date.now());
      setRemaining(value);
      if (value === 0) setDeadline(undefined);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [deadline]);
  return (
    <>
      <PageTitle>{t.timerTitle}</PageTitle>
      <div className="segments">
        {[15, 25, 45].map((value) => (
          <button
            key={value}
            aria-pressed={duration === value}
            onClick={() => {
              setDuration(value);
              setRemaining(value * 60);
              setDeadline(undefined);
            }}
          >
            {value} {t.minutes}
          </button>
        ))}
      </div>
      <div className="timer-dial">
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <circle
            cx="120"
            cy="120"
            r="106"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="2"
          />
          <circle
            cx="120"
            cy="120"
            r="106"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeDasharray={`${(remaining / (duration * 60)) * 666} 666`}
            transform="rotate(-90 120 120)"
          />
        </svg>
        <p className="timer" role="timer" aria-live="off">
          {String(Math.floor(remaining / 60)).padStart(2, '0')}
          <span>:</span>
          {String(remaining % 60).padStart(2, '0')}
        </p>
      </div>
      <div className="button-row">
        <button
          className="primary"
          disabled={remaining === 0}
          onClick={() => {
            if (deadline !== undefined) {
              setRemaining(remainingSeconds(deadline, Date.now()));
              setDeadline(undefined);
            } else setDeadline(Date.now() + remaining * 1000);
          }}
        >
          {deadline !== undefined
            ? t.pause
            : remaining === duration * 60
              ? t.startTimer
              : t.resumeTimer}
        </button>
        <button
          onClick={() => {
            setDeadline(undefined);
            setRemaining(duration * 60);
          }}
        >
          {t.reset}
        </button>
      </div>
      <p className="muted">{t.timerHint}</p>
      <details>
        <summary>{t.quickUi.timerTask}</summary>
        <Field label={t.timerTask} value={task} onChange={setTask} />
      </details>
      {remaining === 0 && <p role="status">{t.timerDone}</p>}
    </>
  );
}
