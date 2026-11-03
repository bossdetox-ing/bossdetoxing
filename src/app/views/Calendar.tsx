import { useEffect, useState } from 'react';
import { messages as t, formatDate } from '../../content';
import { localDay, type CalendarEvent } from '../../domain/calendar';
import { painForScenario, scenarioFor } from '../../domain/pains';
import { useCompanion } from '../companion-store';
import type { Settings } from '../../browser/settings';
import type { Vault } from '../../vault/service';
import { Field, PageTitle, Toggle } from '../components';
import { VaultGate } from './Grimoire';

export function PrivateCalendar({
  vault,
  settings,
  update,
}: {
  vault: Vault;
  settings: Settings;
  update: (settings: Settings) => Promise<void>;
}) {
  const { store, state } = useCompanion();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [day, setDay] = useState(() => localDay(new Date().toISOString()));
  const [selected, setSelected] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [setup, setSetup] = useState(false);
  const [unlocked, setUnlocked] = useState(vault.unlocked);
  const [deleting, setDeleting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const event = state.events.find((item) => item.id === selected);
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (unlocked) void store.hydrate();
  }, [unlocked, store]);
  const year = month.getFullYear(),
    index = month.getMonth();
  const offset = (new Date(year, index, 1).getDay() + 6) % 7;
  const last = new Date(year, index + 1, 0).getDate();
  const title = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month);
  const selectedEvents = state.events
    .filter((item) => localDay(item.createdAtISO) === day)
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
  function changeMonth(delta: number) {
    const next = new Date(year, index + delta, 1);
    setMonth(next);
    setDay(localDay(next.toISOString()));
    setSelected(undefined);
  }
  async function consent(enabled: boolean) {
    await update({ ...settings, privateLogging: enabled });
    if (enabled) await store.enablePersistence();
  }
  async function remove() {
    if (!event) return;
    setBusy(true);
    try {
      await store.remove(event.id);
      setSelected(undefined);
      setDeleting(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function clear() {
    setBusy(true);
    try {
      await store.clearCalendar();
      setSelected(undefined);
      setClearing(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="calendar-view">
      <PageTitle>{t.redesign.calendar}</PageTitle>
      <div className="calendar-heading">
        <button aria-label={t.redesign.previousMonth} onClick={() => changeMonth(-1)}>
          ←
        </button>
        <h2>{title}</h2>
        <button aria-label={t.redesign.nextMonth} onClick={() => changeMonth(1)}>
          →
        </button>
      </div>
      <div className="calendar-grid" role="group" aria-label={title}>
        {Array.from({ length: 7 }, (_, i) => (
          <span className="weekday" key={`w${i}`}>
            {new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(2026, 10, 2 + i))}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`e${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: last }, (_, i) => {
          const n = i + 1;
          const value = localDay(new Date(year, index, n).toISOString());
          const logged = state.events.some((item) => localDay(item.createdAtISO) === value);
          return (
            <button
              key={value}
              aria-label={`${new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date(year, index, n))}${logged ? `. ${t.redesign.taggedDay}` : ''}`}
              aria-pressed={day === value}
              className={logged ? 'logged-day' : ''}
              onClick={() => {
                setDay(value);
                setSelected(undefined);
                setEditing(false);
              }}
            >
              {n}
              {logged && <span className="calendar-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <section aria-label={t.redesign.calendarDay} className="calendar-events">
        {!selectedEvents.length && <p className="muted">{t.redesign.emptyDay}</p>}
        {selectedEvents.map((item) => {
          const pain = painForScenario(item.situationId);
          return (
            <button
              className="event-summary"
              key={item.id}
              aria-expanded={selected === item.id}
              onClick={() => {
                setSelected(selected === item.id ? undefined : item.id);
                setEditing(false);
                setDeleting(false);
                setNotes(item.notes);
              }}
            >
              <span className="calendar-dot" aria-hidden="true" />
              <span>
                <strong>
                  {pain ? t.redesign.pains[pain.id] : scenarioFor(item.situationId).label}
                </strong>
                <small>
                  {new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(
                    new Date(item.createdAtISO),
                  )}{' '}
                  · {item.status === 'planned' ? t.redesign.planned : t.redesign.tagged}
                </small>
              </span>
            </button>
          );
        })}
      </section>
      {event && (
        <article className="calendar-detail">
          <p className="eyebrow">{formatDate(event.createdAtISO)}</p>
          <p className="charm-text">{event.mantra.text}</p>
          {event.plannedResponseText && (
            <>
              <p className="eyebrow">{t.redesign.planned}</p>
              <p className="preserve">{event.plannedResponseText}</p>
            </>
          )}
          <div className="chips" role="group" aria-label={t.redesign.outcome}>
            {Object.entries(t.redesign.outcomes).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={event.outcome === value}
                onClick={() =>
                  store.update({
                    ...event,
                    outcome: event.outcome === value ? null : (value as CalendarEvent['outcome']),
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
          {event.notes && <p className="preserve">{event.notes}</p>}
          <p className="save-status">
            {settings.privateLogging && state.savedIds.includes(event.id)
              ? t.redesign.encrypted
              : t.redesign.session}
          </p>
          <button onClick={() => setEditing(!editing)}>{t.redesign.editEvent}</button>
          {editing && (
            <div className="stack">
              <Field label={t.redesign.eventNotes} value={notes} onChange={setNotes} multiline />

              <button
                onClick={() => {
                  store.update({ ...event, notes });
                  setEditing(false);
                }}
              >
                {t.redesign.saveEvent}
              </button>
            </div>
          )}
          <button className="danger" onClick={() => setDeleting(true)}>
            {t.redesign.deleteEvent}
          </button>
          {deleting && (
            <section className="notice">
              <p>{t.redesign.deleteConfirm}</p>
              <button disabled={busy} onClick={() => void remove()}>
                {t.confirmDelete}
              </button>
              <button onClick={() => setDeleting(false)}>{t.cancel}</button>
            </section>
          )}
        </article>
      )}
      <p className="save-status">
        {state.error || error
          ? t.redesign.failed
          : state.busy
            ? t.redesign.saving
            : unlocked && settings.privateLogging
              ? t.redesign.encrypted
              : t.redesign.session}
      </p>
      {(!settings.privateLogging || !unlocked) && (
        <>
          <p className="muted small-copy">{t.redesign.historyNotice}</p>
          <button aria-expanded={setup} onClick={() => setSetup(!setup)}>
            {t.redesign.enableHistory}
          </button>
        </>
      )}
      {setup && !unlocked && (
        <VaultGate
          vault={vault}
          opened={() => {
            setUnlocked(true);
            void store.hydrate().then(() => {
              if (settings.privateLogging) void store.enablePersistence();
            });
          }}
        />
      )}
      {unlocked && (
        <Toggle
          label={t.redesign.historyConsent}
          checked={settings.privateLogging}
          onChange={(value) => void consent(value)}
        />
      )}
      {!!state.events.length && (
        <button className="text-button" onClick={() => setClearing(true)}>
          {t.redesign.clearCalendar}
        </button>
      )}
      {clearing && (
        <section className="notice">
          <p>{t.redesign.clearWarning}</p>
          <button className="danger" disabled={busy} onClick={() => void clear()}>
            {t.redesign.clearConfirm}
          </button>
          <button onClick={() => setClearing(false)}>{t.cancel}</button>
        </section>
      )}
    </div>
  );
}
