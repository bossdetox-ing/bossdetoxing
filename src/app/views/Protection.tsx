import { responseVersion, responseSet } from '../../domain/replies';
import { Button } from '../../components/ui/button';
import { useMemo, useState } from 'react';
import { messages as t } from '../../content';
import { content, type Tone } from '../../domain/content';
import { pains, painForScenario, scenarioFor } from '../../domain/pains';
import { reflectionFor, type MantraSnapshot } from '../../domain/mantras';
import { useCompanion } from '../companion-store';
import { CopyButton, Field, PageTitle, Select } from '../components';
import { professionalResponse } from '../../domain/scripts';
import { FilledStar, Icon } from '../PixelIcon';
import { StyleSwitch } from '../StyleSwitch';
import { Card } from '../../components/ui/card';
import { WordArt } from '../WordArt';
import type { Navigate } from '../App';
import type { Settings } from '../../browser/settings';
import type { Vault } from '../../vault/service';
import { HistoryDialog } from '../HistoryDialog';
import { BestiaryPanel } from '../BestiaryPanel';
import { CustomThreatDialog } from '../CustomThreatDialog';
import { LiveWordArt } from '../LiveWordArt';
import { isCustomThreat, type CustomThreat } from '../../domain/custom-threats';

export { Icon } from '../PixelIcon';
// Every situation card: the six pains first, then the remaining scenarios.
const cards = [
  ...pains.map((pain) => ({
    key: pain.id,
    scenarioId: pain.scenarioId,
    art: pain.id,
    className: `pain-tile pain-${pain.id}`,
    label: t.redesign.pains[pain.id],
    description: t.redesign.painDescriptions[pain.id],
    primary: true,
  })),
  ...content.scenarios
    .filter((s) => !pains.some((p) => p.scenarioId === s.id))
    .map((s) => ({
      key: s.id,
      scenarioId: s.id,
      art: s.id,
      className: 'pain-tile',
      label: s.label,
      description: t.redesign.scenarioBlurbs[s.id] ?? '',
      primary: false,
    })),
];
const searchText = (card: (typeof cards)[number]) => {
  const scenario = content.scenarios.find((s) => s.id === card.scenarioId);
  return [
    card.label,
    card.description,
    scenario?.label,
    scenario?.observedExample,
    scenario?.nextAction,
    ...Object.values(scenario?.responses ?? {}),
    ...(scenario?.privateMantras ?? []),
  ]
    .join(' ')
    .toLowerCase();
};
export function PainHome({
  navigate,
  title,
  strongLanguage,
}: {
  navigate: Navigate;
  title: string;
  strongLanguage: boolean;
}) {
  const { store, state } = useCompanion();
  // Bingo marks from the calendar: how often each threat was logged, and when last.
  const stats = useMemo(() => {
    const out = new Map<string, { count: number; last: string }>();
    for (const event of state.events) {
      const seen = out.get(event.situationId);
      out.set(event.situationId, {
        count: (seen?.count ?? 0) + 1,
        last: seen && seen.last > event.createdAtISO ? seen.last : event.createdAtISO,
      });
    }
    return out;
  }, [state.events]);
  const day = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
  const search = strongLanguage ? t.redesign.searchBingoStrong : t.redesign.searchBingo;
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  function choose(id: string) {
    store.choose(id);
    navigate('protection');
  }
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text: string) => words.every((word) => text.includes(word));
  const visible = words.length ? cards.filter((card) => matches(searchText(card))) : cards;
  // The user's own threats come first; search covers their word and lines too.
  const own = state.customThreats.filter(
    (item) =>
      !words.length ||
      matches([item.label, item.description, item.say, item.write].join(' ').toLowerCase()),
  );
  const markFor = (id: string) => {
    const mark = stats.get(id);
    return mark
      ? t.redesign.marks
          .replace('{n}', String(mark.count))
          .replace('{date}', day.format(new Date(mark.last)))
      : null;
  };
  return (
    <div className="pain-home">
      <PageTitle>{title}</PageTitle>
      <input
        className="search-field"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={search}
        aria-label={search}
      />
      <div className="pain-grid" role="group" aria-label={t.situation}>
        {own.map((item) => {
          const mark = markFor(item.id);
          return (
            <Button
              className="pain-tile own-tile"
              key={item.id}
              data-marked={mark ? true : undefined}
              aria-label={`${item.label}. ${item.description || t.own.yours}`}
              aria-describedby={mark ? `marks-${item.id}` : undefined}
              onClick={() => choose(item.id)}
            >
              <LiveWordArt text={item.label} style={item.style} />
              <span className="pain-desc">{item.description || t.own.yours}</span>
              {mark && (
                <span className="tile-marks" id={`marks-${item.id}`}>
                  {mark}
                </span>
              )}
            </Button>
          );
        })}
        {visible.map((card) => {
          const mark = markFor(card.scenarioId);
          return (
            <Button
              className={card.className}
              key={card.key}
              data-marked={mark ? true : undefined}
              aria-label={card.primary ? card.description : `${card.label}. ${card.description}`}
              aria-describedby={mark ? `marks-${card.key}` : undefined}
              onClick={() => choose(card.scenarioId)}
            >
              <WordArt style={card.art} />
              <span className="pain-desc">{card.description}</span>
              {mark && (
                <span className="tile-marks" id={`marks-${card.key}`}>
                  {mark}
                </span>
              )}
            </Button>
          );
        })}
        {!words.length && (
          <Button className="pain-tile add-tile" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            {t.own.add}
          </Button>
        )}
      </div>
      {words.length > 0 && visible.length + own.length === 0 && (
        <p className="muted">{t.noResults}</p>
      )}
      {adding && (
        <CustomThreatDialog open onOpenChange={setAdding} onSaved={(item) => choose(item.id)} />
      )}
    </div>
  );
}
export function ProtectionCard({
  navigate,
  defaultTone,
  vault,
  settings,
  update,
}: {
  navigate: Navigate;
  defaultTone: Tone;
  vault: Vault;
  settings: Settings;
  update: (next: Settings) => Promise<void>;
}) {
  const { store, state } = useCompanion();
  const event = store.active();
  const situationId = event?.situationId ?? 'vague_accusation';
  // A fresh reply variant whenever the threat changes.
  const version = useMemo(() => responseVersion(situationId), [situationId]);
  const [tone, setTone] = useState<Tone>(defaultTone);
  const [writing, setWriting] = useState(false);
  const [history, setHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  // Another line shows on request only; the logged event keeps the line it was drawn with.
  const [shown, setShown] = useState<{ eventId: string; mantra: MantraSnapshot }>();
  const mantra = shown?.eventId === event?.id ? shown!.mantra : event?.mantra;
  // "Read more" stays open for the line it was opened on.
  const [openId, setOpenId] = useState<string>();
  const reflection = mantra && reflectionFor(mantra.id);
  const open = !!reflection && openId === mantra!.id;
  const advance = () => {
    const next = event && store.peek(mantra?.id);
    if (event && next) setShown({ eventId: event.id, mantra: next });
  };
  const own =
    event && isCustomThreat(event.situationId)
      ? state.customThreats.find((item) => item.id === event.situationId)
      : undefined;
  if (!event || (isCustomThreat(event.situationId) && !own))
    return (
      <>
        <PageTitle>{t.redesign.homeTitle}</PageTitle>
        <Button onClick={() => navigate('situations')}>{t.home}</Button>
      </>
    );
  const scenario = scenarioFor(event.situationId);
  const pain = painForScenario(event.situationId);
  const replies = { ...scenario, responses: responseSet(scenario, version) };
  const written = professionalResponse(replies, tone, 'written');
  const spoken = professionalResponse(replies, tone, 'spoken');
  const threats = [
    ...state.customThreats.map((item) => ({ value: item.id, label: item.label })),
    ...content.scenarios.map((s) => {
      const owner = painForScenario(s.id);
      return { value: s.id, label: owner ? t.redesign.pains[owner.id] : s.label };
    }),
  ];
  const threatId = own?.id ?? scenario.id;
  return (
    <div className={`protection-view pain-${pain?.id ?? 'questions'}`}>
      <div className="protection-topline">
        <Button className="text-button" onClick={() => navigate('situations')}>
          <Icon name="back" />
          {t.redesign.back}
        </Button>
        {/* Switch the threat here without going back to the grid. */}
        <Select
          label={t.situation}
          value={threatId}
          onChange={(id) => {
            store.choose(id);
          }}
          options={threats}
        />
      </div>
      <Card role="region" className="protective-card" aria-label={t.redesign.internal}>
        {own ? (
          <>
            <LiveWordArt text={own.label} style={own.style} />
            {own.description && <p className="pain-desc">{own.description}</p>}
          </>
        ) : (
          <>
            <WordArt style={pain?.id ?? scenario.id} />
            <p className="pain-desc">
              {pain
                ? t.redesign.painDescriptions[pain.id]
                : (t.redesign.scenarioBlurbs[threatId] ?? '')}
            </p>
          </>
        )}
        <p className="charm-text">{mantra!.text}</p>
        {reflection && (
          <Button
            className="text-button read-more"
            aria-expanded={open}
            aria-controls="mantra-reflection"
            onClick={() => setOpenId(open ? undefined : mantra!.id)}
          >
            {open ? t.redesign.readLess : t.redesign.readMore}
          </Button>
        )}
        {open && (
          <div id="mantra-reflection" className="mantra-reflection">
            <p>{reflection.text}</p>
            <p className="mantra-prompt">{reflection.prompt}</p>
          </div>
        )}
        <Button
          className="favorite-button"
          aria-label={
            state.favorites.includes(mantra!.id) ? t.redesign.unfavorite : t.redesign.favorite
          }
          aria-pressed={state.favorites.includes(mantra!.id)}
          onClick={() => store.toggleFavorite(mantra!.id)}
        >
          {state.favorites.includes(mantra!.id) ? <FilledStar /> : <Icon name="star" />}
        </Button>
        <Button
          className="icon-button reroll-button"
          aria-label={t.redesign.another}
          onClick={advance}
        >
          <Icon name="reroll" />
        </Button>
      </Card>
      {own ? (
        <OwnReplies item={own} onEdit={() => setEditing(true)} />
      ) : (
        <section className="response" aria-label={t.redesign.external}>
          <StyleSwitch
            value={tone}
            onChange={(value) => {
              setTone(value);
            }}
          />
          {/* Say it first, then write it: both under the chosen rock, each copyable. */}
          <div className="reply-row">
            <span className="reply-label">{t.replyRows.say}</span>
            <p className="spoken-response">{spoken}</p>
            <div className="reply-tools">
              <CopyButton key={spoken} value={spoken} label={t.replyRows.copySpoken} compact />
            </div>
          </div>
          <div className="reply-row">
            <span className="reply-label">{t.replyRows.write}</span>
            <p className="suggested-response" aria-live="polite">
              {written}
            </p>
            <div className="reply-tools">
              <CopyButton key={written} value={written} review compact />
            </div>
          </div>
        </section>
      )}
      {own && editing && (
        <CustomThreatDialog
          open
          onOpenChange={setEditing}
          editing={own}
          onRemoved={() => navigate('situations')}
        />
      )}
      {/* A private note per threat: collapsed until asked for, encrypted when history is on. */}
      <section className="threat-note" aria-label={t.note.section}>
        {writing ? (
          <>
            <Field
              label={t.note.label}
              value={state.notes[threatId] ?? ''}
              onChange={(text) => store.setNote(threatId, text)}
              maxLength={2000}
              multiline
            />
            <Button onClick={() => setWriting(false)}>{t.note.done}</Button>
          </>
        ) : state.notes[threatId] ? (
          <>
            <p className="note-text">{state.notes[threatId]}</p>
            <Button className="text-button" onClick={() => setWriting(true)}>
              {t.note.edit}
            </Button>
          </>
        ) : (
          <Button className="text-button" onClick={() => setWriting(true)}>
            {t.note.add}
          </Button>
        )}
        {(writing || state.notes[threatId]) &&
          (store.persisting ? (
            <p className="muted small-copy">{t.note.saved}</p>
          ) : (
            <div className="note-keep">
              <p className="muted small-copy">{t.note.session}</p>
              <Button onClick={() => setHistory(true)}>{t.note.keep}</Button>
            </div>
          ))}
        <HistoryDialog
          vault={vault}
          settings={settings}
          update={update}
          open={history}
          onOpenChange={setHistory}
        />
      </section>
      {!own && <BestiaryPanel threatId={scenario.id} />}
      {state.error && <p role="alert">{t.redesign.failed}</p>}
      {state.error && (
        <Button onClick={() => void store.enablePersistence()}>{t.redesign.retry}</Button>
      )}
    </div>
  );
}
// The user's own lines: only the rows they filled in, plus a way back into the editor.
function OwnReplies({ item, onEdit }: { item: CustomThreat; onEdit: () => void }) {
  return (
    <section className="response" aria-label={t.redesign.external}>
      {item.say && (
        <div className="reply-row">
          <span className="reply-label">{t.replyRows.say}</span>
          <p className="spoken-response">{item.say}</p>
          <div className="reply-tools">
            <CopyButton value={item.say} label={t.replyRows.copySpoken} compact />
          </div>
        </div>
      )}
      {item.write && (
        <div className="reply-row">
          <span className="reply-label">{t.replyRows.write}</span>
          <p className="suggested-response">{item.write}</p>
          <div className="reply-tools">
            <CopyButton value={item.write} review compact />
          </div>
        </div>
      )}
      <Button className="text-button" onClick={onEdit}>
        {t.own.edit}
      </Button>
    </section>
  );
}
