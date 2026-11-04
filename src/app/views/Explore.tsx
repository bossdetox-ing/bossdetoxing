import { useViewCopy } from '../useViewCopy';
import { Icon } from '../PixelIcon';
import { Card } from '../../components/ui/card';
import { useCompanion } from '../companion-store';
import { bingoBoard, bingoCategory, customSquares } from '../../domain/bingo';
import { Button } from '../../components/ui/button';
import { useState } from 'react';
import type { Settings } from '../../browser/settings';
import { messages as t } from '../../content';
import { content } from '../../domain/content';
import { hasLine, shuffled } from '../../domain/session';
import type { Navigate } from '../App';
import { Field, PageTitle, Select } from '../components';

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
        {(['bestiary', ...(humor ? (['tarot', 'bingo'] as const) : [])] as const).map((key) => (
          <Button key={key} onClick={() => navigate(key)}>
            <span>
              <strong>{t[key]}</strong>
              <small>{t[`${key}Sub`]}</small>
            </span>
            <Icon name="next" />
          </Button>
        ))}
      </div>
      {!humor && <p className="muted">{t.humorOff}</p>}
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
              <Button key={b.id} onClick={() => setSelected(b.id)}>
                <span>{b.title}</span>
                <Icon name="next" />
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Button className="text-button" onClick={() => setSelected('')}>
            ← {t.back}
          </Button>
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
        </>
      )}
    </>
  );
}
export function Tarot({ navigate }: { navigate: Navigate }) {
  const outro = useViewCopy('tarotOutro');
  const [deck] = useState(() => shuffled(content.tarot));
  const [draw, setDraw] = useState(0);
  const [pointer, setPointer] = useState<{ x: number; y: number }>();
  const [browsing, setBrowsing] = useState(false);
  const card = deck[draw % deck.length]!;
  return (
    <>
      <PageTitle>{t.tarot}</PageTitle>
      <div className="deck-heading">
        <span>{t.deck.count}</span>
        <Button aria-expanded={browsing} onClick={() => setBrowsing(!browsing)}>
          {t.deck.browse}
        </Button>
      </div>
      {browsing && (
        <section className="deck-library" aria-label={t.deck.choose}>
          {content.tarot.map((item) => (
            <Button
              key={item.id}
              aria-pressed={item.id === card.id}
              onClick={() => {
                setDraw(deck.findIndex((c) => c.id === item.id));
                setBrowsing(false);
              }}
            >
              <img src={`/art/${item.id}.svg`} alt="" loading="lazy" />
              <span>{item.title}</span>
              <small>
                {item.traditionalName !== item.title ? item.traditionalName : item.suit}
              </small>
            </Button>
          ))}
        </section>
      )}
      <div className="tarot-deck">
        <Card
          role="article"
          className="tarot-card"
          data-arcana={card.id}
          data-suit={card.suit ?? 'major'}
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
          <img className="tarot-art" src={`/art/${card.id}.svg`} alt={card.fictionalSymbolism} />
          <h2>{card.title}</h2>
          {card.traditionalName !== card.title && (
            <p className="arcana-name">{card.traditionalName}</p>
          )}
          <p className="symbolism">{card.fictionalSymbolism}</p>
          <p className="mantra">{card.groundedMantra}</p>
          <p>{card.nextAction}</p>
        </Card>
      </div>
      <Button className="primary" onClick={() => setDraw((value) => value + 1)}>
        {t.draw}
      </Button>
      <p className="muted">{outro}</p>
      <Button onClick={() => navigate('home')}>{t.done}</Button>
    </>
  );
}
export function Bingo({ navigate }: { navigate: Navigate }) {
  const intro = useViewCopy('bingoIntro');
  const { store } = useCompanion();
  const category = bingoCategory(store.active()?.situationId);
  const [own, setOwn] = useState<string[]>([]);
  const [squares, setSquares] = useState(() => bingoBoard([], category));
  const [marks, setMarks] = useState<number[]>([]);
  const [ended, setEnded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  function fresh(items = own) {
    setSquares(bingoBoard(items, category, Math.random, squares));
    setMarks([]);
    setEnded(false);
  }
  function apply() {
    try {
      const items = customSquares(draft);
      if (!items.length) {
        setError(t.customBingo.empty);
        return;
      }
      setOwn(items);
      fresh(items);
      setEditing(false);
      setError('');
    } catch {
      setError(t.customBingo.limit);
    }
  }
  return (
    <>
      <PageTitle intro={intro}>{t.bingo}</PageTitle>
      {!ended ? (
        <>
          <div className="bingo-grid">
            {squares.map((text, index) => (
              <Button
                key={text}
                aria-pressed={marks.includes(index)}
                onClick={() =>
                  setMarks((current) =>
                    current.includes(index)
                      ? current.filter((n) => n !== index)
                      : [...current, index],
                  )
                }
              >
                {text}
              </Button>
            ))}
          </div>
          {hasLine(marks) && <p role="status">{t.bingoLine}</p>}
          {!!own.length && <p className="muted">{t.customBingo.custom}</p>}
          <div className="button-row">
            <Button onClick={() => fresh()}>{t.customBingo.fresh}</Button>
            <Button
              aria-expanded={editing}
              onClick={() => {
                setEditing(!editing);
                setDraft(own.join('\n'));
                setError('');
              }}
            >
              {t.customBingo.title}
            </Button>
          </div>
          {editing && (
            <Card className="bingo-editor">
              <p>{t.customBingo.hint}</p>
              <Field label={t.customBingo.label} value={draft} onChange={setDraft} multiline />
              <p className="small-copy">{t.customBingo.limit}</p>
              <p role="alert">{error}</p>
              <Button className="primary" onClick={apply}>
                {t.customBingo.apply}
              </Button>
              <Button
                onClick={() => {
                  setEditing(false);
                  setDraft('');
                }}
              >
                {t.cancel}
              </Button>
            </Card>
          )}
          <Button
            onClick={() => {
              setMarks([]);
              setSquares([]);
              setOwn([]);
              setDraft('');
              setEditing(false);
              setEnded(true);
            }}
          >
            {t.endSession}
          </Button>
        </>
      ) : (
        <>
          <p role="status">{t.bingoEnded}</p>
          <Button onClick={() => fresh([])}>{t.bingoReset}</Button>
          <Button onClick={() => navigate('home')}>{t.done}</Button>
        </>
      )}
    </>
  );
}
