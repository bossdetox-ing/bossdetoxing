import { useState } from 'react';
import type { Settings } from '../../browser/settings';
import { messages as t } from '../../content';
import { professionalResponse } from '../../domain/scripts';
import {
  content,
  defaultScenario,
  evidenceLabels,
  type Technique,
  type Tone,
} from '../../domain/content';
import type { Navigate } from '../App';
import { CopyButton, Field, PageTitle, Select, Voice } from '../components';
type Props = { navigate: Navigate; settings: Settings; serious?: boolean };

export function Home({ navigate, settings, serious }: Props) {
  return (
    <div className="home-view">
      <PageTitle eyebrow={settings.quiet ? undefined : t.homeEyebrow}>{t.homeTitle}</PageTitle>
      <Voice
        inside={serious ? t.seriousGround : t.homeMantra}
        outside={t.generic}
        action={<CopyButton value={t.generic} />}
      />
      <div className="action-list">
        {(['calm', 'reply', 'task', 'diary', 'closure'] as const).map((key, i) => (
          <button key={key} onClick={() => navigate(key === 'calm' ? 'shield' : key)}>
            <span className="index" aria-hidden="true">
              0{i + 1}
            </span>
            <span>
              <strong>{t[key]}</strong>
              <small>{t[`${key}Sub`]}</small>
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
export function Shield({ navigate, settings }: Props) {
  const [deep, setDeep] = useState(false);
  const [emotion, setEmotion] = useState<keyof typeof t.emotions>('other');
  const [scenarioId, setScenarioId] = useState('');
  const [cue, setCue] = useState(0);
  const selected = content.scenarios.find((s) => s.id === scenarioId);
  const emotionMantra = t.emotionMantras;
  return (
    <>
      <PageTitle eyebrow={settings.quiet ? undefined : t.shieldName}>{t.calm}</PageTitle>
      <Voice inside={selected?.privateMantras[0] ?? emotionMantra[emotion]} />
      <section className="grounding">
        <span className="orbit" aria-hidden="true">
          ◌
        </span>
        <h2>{t.grounding}</h2>
        <p>{deep ? t.cues[cue % t.cues.length] : t.groundingSub}</p>
        <small>{t.groundingTime}</small>
      </section>
      <div className="button-row">
        <button className="primary" onClick={() => navigate('home')}>
          {t.done}
        </button>
        <button onClick={() => navigate('reply')}>{t.needWords}</button>
      </div>
      <button className="text-button" aria-expanded={deep} onClick={() => setDeep(!deep)}>
        {deep ? t.quick : t.deep}
      </button>
      {deep && (
        <section className="stack">
          <Select
            label={t.feel}
            value={emotion}
            onChange={setEmotion}
            options={Object.entries(t.emotions).map(([value, label]) => ({
              value: value as typeof emotion,
              label,
            }))}
          />
          <Select
            label={t.situation}
            value={scenarioId}
            onChange={setScenarioId}
            options={[
              { value: '', label: t.notSure },
              ...content.scenarios.map((s) => ({ value: s.id, label: s.label })),
            ]}
          />
          <button onClick={() => setCue((c) => c + 1)}>{t.groundingNext}</button>
        </section>
      )}
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
export function Reply({ settings, navigate }: Props) {
  const [deep, setDeep] = useState(false);
  const [scenarioId, setScenarioId] = useState(defaultScenario.id);
  const [tone, setTone] = useState<Tone>(settings.tone);
  const [format, setFormat] = useState('written');
  const [draft, setDraft] = useState(defaultScenario.responses[settings.tone]);
  const [edited, setEdited] = useState(false);
  const [facts, setFacts] = useState('');
  const [pending, setPending] = useState<{ id: string; tone: Tone; format: string }>();
  const scenario = content.scenarios.find((s) => s.id === scenarioId);
  function apply(next: { id: string; tone: Tone; format: string }) {
    const nextScenario = content.scenarios.find((s) => s.id === next.id);
    setScenarioId(next.id);
    setTone(next.tone);
    setFormat(next.format);
    setDraft(professionalResponse(nextScenario, next.tone, next.format));
    setFacts('');
    setEdited(false);
    setPending(undefined);
  }
  function change(next: { id: string; tone: Tone; format: string }) {
    if (edited) setPending(next);
    else apply(next);
  }
  return (
    <>
      <PageTitle eyebrow={settings.quiet ? undefined : t.spellbook}>{t.reply}</PageTitle>
      <Voice inside={scenario?.privateMantras[0] ?? defaultScenario.privateMantras[0]!} />
      <Field
        label={t.editReply}
        value={draft}
        multiline
        onChange={(value) => {
          setDraft(value);
          setEdited(true);
        }}
      />
      <CopyButton value={draft} review />
      <button className="text-button" aria-expanded={deep} onClick={() => setDeep(!deep)}>
        {deep ? t.quick : t.deep}
      </button>
      {deep && (
        <section className="stack">
          <Select
            label={t.situation}
            value={scenarioId}
            onChange={(id) => change({ id, tone, format })}
            options={[
              ...content.scenarios.map((s) => ({ value: s.id, label: s.label })),
              { value: 'custom', label: t.custom },
            ]}
          />
          <p className="muted">{scenario?.observedExample}</p>
          <Select
            label={t.tone}
            value={tone}
            onChange={(tone) => change({ id: scenarioId, tone, format })}
            options={Object.entries(t.tones).map(([value, label]) => ({
              value: value as Tone,
              label,
            }))}
          />
          <Select
            label={t.format}
            value={format}
            onChange={(format) => change({ id: scenarioId, tone, format })}
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
              setEdited(true);
              setFacts('');
            }}
          >
            {t.applyFacts}
          </button>
          <p className="eyebrow">{t.nextAction}</p>
          <p>{scenario?.nextAction ?? t.generic}</p>
          <details>
            <summary>{t.why}</summary>
            {(scenario?.techniqueIds ?? ['documentation']).map((id) => (
              <TechniqueDetails key={id} technique={content.techniques.find((t) => t.id === id)!} />
            ))}
          </details>
          <details>
            <summary>{t.techniques}</summary>
            {content.techniques.map((technique) => (
              <TechniqueDetails key={technique.id} technique={technique} />
            ))}
          </details>
        </section>
      )}
      {pending && (
        <section className="notice" role="alert">
          <h2>{t.replaceTitle}</h2>
          <p>{t.replaceText}</p>
          <button onClick={() => apply(pending)}>{t.replace}</button>
          <button onClick={() => setPending(undefined)}>{t.cancel}</button>
        </section>
      )}
      <button className="text-button" onClick={() => navigate('home')}>
        {t.done}
      </button>
    </>
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
