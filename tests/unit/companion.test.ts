import 'fake-indexeddb/auto';
import { beforeEach, expect, test, vi } from 'vitest';
import { CompanionStore } from '../../src/app/companion-store';
import { Vault } from '../../src/vault/service';
import { deriveKey, encrypt } from '../../src/vault/crypto';
import { commitArchive, readArchive } from '../../src/vault/idb';
import { localDay } from '../../src/domain/calendar';
vi.setConfig({ testTimeout: 20000 });
const pass = 'fictional calendar passphrase';
beforeEach(async () => {
  const archive = await readArchive();
  await commitArchive(undefined, archive?.revision);
});
test('one explicit tap creates one tagged event; configure and favorite changes preserve its mantra', async () => {
  const vault = new Vault(),
    store = new CompanionStore(vault);
  store.configure(false, true, false);
  const event = store.choose('meeting_loop');
  const text = event.mantra.text;
  store.configure(false, false, true);
  store.toggleFavorite(event.mantra.id);
  expect(store.active()?.mantra.text).toBe(text);
  expect(store.getSnapshot().events).toHaveLength(1);
  expect(store.active()).not.toHaveProperty('plannedResponseId');
  expect(await vault.exists()).toBe(false);
});
test('peek offers another line for the threat without changing the logged event', () => {
  const store = new CompanionStore(new Vault());
  const first = store.choose('moving_goalposts');
  const next = store.peek(first.mantra.id)!;
  expect(next.id).not.toBe(first.mantra.id);
  const event = store.active()!;
  expect(event.mantra.id).toBe(first.mantra.id);
  expect(store.getSnapshot().events).toHaveLength(1);
});
test('calendar snapshots, favorites and no-repeat state persist only encrypted and survive unlock', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const store = new CompanionStore(vault);
  store.configure(true, true, false);
  const first = store.choose('dismissal_warning');
  store.toggleFavorite(first.mantra.id);
  await store.settled();
  const raw = JSON.stringify(await readArchive());
  expect(raw).not.toContain(first.mantra.text);
  expect(raw).not.toContain(first.situationId);
  const next = new CompanionStore(vault);
  await next.hydrate();
  expect(next.getSnapshot().favorites).toContain(first.mantra.id);
  expect(next.getSnapshot().recentIds).toContain(first.mantra.id);
  expect(next.getSnapshot().events[0]!.mantra).toEqual(first.mantra);
  expect((await vault.list()).filter((record) => record.kind === 'mantra_state')).toHaveLength(1);
  store.clear();
  vault.lock();
  expect(store.getSnapshot().events).toEqual([]);
  expect(store.getSnapshot().favorites).toEqual([]);
  await vault.unlock(pass);
  await store.hydrate();
  expect(store.getSnapshot().events).toHaveLength(1);
});
test('enabling history explicitly preserves the currently displayed session phrase', async () => {
  const vault = new Vault();
  const store = new CompanionStore(vault);
  const event = store.choose('guilt_induction');
  expect(await readArchive()).toBeUndefined();
  await vault.create(pass);
  store.configure(true, true, false);
  await store.enablePersistence();
  expect(store.active()?.mantra).toEqual(event.mantra);
  expect((await vault.list()).find((record) => record.kind === 'calendar_event')).toMatchObject({
    id: event.id,
    mantra: event.mantra,
  });
});
test('calendar bulk deletion preserves favorites, and serial writes do not lose events', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const store = new CompanionStore(vault);
  store.configure(true, true, false);
  const first = store.choose('meeting_loop');
  store.toggleFavorite(first.mantra.id);
  store.choose('colleague_gossip');
  await store.settled();
  expect(store.getSnapshot().events).toHaveLength(2);
  await store.clearCalendar();
  await store.settled();
  const records = await vault.list();
  expect(records.filter((r) => r.kind === 'calendar_event')).toHaveLength(0);
  expect(records.filter((r) => r.kind === 'mantra_state')).toHaveLength(1);
  expect(store.getSnapshot().favorites).toContain(first.mantra.id);
});
test('1.1.0 calendar records with reply fields still open; the old fields are dropped', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const empty = JSON.parse(await vault.export());
  const event = new CompanionStore(new Vault()).choose('meeting_loop');
  const legacy = {
    ...event,
    status: 'planned',
    plannedResponseStyle: 'grey',
    plannedResponseId: 'fictional-reply',
    plannedResponseText: 'Fictional planned reply',
    outcome: 'agreed',
    notes: 'Fictional old note',
  };
  const key = await deriveKey(pass, empty.metadata);
  const archive = {
    ...empty,
    records: [await encrypt(key, empty.metadata, event.id, 'calendar_event', legacy)],
  };
  await vault.wipe();
  await vault.restore(JSON.stringify(archive), pass, false);
  await vault.unlock(pass);
  expect(await vault.list()).toEqual([event]);
});
test('version 1 archives import as version 2', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const original = JSON.parse(await vault.export());
  original.schemaVersion = 1;
  await vault.wipe();
  await vault.restore(JSON.stringify(original), pass, false);
  await vault.unlock(pass);
  expect(JSON.parse(await vault.export()).schemaVersion).toBe(2);
});
test('local calendar keys do not parse date-only UTC strings', () => {
  expect(localDay(new Date(2026, 10, 3, 0, 15).toISOString())).toBe('2026-11-03');
});

test('withdrawing consent or locking cancels pending automatic saves', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const store = new CompanionStore(vault);
  store.configure(true, true, false);
  store.choose('meeting_loop');
  store.setConsent(false);
  await store.settled();
  expect(await vault.list()).toHaveLength(0);
  store.configure(true, true, false);
  store.choose('guilt_induction');
  const pending = store.settled();
  store.clear();
  vault.lock();
  await pending;
  expect(store.getSnapshot().events).toHaveLength(0);
  await vault.unlock(pass);
  expect(await vault.list()).toHaveLength(0);
});

test('explicitly reenabling history saves notes typed while automatic logging was off', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const store = new CompanionStore(vault);
  store.configure(true, true, false);
  store.choose('meeting_loop');
  await store.settled();
  store.setConsent(false);
  store.setNote('meeting_loop', 'Fictional note typed in session only');
  await new Promise((resolve) => setTimeout(resolve, 700));
  await store.settled();
  const notes = async () => {
    const state = (await vault.list()).find((record) => record.kind === 'mantra_state');
    return state && 'notes' in state ? state.notes : undefined;
  };
  expect(await notes()).toEqual({});
  store.setConsent(true);
  await store.enablePersistence();
  expect(await notes()).toEqual({ meeting_loop: 'Fictional note typed in session only' });
});
