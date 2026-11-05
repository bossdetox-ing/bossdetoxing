import { Icon } from '../PixelIcon';
import { Button } from '../../components/ui/button';
import { useEffect, useState } from 'react';
import { messages as t, formatDate } from '../../content';
import { localDay } from '../../domain/calendar';
import { painForScenario, scenarioFor } from '../../domain/pains';
import { isCustomThreat } from '../../domain/custom-threats';
import { useCompanion } from '../companion-store';
import type { Settings } from '../../browser/settings';
import type { Vault } from '../../vault/service';
import { PageTitle, Toggle } from '../components';
import { VaultGate } from './VaultGate';
import { MonthPicker } from '../MonthPicker';

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
  const [setup, setSetup] = useState(false);
  const [unlocked, setUnlocked] = useState(vault.unlocked);
  const [deleting, setDeleting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const event = state.events.find((item) => item.id === selected);
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
    showMonth(new Date(year, index + delta, 1));
  }
  function showMonth(next: Date) {
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
        <Button aria-label={t.redesign.previousMonth} onClick={() => changeMonth(-1)}>
          <Icon name="back" />
        </Button>
        <h2>
          <MonthPicker value={month} label={title} onChange={showMonth} />
        </h2>
        <Button aria-label={t.redesign.nextMonth} onClick={() => changeMonth(1)}>
          <Icon name="next" />
        </Button>
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
            <Button
              key={value}
              aria-label={`${new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(new Date(year, index, n))}${logged ? `. ${t.redesign.taggedDay}` : ''}`}
              aria-pressed={day === value}
              className={logged ? 'logged-day' : ''}
              onClick={() => {
                setDay(value);
                setSelected(undefined);
              }}
            >
              {n}
              {logged && <span className="calendar-dot" aria-hidden="true" />}
            </Button>
          );
        })}
      </div>
      <section aria-label={t.redesign.calendarDay} className="calendar-events">
        {!selectedEvents.length && <p className="muted">{t.redesign.emptyDay}</p>}
        {selectedEvents.map((item) => {
          const pain = painForScenario(item.situationId);
          return (
            <Button
              className="event-summary"
              key={item.id}
              aria-expanded={selected === item.id}
              onClick={() => {
                setSelected(selected === item.id ? undefined : item.id);
                setDeleting(false);
              }}
            >
              <span className="calendar-dot" aria-hidden="true" />
              <span>
                <strong>
                  {pain
                    ? t.redesign.pains[pain.id]
                    : isCustomThreat(item.situationId)
                      ? (state.customThreats.find((own) => own.id === item.situationId)?.label ??
                        t.own.yours)
                      : scenarioFor(item.situationId).label}
                </strong>
                <small>
                  {new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(
                    new Date(item.createdAtISO),
                  )}
                </small>
              </span>
            </Button>
          );
        })}
      </section>
      {event && (
        <article className="calendar-detail">
          <p className="muted small-copy">{formatDate(event.createdAtISO)}</p>
          <p className="charm-text">{event.mantra.text}</p>
          {settings.privateLogging && state.savedIds.includes(event.id) && (
            <p className="save-status">{t.redesign.encrypted}</p>
          )}
          <Button className="danger" onClick={() => setDeleting(true)}>
            {t.redesign.deleteEvent}
          </Button>
          {deleting && (
            <section className="notice">
              <p>{t.redesign.deleteConfirm}</p>
              <Button disabled={busy} onClick={() => void remove()}>
                {t.confirmDelete}
              </Button>
              <Button onClick={() => setDeleting(false)}>{t.cancel}</Button>
            </section>
          )}
        </article>
      )}
      {/* Status only when it says something: saving, saved encrypted, or a failure. */}
      {(state.error || error || state.busy || (unlocked && settings.privateLogging)) && (
        <p className="save-status">
          {state.error || error
            ? t.redesign.failed
            : state.busy
              ? t.redesign.saving
              : t.redesign.encrypted}
        </p>
      )}
      {(!settings.privateLogging || !unlocked) && (
        <>
          <p className="muted small-copy">{t.redesign.historyNotice}</p>
          <Button aria-expanded={setup} onClick={() => setSetup(!setup)}>
            {t.redesign.enableHistory}
          </Button>
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
        <Button className="text-button" onClick={() => setClearing(true)}>
          {t.redesign.clearCalendar}
        </Button>
      )}
      {clearing && (
        <section className="notice">
          <p>{t.redesign.clearWarning}</p>
          <Button className="danger" disabled={busy} onClick={() => void clear()}>
            {t.redesign.clearConfirm}
          </Button>
          <Button onClick={() => setClearing(false)}>{t.cancel}</Button>
        </section>
      )}
    </div>
  );
}
