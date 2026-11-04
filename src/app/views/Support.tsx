import { responseVersion, responseSet } from '../../domain/replies';
import { useViewCopy } from '../useViewCopy';
import { Icon } from '../PixelIcon';
import { Button } from '../../components/ui/button';
import { StyleSwitch } from '../StyleSwitch';
import { useState } from 'react';
import type { Settings } from '../../browser/settings';
import { messages as t } from '../../content';
import { useCompanion } from '../companion-store';
import { professionalResponse } from '../../domain/scripts';
import { content, defaultScenario, type Tone } from '../../domain/content';
import type { Navigate } from '../App';
import { CopyButton, Field, PageTitle, Select } from '../components';
type Props = { navigate: Navigate; settings: Settings; serious?: boolean };

export function Home({ navigate, serious }: Props) {
  return (
    <div className="home-view">
      <PageTitle>{t.redesign.tools}</PageTitle>
      <div className="action-list">
        {(['calm', 'reply', 'closure'] as const).map((key, i) => (
          <Button key={key} onClick={() => navigate(key === 'calm' ? 'shield' : key)}>
            <span className="index" aria-hidden="true">
              0{i + 1}
            </span>
            <span>
              <strong>{t[key]}</strong>
            </span>
            <Icon name="next" />
          </Button>
        ))}
      </div>
      {serious && <p className="notice">{t.seriousHidden}</p>}
      <p className="privacy-note">{t.sharing}</p>
    </div>
  );
}
export function Shield({ navigate, settings, serious }: Props) {
  const voiceTitle = useViewCopy('shield');
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
      <PageTitle>{voiceTitle}</PageTitle>
      <div className="private-reminder" role="region" aria-label={t.private}>
        <p className="mantra">{mantra}</p>
        <Button
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
        </Button>
      </div>
      <div className="button-row">
        <Button className="primary" onClick={() => navigate('home')}>
          {t.done}
        </Button>
        <Button onClick={() => navigate('reply')}>{t.needWords}</Button>
      </div>
      <details>
        <summary>{t.deep}</summary>
        <div className="stack">
          <fieldset>
            <legend>{t.feel}</legend>
            <div className="chips">
              {Object.entries(t.emotions).map(([value, label]) => (
                <Button
                  key={value}
                  aria-pressed={emotion === value}
                  onClick={() => {
                    setEmotion(value as typeof emotion);
                  }}
                >
                  {label}
                </Button>
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
          <Button onClick={() => setCue((value) => value + 1)}>{t.groundingNext}</Button>
        </div>
      </details>
    </>
  );
}
export function SituationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <section className="situation-picker" aria-label={t.quickUi.situations}>
      <div className="section-line">
        <h2>{t.quickUi.situations}</h2>
      </div>
      <div className="chips" role="group" aria-label={t.situation}>
        {content.scenarios.map((s) => (
          <Button key={s.id} aria-pressed={s.id === value} onClick={() => onChange(s.id)}>
            {t.quickUi.scenarioLabels[s.id as keyof typeof t.quickUi.scenarioLabels] ?? s.label}
          </Button>
        ))}
        <Button aria-pressed={value === 'custom'} onClick={() => onChange('custom')}>
          {t.custom}
        </Button>
      </div>
    </section>
  );
}

export function Reply({ settings, serious }: Props) {
  const voiceTitle = useViewCopy('reply');
  const [versions] = useState(() =>
    Object.fromEntries(content.scenarios.map((s) => [s.id, responseVersion(s.id)])),
  );
  const [scenarioId, setScenarioId] = useState(defaultScenario.id);
  const [tone, setTone] = useState<Tone>(settings.tone);
  const [format, setFormat] = useState('written');
  const [draft, setDraft] = useState(
    responseSet(defaultScenario, versions[defaultScenario.id]!)[settings.tone],
  );
  const [editing, setEditing] = useState(false);
  const [beforeEdit, setBeforeEdit] = useState('');
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
        {
          ...content.scenarios.find((s) => s.id === id)!,
          responses: responseSet(
            content.scenarios.find((s) => s.id === id)!,
            versions[id]!,
          ),
        },
        nextTone,
        nextFormat,
      ),
    );
    setEditing(false);
    setBeforeEdit('');
  }
  return (
    <div className="reply-view">
      <PageTitle>{voiceTitle}</PageTitle>
      <div className="response-pair">
        <div className="private-reminder" role="region" aria-label={t.private}>
          <p className="mantra">
            {selected?.purpose === 'dark_humor' && (!settings.humor || settings.quiet || serious)
              ? t.redesign.noHumor
              : (selected?.text ?? t.emotionMantras.other)}
          </p>
        </div>
        <section className="response" aria-label={t.professional}>
          <StyleSwitch
            value={tone}
            onChange={(value) =>
              replace(scenarioId, value, format === 'follow_up' ? 'written' : format)
            }
          />
          {editing ? (
            <>
              <Field label={t.editReply} value={draft} multiline onChange={setDraft} />
              <div className="button-row">
                <Button onClick={() => setEditing(false)}>{t.quickUi.applyEdit}</Button>
                <Button
                  onClick={() => {
                    setDraft(beforeEdit);
                    setEditing(false);
                  }}
                >
                  {t.cancel}
                </Button>
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
              <Button
                className="text-button"
                onClick={() => {
                  setBeforeEdit(draft);
                  setEditing(true);
                }}
              >
                {t.edit}
              </Button>
            )}
          </div>
        </section>
      </div>
      <SituationPicker value={scenarioId} onChange={(id) => replace(id, tone, format)} />
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
          <p className="muted">{scenario?.nextAction ?? t.generic}</p>
        </div>
      </details>
    </div>
  );
}
export function Serious({ leave }: { leave: () => void }) {
  return (
    <>
      <PageTitle intro={t.seriousIntro}>{t.seriousTitle}</PageTitle>
      <p className="mantra">{t.seriousGround}</p>
      <div className="stack">
        <p>{t.seriousImmediate}</p>
        <p>{t.seriousWork}</p>
        <p>{t.seriousHealth}</p>
      </div>
      <p className="muted">{t.seriousHidden}</p>
      <Button className="primary" onClick={leave}>
        {t.neutral}
      </Button>
    </>
  );
}
