import { responseVersion, responseSet } from '../../domain/replies';
import { Button } from '../../components/ui/button';
import { useState } from 'react';
import { messages as t } from '../../content';
import { content, type Tone } from '../../domain/content';
import { pains, painForScenario, scenarioFor } from '../../domain/pains';
import { useCompanion } from '../companion-store';
import { CopyButton, Field, PageTitle } from '../components';
import { Icon } from '../PixelIcon';
import { StyleSwitch } from '../StyleSwitch';
import { Card } from '../../components/ui/card';
import { WordArt } from '../WordArt';
import type { Navigate } from '../App';

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
export function PainHome({ navigate, title }: { navigate: Navigate; title: string }) {
  const { store } = useCompanion();
  const [query, setQuery] = useState('');
  function choose(id: string) {
    store.choose(id);
    navigate('protection');
  }
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = words.length
    ? cards.filter((card) => words.every((word) => searchText(card).includes(word)))
    : cards;
  return (
    <div className="pain-home">
      <PageTitle>{title}</PageTitle>
      <input
        className="search-field"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.redesign.searchSituations}
        aria-label={t.redesign.searchSituations}
      />
      <div className="pain-grid" role="group" aria-label={t.situation}>
        {visible.map((card) => (
          <Button
            className={card.className}
            key={card.key}
            aria-label={card.primary ? card.description : `${card.label}. ${card.description}`}
            onClick={() => choose(card.scenarioId)}
          >
            <WordArt style={card.art} />
            <span className="pain-desc">{card.description}</span>
          </Button>
        ))}
      </div>
      {words.length > 0 && visible.length === 0 && <p className="muted">{t.noResults}</p>}
    </div>
  );
}
export function ProtectionCard({
  navigate,
  defaultTone,
  humorAllowed,
}: {
  navigate: Navigate;
  defaultTone: Tone;
  humorAllowed: boolean;
}) {
  const { store, state } = useCompanion();
  const event = store.active();
  const [version] = useState(() => responseVersion(event?.situationId ?? 'vague_accusation'));
  const [tone, setTone] = useState<Tone>(defaultTone);
  const [edited, setEdited] = useState<string>();
  const [editing, setEditing] = useState(false);
  if (!event)
    return (
      <>
        <PageTitle>{t.redesign.homeTitle}</PageTitle>
        <Button onClick={() => navigate('situations')}>{t.home}</Button>
      </>
    );
  const scenario = scenarioFor(event.situationId);
  const pain = painForScenario(event.situationId);
  const response = edited ?? responseSet(scenario, version)[tone];
  return (
    <div className={`protection-view pain-${pain?.id ?? 'questions'}`}>
      <div className="protection-topline">
        <Button className="text-button" onClick={() => navigate('situations')}>
          <Icon name="back" />
          {t.redesign.back}
        </Button>
        <span className="category-pill">{pain ? t.redesign.pains[pain.id] : scenario.label}</span>
      </div>
      <Card role="region" className="protective-card" aria-label={t.redesign.internal}>
        <img src={`/art/${pain?.art ?? 'card_11'}.svg`} alt="" />
        <p className="charm-text" aria-live="polite" aria-atomic="true">
          {!humorAllowed && event.mantra.purpose === 'dark_humor'
            ? t.redesign.noHumor
            : event.mantra.text}
        </p>
        <Button
          className="favorite-button"
          aria-label={
            state.favorites.includes(event.mantra.id) ? t.redesign.unfavorite : t.redesign.favorite
          }
          aria-pressed={state.favorites.includes(event.mantra.id)}
          onClick={() => store.toggleFavorite(event.mantra.id)}
        >
          <Icon name="star" />
        </Button>
      </Card>
      <section className="response" aria-label={t.redesign.external}>
        <StyleSwitch
          value={tone}
          onChange={(value) => {
            setTone(value);
            setEdited(undefined);
            setEditing(false);
          }}
        />
        {editing ? (
          <Field label={t.editReply} value={response} onChange={setEdited} multiline />
        ) : (
          <p className="suggested-response" aria-live="polite">
            {response}
          </p>
        )}
        <div className="copy-row">
          <CopyButton key={response} value={response} review />
          <Button onClick={() => setEditing(!editing)}>
            {editing ? t.quickUi.applyEdit : t.edit}
          </Button>
        </div>
      </section>
      <div className="protection-actions">
        <Button
          className="primary"
          onClick={() => {
            store.plan(
              tone,
              response,
              `${scenario.id}:${tone}:${version}${edited ? ':edited' : ''}`,
            );
            navigate('home');
          }}
        >
          {t.redesign.done}
        </Button>
        <Button onClick={() => store.reroll()}>
          <Icon name="reroll" />
          {t.redesign.another}
        </Button>
      </div>
      <p className="save-status" role="status">
        {state.error
          ? t.redesign.failed
          : state.busy
            ? t.redesign.saving
            : state.savedIds.includes(event.id)
              ? t.redesign.encrypted
              : t.redesign.session}
      </p>
      {state.error && (
        <Button onClick={() => void store.enablePersistence()}>{t.redesign.retry}</Button>
      )}
    </div>
  );
}
