import { useEffect, useState } from 'react';
import { formatDate, messages as t } from '../../content';
import { content } from '../../domain/content';
import { newIncident, type Incident, type Vault, type VaultRecord } from '../../vault/service';
import type { Navigate } from '../App';
import { Field, PageTitle, Select, Toggle, storageFeedback } from '../components';

function VaultGate({ vault, opened }: { vault: Vault; opened: () => void }) {
  const [exists, setExists] = useState<boolean>();
  const [pass, setPass] = useState('');
  const [repeat, setRepeat] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void vault
      .exists()
      .then((value) => {
        if (active) setExists(value);
      })
      .catch(() => {
        if (active) setError(t.storageError);
      });
    return () => {
      active = false;
    };
  }, [vault]);
  async function submit() {
    if (!exists && pass !== repeat) {
      setError(t.mismatch);
      return;
    }
    const secret = pass;
    setBusy(true);
    setError('');
    setPass('');
    setRepeat('');
    try {
      if (exists) await vault.unlock(secret);
      else await vault.create(secret);
      opened();
    } catch {
      setError(t.vaultError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>{t.vaultLocked}</h2>
      <p>{t.privacy}</p>
      {exists !== undefined && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field
            label={t.passphrase}
            type="password"
            value={pass}
            onChange={setPass}
            hint={!exists ? t.passHint : undefined}
            required
          />
          {!exists && (
            <>
              <Field
                label={t.confirmPassphrase}
                type="password"
                value={repeat}
                onChange={setRepeat}
                required
              />
              <p className="notice">{t.noRecovery}</p>
              <Toggle label={t.recoveryAck} checked={ack} onChange={setAck} />
            </>
          )}
          <button
            className="primary"
            disabled={busy || !pass || (!exists && (!ack || pass.length < 12))}
          >
            {busy ? t.busy : exists ? t.vaultUnlock : t.vaultCreate}
          </button>
        </form>
      )}
      <p role="alert">{error}</p>
    </section>
  );
}
export function Grimoire({ vault, lock }: { vault: Vault; lock: () => void }) {
  const [unlocked, setUnlocked] = useState(vault.unlocked);
  const [records, setRecords] = useState<VaultRecord[]>([]);
  const [draft, setDraft] = useState<Incident>();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string>();
  useEffect(() => {
    let active = true;
    if (unlocked)
      void vault
        .list()
        .then((value) => {
          if (active) setRecords(value);
        })
        .catch(() => {
          if (active) setError(t.storageError);
        });
    return () => {
      active = false;
    };
  }, [unlocked, vault]);
  async function save() {
    if (!draft?.observableFacts.trim()) {
      setError(t.factsRequired);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await vault.save({ ...draft, updatedAtISO: new Date().toISOString() });
      setRecords(await vault.list());
      setDraft(undefined);
      setStatus(t.saved);
    } catch (error) {
      setError(storageFeedback(error));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await vault.remove(id);
      setRecords(await vault.list());
      setDeleting(undefined);
    } catch {
      setError(t.storageError);
    } finally {
      setBusy(false);
    }
  }
  const fields: {
    key: keyof Pick<
      Incident,
      | 'context'
      | 'quoteFromMemory'
      | 'emotion'
      | 'userInterpretation'
      | 'actualDecisions'
      | 'unresolvedQuestions'
    >;
    label: string;
  }[] = [
    { key: 'context', label: t.context },
    { key: 'quoteFromMemory', label: t.quote },
    { key: 'emotion', label: t.emotion },
    { key: 'userInterpretation', label: t.interpretation },
    { key: 'actualDecisions', label: t.decisions },
    { key: 'unresolvedQuestions', label: t.unresolved },
  ];
  return (
    <>
      <PageTitle eyebrow={t.grimoire}>{t.vaultTitle}</PageTitle>
      {!unlocked ? (
        <VaultGate vault={vault} opened={() => setUnlocked(true)} />
      ) : (
        <>
          <div className="button-row">
            <button onClick={lock}>{t.lock}</button>
            {!draft && (
              <button
                className="primary"
                onClick={() => {
                  setDraft(newIncident());
                  setStatus('');
                }}
              >
                {t.newEntry}
              </button>
            )}
          </div>
          {draft ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="stack"
            >
              <Field
                label={t.facts}
                value={draft.observableFacts}
                onChange={(observableFacts) => setDraft({ ...draft, observableFacts })}
                multiline
                required
              />
              <Field
                label={t.impact}
                value={draft.workImpact}
                onChange={(workImpact) => setDraft({ ...draft, workImpact })}
                multiline
              />
              <Field
                label={t.next}
                value={draft.nextAction}
                onChange={(nextAction) => setDraft({ ...draft, nextAction })}
                multiline
              />
              <details>
                <summary>{t.moreEntry}</summary>
                <div className="stack">
                  {fields.map((field) => (
                    <Field
                      key={field.key}
                      label={field.label}
                      value={draft[field.key]}
                      onChange={(value) => setDraft({ ...draft, [field.key]: value })}
                      multiline
                    />
                  ))}
                  <Select
                    label={t.status}
                    value={draft.followUpStatus}
                    onChange={(followUpStatus) => setDraft({ ...draft, followUpStatus })}
                    options={Object.entries(t.statuses).map(([value, label]) => ({
                      value: value as Incident['followUpStatus'],
                      label,
                    }))}
                  />
                  <fieldset>
                    <legend>{t.tags}</legend>
                    {content.behaviors.map((behavior) => (
                      <Toggle
                        key={behavior.id}
                        label={behavior.title}
                        checked={draft.behaviorIds.includes(behavior.id)}
                        onChange={(on) =>
                          setDraft({
                            ...draft,
                            behaviorIds: on
                              ? [...draft.behaviorIds, behavior.id]
                              : draft.behaviorIds.filter((id) => id !== behavior.id),
                          })
                        }
                      />
                    ))}
                  </fieldset>
                </div>
              </details>
              <button className="primary" disabled={busy}>
                {busy ? t.busy : t.saveEntry}
              </button>
              <button type="button" onClick={() => setDraft(undefined)}>
                {t.cancel}
              </button>
            </form>
          ) : (
            <>
              <Field label={t.search} value={search} onChange={setSearch} />
              {records.length === 0 && <p className="empty">{t.vaultEmpty}</p>}
              {records.length > 0 &&
                records.filter((record) =>
                  JSON.stringify(record).toLocaleLowerCase().includes(search.toLocaleLowerCase()),
                ).length === 0 && <p>{t.noResults}</p>}
              <div className="records">
                {records
                  .filter((record) =>
                    JSON.stringify(record).toLocaleLowerCase().includes(search.toLocaleLowerCase()),
                  )
                  .map((record) => (
                    <article className="record" key={record.id}>
                      <p className="eyebrow">{formatDate(record.createdAtISO)}</p>
                      {record.kind === 'incident' ? (
                        <>
                          <h2>{record.context || t.facts}</h2>
                          <p className="preserve">{record.observableFacts}</p>
                          {record.workImpact && (
                            <p>
                              {t.impact}: {record.workImpact}
                            </p>
                          )}
                          {record.nextAction && (
                            <p>
                              {t.next}: {record.nextAction}
                            </p>
                          )}
                          <button onClick={() => setDraft(record)}>{t.edit}</button>
                        </>
                      ) : (
                        <>
                          <h2>{record.title}</h2>
                          <p className="preserve">{record.brief}</p>
                        </>
                      )}
                      <button className="text-button" onClick={() => setDeleting(record.id)}>
                        {t.deleteEntry}
                      </button>
                      {deleting === record.id && (
                        <section className="notice">
                          <p>{t.deleteEntryWarning}</p>
                          <button disabled={busy} onClick={() => void remove(record.id)}>
                            {t.confirmDelete}
                          </button>
                          <button onClick={() => setDeleting(undefined)}>{t.cancel}</button>
                        </section>
                      )}
                    </article>
                  ))}
              </div>
            </>
          )}
        </>
      )}
      <p role="status">{status}</p>
      <p role="alert">{error}</p>
    </>
  );
}
export function Closure({ vault, navigate }: { vault: Vault; navigate: Navigate }) {
  const [facts, setFacts] = useState('');
  const [action, setAction] = useState('');
  const [finished, setFinished] = useState(false);
  const [notReady, setNotReady] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await vault.save({ ...newIncident(), observableFacts: facts, nextAction: action });
      setStatus(t.saved);
      setSaved(true);
    } catch {
      setStatus(t.storageError);
    } finally {
      setBusy(false);
    }
  }
  function finish() {
    setFacts('');
    setAction('');
    setStatus('');
    setFinished(true);
  }
  if (finished)
    return (
      <>
        <PageTitle intro={t.finishedText}>{t.finished}</PageTitle>
        <button className="primary" onClick={() => navigate('focus')}>
          {t.focus}
        </button>
        <button onClick={() => navigate('home')}>{t.done}</button>
      </>
    );
  return (
    <>
      <PageTitle eyebrow={t.observer} intro={t.closureIntro}>
        {t.closureTitle}
      </PageTitle>
      <Field label={t.closureFacts} value={facts} onChange={setFacts} multiline />
      <Field label={t.closureAction} value={action} onChange={setAction} />
      <p className="mantra">{t.closureReframe}</p>
      {vault.unlocked && (
        <button disabled={!facts.trim() || busy || saved} onClick={() => void save()}>
          {t.saveClosure}
        </button>
      )}
      <p role="status">{status}</p>
      <div className="button-row">
        <button className="primary" onClick={finish}>
          {t.finish}
        </button>
        <button onClick={finish}>{t.skip}</button>
      </div>
      <button className="text-button" onClick={() => setNotReady(true)}>
        {t.notReady}
      </button>
      {notReady && <p className="notice">{t.notReadyText}</p>}
    </>
  );
}
