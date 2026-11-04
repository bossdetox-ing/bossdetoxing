import { createContext, useContext, useSyncExternalStore } from 'react';
import { type CalendarEvent } from '../domain/calendar';
import {
  mantraById,
  rememberMantra,
  selectMantra,
  snapshot,
  type MantraContext,
} from '../domain/mantras';
import { painForScenario } from '../domain/pains';
import { type Vault, type VaultRecord } from '../vault/service';

type MantraState = Extract<VaultRecord, { kind: 'mantra_state' }>;
export type CompanionSnapshot = {
  events: CalendarEvent[];
  favorites: string[];
  recentIds: string[];
  activeId?: string;
  error: boolean;
  busy: boolean;
  savedIds: string[];
  looseCharms: Record<string, ReturnType<typeof snapshot>>;
};
export class CompanionStore {
  private state: CompanionSnapshot = {
    events: [],
    favorites: [],
    recentIds: [],
    error: false,
    busy: false,
    savedIds: [],
    looseCharms: {},
  };
  private listeners = new Set<() => void>();
  private generation = 0;
  private preferences?: MantraState;
  private changes = new Map<string, boolean>();
  private context: MantraContext = { phase: 'during', humor: true, serious: false };
  private pending: Promise<void> = Promise.resolve();
  private consent = false;
  private dirty = new Set<string>();
  private hydrated = false;
  private loading?: Promise<void>;
  constructor(private vault: Vault) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.state;
  private patch(next: Partial<CompanionSnapshot>) {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
  configure(consent: boolean, humor: boolean, serious: boolean) {
    this.consent = consent;
    this.context = { ...this.context, humor, serious };
  }
  setConsent(consent: boolean) {
    this.consent = consent;
  }
  clear() {
    this.generation++;
    this.preferences = undefined;
    this.hydrated = false;
    this.loading = undefined;
    this.changes.clear();
    this.dirty.clear();
    this.pending = Promise.resolve();
    this.patch({
      events: [],
      favorites: [],
      recentIds: [],
      activeId: undefined,
      error: false,
      busy: false,
      savedIds: [],
      looseCharms: {},
    });
  }
  loose(slot: string, context: Partial<MantraContext> = {}, reroll = false) {
    const current = this.state.looseCharms[slot];
    if (current && !reroll) return current;
    const chosen = selectMantra(
      { ...this.context, ...context },
      this.state.recentIds,
      this.state.favorites,
      current?.id,
    );
    const selected = snapshot(chosen);
    this.patch({
      looseCharms: { ...this.state.looseCharms, [slot]: selected },
      recentIds: rememberMantra(this.state.recentIds, chosen.id),
    });
    this.savePreferences();
    return selected;
  }
  isPlayful() {
    return this.context.humor && !this.context.serious;
  }
  setPurpose(purpose: MantraContext['purpose']) {
    this.context = { ...this.context, purpose };
  }
  active() {
    return this.state.events.find((event) => event.id === this.state.activeId);
  }
  private run(operation: () => Promise<void>) {
    const generation = this.generation;
    const task = this.pending.then(async () => {
      if (generation !== this.generation) return;
      this.patch({ busy: true });
      try {
        await operation();
      } catch {
        if (generation === this.generation) this.patch({ error: true });
      } finally {
        if (generation === this.generation) this.patch({ busy: false });
      }
    });
    this.pending = task;
    return task;
  }
  settled() {
    return this.pending;
  }
  hydrate(): Promise<void> {
    if (!this.vault.unlocked || this.hydrated) return Promise.resolve();
    if (!this.loading) {
      const generation = this.generation;
      this.loading = this.loadRecords().finally(() => {
        if (generation === this.generation) this.loading = undefined;
      });
    }
    return this.loading;
  }
  private async loadRecords() {
    if (!this.vault.unlocked || this.hydrated) return;
    const generation = this.generation;
    try {
      const records = await this.vault.list();
      if (generation !== this.generation) return;
      const saved = records.filter((r): r is CalendarEvent => r.kind === 'calendar_event');
      const preferences = records.find((r): r is MantraState => r.kind === 'mantra_state');
      const merged = new Map(saved.map((event) => [event.id, event]));
      for (const event of this.state.events) {
        const old = merged.get(event.id);
        if (!old || event.updatedAtISO >= old.updatedAtISO) merged.set(event.id, event);
      }
      const favorites = new Set(preferences?.favorites.filter((id) => mantraById.has(id)) ?? []);
      for (const id of this.state.favorites) favorites.add(id);
      for (const [id, enabled] of this.changes) {
        if (enabled) favorites.add(id);
        else favorites.delete(id);
      }
      this.preferences = preferences;
      this.hydrated = true;
      this.patch({
        events: [...merged.values()],
        favorites: [...favorites],
        recentIds: [...new Set([...(preferences?.recentIds ?? []), ...this.state.recentIds])]
          .filter((id) => mantraById.has(id))
          .slice(-64),
        savedIds: saved.map((event) => event.id),
      });
    } catch {
      if (generation === this.generation) this.patch({ error: true });
    }
  }
  private saveEvent(event: CalendarEvent, savePreferences = true) {
    if (!this.consent || !this.vault.unlocked) return;
    const generation = this.generation;
    void this.run(async () => {
      await this.hydrate();
      if (!this.hydrated || generation !== this.generation || !this.consent) return;
      await this.vault.save(event);
      if (
        generation === this.generation &&
        this.state.events.find((item) => item.id === event.id) === event
      )
        this.dirty.delete(event.id);
      if (generation === this.generation)
        this.patch({ savedIds: [...new Set([...this.state.savedIds, event.id])] });
    });
    if (savePreferences) this.savePreferences();
  }
  private savePreferences() {
    if (!this.consent || !this.vault.unlocked) return;
    const generation = this.generation;
    void this.run(async () => {
      await this.hydrate();
      if (!this.hydrated || generation !== this.generation || !this.consent) return;
      const timestamp = new Date().toISOString();
      const preferences: MantraState = {
        id: this.preferences?.id ?? crypto.randomUUID(),
        kind: 'mantra_state',
        createdAtISO: this.preferences?.createdAtISO ?? timestamp,
        updatedAtISO: timestamp,
        favorites: [...this.state.favorites],
        recentIds: [...this.state.recentIds],
      };
      await this.vault.save(preferences);
      if (generation === this.generation) this.preferences = preferences;
    });
  }

  choose(situationId: string) {
    this.context = {
      ...this.context,
      situationId,
      phase: situationId === 'after_meeting_replay' ? 'after' : 'during',
    };
    const mantra = selectMantra(this.context, this.state.recentIds, this.state.favorites);
    const timestamp = new Date().toISOString();
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      kind: 'calendar_event',
      createdAtISO: timestamp,
      updatedAtISO: timestamp,
      eventType: 'self_reported_trigger',
      source: 'user_tap',
      categoryId: painForScenario(situationId)?.id ?? situationId,
      situationId,
      mantra: snapshot(mantra),
      phase: this.context.phase,
      status: 'tagged',
      plannedResponseStyle: null,
      plannedResponseId: null,
      plannedResponseText: null,
      outcome: null,
      notes: '',
    };
    this.dirty.add(event.id);
    this.patch({
      events: [...this.state.events, event],
      activeId: event.id,
      recentIds: rememberMantra(this.state.recentIds, mantra.id),
    });
    this.saveEvent(event);
    return event;
  }
  open(id: string) {
    if (this.state.events.some((event) => event.id === id)) this.patch({ activeId: id });
  }
  update(event: CalendarEvent) {
    const next = { ...event, updatedAtISO: new Date().toISOString() };
    this.dirty.add(event.id);
    this.patch({ events: this.state.events.map((item) => (item.id === event.id ? next : item)) });
    this.saveEvent(next);
  }
  reroll() {
    const event = this.active();
    if (!event) return;
    const context = { ...this.context, situationId: event.situationId, phase: event.phase };
    const selected = selectMantra(
      context,
      this.state.recentIds,
      this.state.favorites,
      event.mantra.id,
    );
    this.patch({ recentIds: rememberMantra(this.state.recentIds, selected.id) });
    this.update({ ...event, mantra: snapshot(selected) });
  }
  toggleFavorite(id: string) {
    if (!mantraById.has(id)) return;
    const enabled = !this.state.favorites.includes(id);
    this.changes.set(id, enabled);
    this.patch({
      favorites: enabled
        ? [...this.state.favorites, id]
        : this.state.favorites.filter((item) => item !== id),
    });
    this.savePreferences();
  }
  plan(style: 'yellow' | 'grey' | 'firm', text: string, responseId?: string) {
    const event = this.active();
    if (!event) return;
    this.update({
      ...event,
      status: 'planned',
      plannedResponseStyle: style,
      plannedResponseId: responseId ?? `${event.situationId}:${style}`,
      plannedResponseText: text,
    });
  }
  async enablePersistence() {
    this.patch({ error: false });
    await this.hydrate();
    if (!this.vault.unlocked || !this.consent) return;
    for (const event of this.state.events.filter(
      (event) => !this.state.savedIds.includes(event.id) || this.dirty.has(event.id),
    ))
      this.saveEvent(event, false);
    this.savePreferences();
    await this.settled();
  }
  async remove(id: string) {
    const generation = this.generation;
    await this.hydrate();
    await this.settled();
    if (generation !== this.generation) return;
    if (this.vault.unlocked && this.state.savedIds.includes(id)) await this.vault.remove(id);
    if (generation !== this.generation) return;
    this.patch({
      events: this.state.events.filter((event) => event.id !== id),
      savedIds: this.state.savedIds.filter((item) => item !== id),
      activeId: this.state.activeId === id ? undefined : this.state.activeId,
    });
  }
  async clearCalendar() {
    const generation = this.generation;
    await this.hydrate();
    await this.settled();
    if (generation !== this.generation) return;
    if (this.vault.unlocked) await this.vault.removeMany(this.state.savedIds);
    if (generation !== this.generation) return;
    this.dirty.clear();
    this.patch({ events: [], savedIds: [], activeId: undefined, recentIds: [] });
    this.savePreferences();
  }
}
export const CompanionContext = createContext<CompanionStore | null>(null);
export function useCompanion() {
  const store = useContext(CompanionContext);
  if (!store) throw new Error('Companion provider missing');
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { store, state };
}
