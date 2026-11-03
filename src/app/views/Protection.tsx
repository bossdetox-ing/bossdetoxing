import { useId, useState } from 'react';
import { messages as t } from '../../content';
import { content, type Tone } from '../../domain/content';
import { pains, painForScenario, scenarioFor } from '../../domain/pains';
import { phases, mantraPurposes } from '../../domain/mantras';
import { useCompanion } from '../companion-store';
import { CopyButton, Field, PageTitle, Select } from '../components';
import { MethodPicker } from './Support';
import type { Navigate } from '../App';

export function Icon({ name }: { name: 'calendar' | 'blank' | 'star' | 'back' | 'reroll' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="ui-icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'calendar' ? (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2" />
        </>
      ) : name === 'blank' ? (
        <path d="m3 3 18 18M10 4h10v10M4 10v10h16v-3" />
      ) : name === 'star' ? (
        <path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.7l6.4-.9L12 3Z" />
      ) : name === 'back' ? (
        <path d="m14 5-7 7 7 7M7 12h14" />
      ) : (
        <path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 14-2l1 2M4 16l1 2a8 8 0 0 0 14-2" />
      )}
    </svg>
  );
}
export function PainHome({ navigate }: { navigate: Navigate }) {
  const { store } = useCompanion();
  const [more, setMore] = useState(false);
  function choose(id: string) {
    store.choose(id);
    navigate('protection');
  }
  return (
    <div className="pain-home">
      <PageTitle eyebrow={t.redesign.homeTag}>{t.redesign.homeTitle}</PageTitle>
      <div className="pain-grid">
        {pains.map((pain) => (
          <button
            className="pain-tile"
            key={pain.id}
            aria-label={t.redesign.painDescriptions[pain.id]}
            onClick={() => choose(pain.scenarioId)}
          >
            <img src={`/art/${pain.art}.webp`} alt="" />
            <span>{t.redesign.pains[pain.id]}</span>
          </button>
        ))}
      </div>
      <div className="button-row home-actions">
        <button aria-expanded={more} onClick={() => setMore(!more)}>
          {t.redesign.more}
        </button>
        <button onClick={() => navigate('focus')}>{t.focus}</button>
      </div>
      {more && (
        <div className="chips" role="group" aria-label={t.situation}>
          {content.scenarios
            .filter((s) => !pains.some((p) => p.scenarioId === s.id))
            .map((s) => (
              <button key={s.id} onClick={() => choose(s.id)}>
                {s.label}
              </button>
            ))}
        </div>
      )}
      <div className="local-meta">
        <span>{t.redesign.local}</span>
        <span>{t.redesign.noTyping}</span>
      </div>
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
  const [tone, setTone] = useState<Tone>(defaultTone);
  const [edited, setEdited] = useState<string>();
  const [editing, setEditing] = useState(false);
  const radioName = useId();
  const [purpose, setPurpose] = useState('');
  if (!event)
    return (
      <>
        <PageTitle>{t.redesign.homeTitle}</PageTitle>
        <button onClick={() => navigate('home')}>{t.home}</button>
      </>
    );
  const scenario = scenarioFor(event.situationId);
  const pain = painForScenario(event.situationId);
  const response = edited ?? scenario.responses[tone];
  return (
    <div className="protection-view">
      <div className="protection-topline">
        <button className="text-button" onClick={() => navigate('home')}>
          <Icon name="back" />
          {t.redesign.back}
        </button>
        <span className="category-pill">{pain ? t.redesign.pains[pain.id] : scenario.label}</span>
      </div>
      <section className="protective-card" aria-label={t.redesign.internal}>
        <p className="arcana">
          {t.redesign.arcana} {pain?.arcana ?? '07'} /{' '}
          {pain ? t.redesign.symbols[pain.id] : scenario.label}
        </p>
        <img src={`/art/${pain?.art ?? 'card_11'}.webp`} alt="" />
        <p className="charm-text" aria-live="polite" aria-atomic="true">
          {!humorAllowed && event.mantra.purpose === 'dark_humor'
            ? t.redesign.noHumor
            : event.mantra.text}
        </p>
        <button
          className="favorite-button"
          aria-label={
            state.favorites.includes(event.mantra.id) ? t.redesign.unfavorite : t.redesign.favorite
          }
          aria-pressed={state.favorites.includes(event.mantra.id)}
          onClick={() => store.toggleFavorite(event.mantra.id)}
        >
          <Icon name="star" />
        </button>
      </section>
      <section className="response" aria-label={t.redesign.external}>
        <fieldset className="style-switch">
          <legend className="sr-only">{t.quickUi.styles}</legend>
          {(['yellow', 'grey', 'firm'] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name={radioName}
                checked={tone === value}
                onChange={() => {
                  setTone(value);
                  setEdited(undefined);
                  setEditing(false);
                }}
              />
              <span>{t.quickUi.styleLabels[value]}</span>
            </label>
          ))}
        </fieldset>
        {editing ? (
          <Field label={t.editReply} value={response} onChange={setEdited} multiline />
        ) : (
          <p className="suggested-response" aria-live="polite">
            {response}
          </p>
        )}
        <CopyButton key={response} value={response} review />
      </section>
      <div className="protection-actions">
        <button
          className="primary"
          onClick={() => {
            store.plan(tone, response);
            navigate('home');
          }}
        >
          {t.redesign.done}
        </button>
        <button onClick={() => store.reroll()}>
          <Icon name="reroll" />
          {t.redesign.another}
        </button>
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
        <button onClick={() => void store.enablePersistence()}>{t.redesign.retry}</button>
      )}
      <details>
        <summary>{t.redesign.options}</summary>
        <div className="stack">
          <button onClick={() => setEditing(!editing)}>
            {editing ? t.quickUi.applyEdit : t.edit}
          </button>
          <Select
            label={t.redesign.phase}
            value={event.phase}
            onChange={(phase) => store.update({ ...event, phase })}
            options={phases.map((value) => ({ value, label: t.redesign.phases[value] }))}
          />
          <Select
            label={t.redesign.purpose}
            value={purpose}
            onChange={(value) => {
              setPurpose(value);
              store.setPurpose(value ? (value as (typeof mantraPurposes)[number]) : undefined);
            }}
            options={[
              { value: '', label: t.redesign.automaticPurpose },
              ...mantraPurposes.map((value) => ({ value, label: t.redesign.purposes[value] })),
            ]}
          />
          <p className="muted">{t.redesign.phaseHint}</p>
          <MethodPicker ids={scenario.techniqueIds} />
        </div>
      </details>
    </div>
  );
}
