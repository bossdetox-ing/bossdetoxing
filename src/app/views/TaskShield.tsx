import { useState } from 'react';
import { messages as t } from '../../content';
import {
  buildBrief,
  clarification,
  emptyTask,
  questionByField,
  taskFields,
  taskLabels,
  unknowns,
  type QuestionKey,
} from '../../domain/task';
import type { Vault } from '../../vault/service';
import type { Navigate } from '../App';
import { CopyButton, Field, PageTitle, Toggle, Voice, storageFeedback } from '../components';

export function TaskShield({ vault, navigate }: { vault: Vault; navigate: Navigate }) {
  const [input, setInput] = useState(emptyTask);
  const [built, setBuilt] = useState(false);
  const [editing, setEditing] = useState(false);
  const [brief, setBrief] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<QuestionKey[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [recordId] = useState(() => crypto.randomUUID());
  const [createdAt] = useState(() => new Date().toISOString());
  function build() {
    const keys = unknowns(input).slice(0, 3);
    setBrief(buildBrief(input));
    setMessage(clarification(input, keys));
    setSelected(keys);
    setReviewed(false);
    setBuilt(true);
  }
  async function save() {
    setSaving(true);
    try {
      await vault.save({
        id: recordId,
        kind: 'task',
        createdAtISO: createdAt,
        updatedAtISO: new Date().toISOString(),
        title: input.deliverable || t.brief,
        brief,
      });
      setStatus(t.saved);
    } catch (error) {
      setStatus(storageFeedback(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageTitle>{t.taskTitle}</PageTitle>
      {!built ? (
        <>
          <Voice
            inside={t.quickUi.taskMantra}
            outside={t.quickUi.taskResponse}
            action={
              <CopyButton value={t.quickUi.taskResponse} label={t.copyClarification} review />
            }
          />
          <details>
            <summary>{t.quickUi.structure}</summary>
            <div className="stack">
              <Field
                label={t.rawNotes}
                hint={t.rawHint}
                value={input.notes}
                onChange={(notes) => setInput({ ...input, notes })}
                multiline
              />
              <details>
                <summary>{t.addDetails}</summary>
                <div className="stack">
                  {taskFields.map((key) => (
                    <Field
                      key={key}
                      label={taskLabels[key]}
                      value={input[key]}
                      onChange={(value) => setInput({ ...input, [key]: value })}
                      multiline={key === 'acceptanceCriteria'}
                    />
                  ))}
                </div>
              </details>
              <button className="primary" onClick={build}>
                {t.buildBrief}
              </button>
            </div>
          </details>
        </>
      ) : (
        <>
          <section className="response" aria-label={t.clarification}>
            {editing ? (
              <Field
                label={t.clarificationEdit}
                value={message}
                multiline
                onChange={(value) => {
                  setMessage(value);
                  setReviewed(false);
                }}
              />
            ) : (
              <p className="suggested-response">{message}</p>
            )}
            <button className="text-button" onClick={() => setEditing(!editing)}>
              {editing ? t.quickUi.applyEdit : t.edit}
            </button>
            <Toggle label={t.reviewClarification} checked={reviewed} onChange={setReviewed} />
            <CopyButton
              key={message}
              value={message}
              label={t.copyClarification}
              disabled={!reviewed}
              review
            />
          </section>
          <p className="muted">
            {t.unknowns}:{' '}
            {unknowns(input)
              .map((key) => taskLabels[key])
              .join(', ') || t.unspecified}
          </p>
          {input.previousRequirement && input.currentRequirement && (
            <section className="notice">
              <h3>{t.comparison}</h3>
              <p>
                {t.previous}: {input.previousRequirement}
              </p>
              <p>
                {t.current}: {input.currentRequirement}
              </p>
            </section>
          )}
          <details>
            <summary>{t.questions}</summary>
            <fieldset>
              <legend className="sr-only">{t.questions}</legend>
              {unknowns(input).map((key) => (
                <Toggle
                  key={key}
                  label={questionByField[key]}
                  checked={selected.includes(key)}
                  onChange={(on) => {
                    const next = on ? [...selected, key] : selected.filter((k) => k !== key);
                    setSelected(next);
                    setMessage(clarification(input, next));
                    setReviewed(false);
                  }}
                />
              ))}
            </fieldset>
          </details>
          <details>
            <summary>{t.brief}</summary>
            <dl className="brief-fields">
              {taskFields.map((key) => (
                <div key={key}>
                  <dt>{taskLabels[key]}</dt>
                  <dd>{input[key].trim() || <span className="unknown">{t.unspecified}</span>}</dd>
                </div>
              ))}
            </dl>
            <h3>{t.unverified}</h3>
            <p className="preserve">{input.notes || t.unspecified}</p>
            <section>
              <h3>{t.decisionCard}</h3>
              <p>
                {taskLabels.decisions}: {input.decisions || t.unspecified}
              </p>
              <p>
                {taskLabels.owner}: {input.owner || t.unspecified}
              </p>
              <p>
                {taskLabels.deadline}: {input.deadline || t.unspecified}
              </p>
              <p>
                {t.unknowns}:{' '}
                {unknowns(input)
                  .map((key) => taskLabels[key])
                  .join(', ') || t.unspecified}
              </p>
            </section>
          </details>
          <button
            className="text-button"
            onClick={() => {
              setBuilt(false);
              setEditing(false);
            }}
          >
            {t.quickUi.editNotes}
          </button>
          <details>
            <summary>{t.editBrief}</summary>
            <Field label={t.editBrief} value={brief} multiline onChange={setBrief} />
            <CopyButton value={brief} label={t.copyBrief} review />
          </details>
          {vault.unlocked ? (
            <button disabled={saving} onClick={() => void save()}>
              {t.saveTask}
            </button>
          ) : (
            <p className="muted">{t.needsVault}</p>
          )}
          <p role="status">{status}</p>
          <button onClick={() => navigate('home')}>{t.done}</button>
        </>
      )}
    </>
  );
}
