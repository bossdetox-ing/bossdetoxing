import { useId, useState } from 'react';
import type { Settings } from '../../browser/settings';
import { messages as t } from '../../content';
import { useCompanion } from '../companion-store';
import { professionalResponse } from '../../domain/scripts';
import {
  content,
  defaultScenario,
  evidenceLabels,
  type Technique,
  type Tone,
} from '../../domain/content';
import type { Navigate } from '../App';
import { CopyButton, Field, PageTitle, Select } from '../components';
type Props = { navigate: Navigate; settings: Settings; serious?: boolean };

export function Home({ navigate, serious }: Props) {
  return (
    <div className="home-view">
      <PageTitle>{t.redesign.tools}</PageTitle>
      <div className="action-list">
        {(['calm', 'reply', 'task', 'diary', 'closure'] as const).map((key, i) => (
          <button key={key} onClick={() => navigate(key === 'calm' ? 'shield' : key)}>
            <span className="index" aria-hidden="true">
              0{i + 1}
            </span>
            <span>
              <strong>{t[key]}</strong>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      {serious && <p className="notice">{t.seriousHidden}</p>}
      <p className="privacy-note">{t.sharing}</p>
    </div>
  );
}
export function Shield({ navigate, settings, serious }: Props) {
  const [emotion, setEmotion] = useState<keyof typeof t.emotions>('other');
  const [scenarioId, setScenarioId] = useState('');
  const [cue, setCue] = useState(0);
  const { store, state } = useCompanion();
  const selected = state.looseCharms.shield;
  const mantra =
    selected?.purpose === 'dark_humor' && (!settings.humor || settings.quiet || serious)
      ? t.redesign.noHumor
      : (selected?.text ?? t.emotionMantras.other);
  return (
    <>
      <PageTitle>{t.calm}</PageTitle>
      <div className="private-reminder">
        <p className="eyebrow">{t.private}</p>
        <p className="mantra">{mantra}</p>
        <button
          className="text-button"
          onClick={() =>
            store.loose(
              'shield',
              { situationId: scenarioId || undefined, emotion, purpose: 'grounding' },
              true,
            )
          }
        >
          {t.quickUi.anotherMantra}
        </button>
      </div>
      <MethodPicker
        ids={['grounding', 'stop', 'defusion', 'self_distancing']}
        initialId="grounding"
      />
      <div className="button-row">
        <button className="primary" onClick={() => navigate('home')}>
          {t.done}
        </button>
        <button onClick={() => navigate('reply')}>{t.needWords}</button>
      </div>
      <details>
        <summary>{t.deep}</summary>
        <div className="stack">
          <fieldset>
            <legend>{t.feel}</legend>
            <div className="chips">
              {Object.entries(t.emotions).map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={emotion === value}
                  onClick={() => {
                    setEmotion(value as typeof emotion);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <SituationPicker
            value={scenarioId}
            onChange={(id) => {
              setScenarioId(id);
            }}
          />
          <p>{t.cues[cue % t.cues.length]}</p>
          <button onClick={() => setCue((value) => value + 1)}>{t.groundingNext}</button>
        </div>
      </details>
    </>
  );
}
export function TechniqueDetails({ technique }: { technique: Technique }) {
  return (
    <section className="technique">
      <h3>{technique.title}</h3>
      <p className="evidence">{evidenceLabels[technique.evidenceType]}</p>
      <p>{technique.mechanism}</p>
      <p className="muted">{t.evidenceLimit}</p>
      {technique.whenUseful.length > 0 && (
        <>
          <h4>{t.useful}</h4>
          {technique.whenUseful.map((s) => (
            <p key={s}>{s}</p>
          ))}
        </>
      )}
      {technique.microExercise.length > 0 && (
        <>
          <h4>{t.practice}</h4>
          {technique.microExercise.map((s) => (
            <p key={s}>{s}</p>
          ))}
        </>
      )}
      <h4>{t.caution}</h4>
      {technique.caution.map((s) => (
        <p key={s}>{s}</p>
      ))}
      {technique.sourceIds.length ? (
        <>
          <h4>{t.sources}</h4>
          {technique.sourceIds.map((id) => {
            const source = content.sources.find((s) => s.id === id)!;
            return (
              <p key={id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title} ↗
                </a>
              </p>
            );
          })}
        </>
      ) : (
        <p className="muted">{t.pending}</p>
      )}
    </section>
  );
}
const quickSituations = [
  'vague_accusation',
  'dismissal_warning',
  'moving_goalposts',
  'public_criticism',
  'colleague_gossip',
  'guilt_induction',
];

export function SituationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = content.scenarios.filter(
    (s) => expanded || quickSituations.includes(s.id) || s.id === value,
  );
  function choose(id: string) {
    onChange(id);
    setExpanded(false);
  }
  return (
    <section className="situation-picker" aria-label={t.quickUi.situations}>
      <div className="section-line">
        <h2>{t.quickUi.situations}</h2>
        <button
          className="text-button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t.quickUi.fewerSituations : t.quickUi.moreSituations}
        </button>
      </div>
      <div className="chips" role="group" aria-label={t.situation}>
        {visible.map((s) => (
          <button key={s.id} aria-pressed={s.id === value} onClick={() => choose(s.id)}>
            {t.quickUi.scenarioLabels[s.id as keyof typeof t.quickUi.scenarioLabels] ?? s.label}
          </button>
        ))}
        {(expanded || value === 'custom') && (
          <button aria-pressed={value === 'custom'} onClick={() => choose('custom')}>
            {t.custom}
          </button>
        )}
      </div>
    </section>
  );
}

export function MethodPicker({ ids, initialId }: { ids: readonly string[]; initialId?: string }) {
  const [selected, setSelected] = useState<string | undefined>(initialId);
  const id = useId();
  const technique = content.techniques.find((item) => item.id === selected);
  const choice = (item: Technique) => (
    <button
      key={item.id}
      aria-expanded={item.id === selected}
      aria-controls={id}
      onClick={() => setSelected(item.id === selected ? undefined : item.id)}
    >
      {item.title}
    </button>
  );
  return (
    <section className="method-picker" aria-label={t.quickUi.methods}>
      <h2>{t.quickUi.methods}</h2>
      <div className="chips">
        {ids.map((id) => choice(content.techniques.find((item) => item.id === id)!))}
      </div>
      <details className="method-library">
        <summary>{t.quickUi.allMethods}</summary>
        <div className="chips">
          {content.techniques.filter((item) => !ids.includes(item.id)).map(choice)}
        </div>
      </details>
      <div id={id}>
        {technique && (
          <div className="method-practice">
            <h3>{technique.title}</h3>
            {technique.microExercise.map((step) => (
              <p key={step}>{step}</p>
            ))}
            <details>
              <summary>{t.quickUi.methodDetails}</summary>
              <TechniqueDetails technique={technique} />
            </details>
          </div>
        )}
      </div>
    </section>
  );
}

export function Reply({ settings, serious }: Props) {
  const [scenarioId, setScenarioId] = useState(defaultScenario.id);
  const [tone, setTone] = useState<Tone>(settings.tone);
  const [format, setFormat] = useState('written');
  const [draft, setDraft] = useState(defaultScenario.responses[settings.tone]);
  const [editing, setEditing] = useState(false);
  const [beforeEdit, setBeforeEdit] = useState('');
  const [facts, setFacts] = useState('');
  const radioName = useId();
  const { store, state } = useCompanion();
  const selected = state.looseCharms[`reply:${scenarioId}`];
  const scenario = content.scenarios.find((s) => s.id === scenarioId);
  function replace(id: string, nextTone: Tone, nextFormat: string) {
    store.loose(`reply:${id}`, { situationId: id });
    setScenarioId(id);
    setTone(nextTone);
    setFormat(nextFormat);
    setDraft(
      professionalResponse(
        content.scenarios.find((s) => s.id === id),
        nextTone,
        nextFormat,
      ),
    );
    setEditing(false);
    setBeforeEdit('');
    setFacts('');
  }
  return (
    <div className="reply-view">
      <PageTitle>{t.reply}</PageTitle>
      <div className="response-pair">
        <div className="private-reminder">
          <p className="eyebrow">{t.private}</p>
          <p className="mantra">
            {selected?.purpose === 'dark_humor' && (!settings.humor || settings.quiet || serious)
              ? t.redesign.noHumor
              : (selected?.text ?? defaultScenario.privateMantras[0]!)}
          </p>
        </div>
        <section className="response" aria-label={t.professional}>
          <fieldset className="style-switch">
            <legend className="sr-only">{t.quickUi.styles}</legend>
            {(['yellow', 'grey', 'firm'] as const).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name={radioName}
                  value={value}
                  checked={tone === value}
                  onChange={() =>
                    replace(scenarioId, value, format === 'follow_up' ? 'written' : format)
                  }
                />
                <span>{t.quickUi.styleLabels[value]}</span>
              </label>
            ))}
          </fieldset>
          <p className="eyebrow">{t.professional}</p>
          {editing ? (
            <>
              <Field label={t.editReply} value={draft} multiline onChange={setDraft} />
              <div className="button-row">
                <button onClick={() => setEditing(false)}>{t.quickUi.applyEdit}</button>
                <button
                  onClick={() => {
                    setDraft(beforeEdit);
                    setEditing(false);
                  }}
                >
                  {t.cancel}
                </button>
              </div>
            </>
          ) : (
            <p className="suggested-response" aria-live="polite" aria-atomic="true">
              {draft}
            </p>
          )}
          <div className="response-actions">
            <CopyButton key={draft} value={draft} review />
            {!editing && (
              <button
                className="text-button"
                onClick={() => {
                  setBeforeEdit(draft);
                  setEditing(true);
                }}
              >
                {t.edit}
              </button>
            )}
          </div>
        </section>
      </div>
      <SituationPicker value={scenarioId} onChange={(id) => replace(id, tone, format)} />
      <MethodPicker key={scenarioId} ids={scenario?.techniqueIds ?? ['documentation']} />
      <details>
        <summary>{t.quickUi.options}</summary>
        <div className="stack">
          <Select
            label={t.format}
            value={format}
            onChange={(format) => replace(scenarioId, tone, format)}
            options={[
              { value: 'written', label: t.written },
              { value: 'spoken', label: t.spoken },
              { value: 'follow_up', label: t.followUp },
            ]}
          />
          <Field label={t.concreteFacts} value={facts} onChange={setFacts} multiline />
          <button
            disabled={!facts.trim()}
            onClick={() => {
              setDraft((value) => `${value}\n\n${facts}`);
              setFacts('');
            }}
          >
            {t.applyFacts}
          </button>
          <p className="muted">{scenario?.nextAction ?? t.generic}</p>
        </div>
      </details>
    </div>
  );
}
export function Serious({ leave }: { leave: () => void }) {
  const [risk, setRisk] = useState(t.risks[4]!);
  return (
    <>
      <PageTitle intro={t.seriousIntro}>{t.seriousTitle}</PageTitle>
      <Select
        label={t.support}
        value={risk}
        onChange={setRisk}
        options={t.risks.map((label) => ({ value: label, label }))}
      />
      <p className="mantra">{t.seriousGround}</p>
      <div className="stack">
        <p>{t.seriousImmediate}</p>
        <p>{t.seriousWork}</p>
        <p>{t.seriousHealth}</p>
      </div>
      <p className="muted">{t.seriousHidden}</p>
      <button className="primary" onClick={leave}>
        {t.neutral}
      </button>
    </>
  );
}
