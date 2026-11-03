import 'fake-indexeddb/auto';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  decrypt,
  deriveKey,
  encrypt,
  MIN_ITERATIONS,
  randomB64,
  type Metadata,
} from '../../src/vault/crypto';
import { commitArchive, readArchive } from '../../src/vault/idb';
import {
  archiveSchema,
  MAX_ARCHIVE_BYTES,
  newIncident,
  parseArchive,
  Vault,
} from '../../src/vault/service';

const pass = 'fictional test passphrase';
beforeEach(async () => {
  const current = await readArchive();
  await commitArchive(undefined, current?.revision);
});
test('AES-GCM roundtrip, fresh IVs, nonextractable key and AAD binding', async () => {
  const metadata: Metadata = {
    id: crypto.randomUUID(),
    salt: randomB64(16),
    iterations: MIN_ITERATIONS,
    algorithm: 'PBKDF2-SHA256/AES-256-GCM',
  };
  const key = await deriveKey(pass, metadata);
  expect(key.extractable).toBe(false);
  const first = await encrypt(key, metadata, crypto.randomUUID(), 'incident', {
    text: 'fictional secret',
  });
  const second = await encrypt(key, metadata, first.id, 'incident', { text: 'fictional secret' });
  expect(first.ivB64).not.toBe(second.ivB64);
  expect(await decrypt(key, metadata, first)).toEqual({ text: 'fictional secret' });
  await expect(decrypt(key, metadata, { ...first, id: crypto.randomUUID() })).rejects.toThrow();
  await expect(decrypt(key, metadata, { ...first, kind: 'task' })).rejects.toThrow();
  await expect(
    decrypt(key, metadata, { ...first, ciphertextB64: first.ciphertextB64.slice(0, -4) + 'AAAA' }),
  ).rejects.toThrow();
});
test('records survive a new session only encrypted and locked', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const record = {
    ...newIncident(),
    observableFacts: 'FICTIONAL_PRIVATE_SENTINEL',
    context: 'private title',
  };
  await vault.save(record);
  const disk = JSON.stringify(await readArchive());
  expect(disk).not.toContain(record.observableFacts);
  expect(disk).not.toContain(record.context);
  expect(disk).not.toContain(pass);
  vault.lock();
  await expect(vault.list()).rejects.toThrow('locked');
  await expect(vault.save(record)).rejects.toThrow('locked');
  const reopened = new Vault();
  expect(reopened.unlocked).toBe(false);
  await expect(reopened.unlock('incorrect password')).rejects.toThrow();
  await reopened.unlock(pass);
  expect((await reopened.list())[0]).toEqual(record);
});
test('encrypted archive roundtrip; wrong password and tampering preserve existing data', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const record = { ...newIncident(), observableFacts: 'Fictional archival record' };
  await vault.save(record);
  const exported = await vault.export();
  await expect(vault.restore(exported, pass, false)).rejects.toThrow('confirmation');
  const before = await readArchive();
  await expect(vault.restore(exported, 'wrong password', true)).rejects.toThrow();
  expect(await readArchive()).toEqual(before);
  const tampered = JSON.parse(exported);
  tampered.records[0].ciphertextB64 = tampered.records[0].ciphertextB64.slice(0, -4) + 'AAAA';
  await expect(vault.restore(JSON.stringify(tampered), pass, true)).rejects.toThrow();
  expect(await readArchive()).toEqual(before);
  await vault.wipe();
  await vault.restore(exported, pass, false);
  expect(vault.unlocked).toBe(false);
  await vault.unlock(pass);
  expect((await vault.list())[0]).toEqual(record);
});
test('archive limits and incompatible/duplicate schemas are rejected before decryption', async () => {
  expect(() => parseArchive(' '.repeat(MAX_ARCHIVE_BYTES + 1))).toThrow('5 MB');
  expect(() => parseArchive('{"schemaVersion":0}')).toThrow();
  const vault = new Vault();
  await vault.create(pass);
  const archive = JSON.parse(await vault.export());
  expect(archiveSchema.safeParse({ ...archive, unknown: true }).success).toBe(false);
  expect(
    archiveSchema.safeParse({ ...archive, metadata: { ...archive.metadata, iterations: 1 } })
      .success,
  ).toBe(false);
  expect(archiveSchema.safeParse({ ...archive, records: [archive.verifier] }).success).toBe(false);
});
test('stale panels and interrupted transaction cannot overwrite live data', async () => {
  const first = new Vault();
  await first.create(pass);
  const second = new Vault();
  await second.unlock(pass);
  await first.save({ ...newIncident(), observableFacts: 'A' });
  await expect(second.save({ ...newIncident(), observableFacts: 'B' })).rejects.toThrow(
    'another panel',
  );
  const before = await readArchive();
  const prototype = IDBObjectStore.prototype;
  const original = prototype.put;
  const spy = vi.spyOn(prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore['put']>
  ) {
    const result = original.apply(this, args);
    this.transaction.abort();
    return result;
  });
  await expect(
    commitArchive({ ...before!, revision: crypto.randomUUID() }, before!.revision),
  ).rejects.toThrow();
  spy.mockRestore();
  expect(await readArchive()).toEqual(before);
});
test('locking while unlock/restore is pending cannot reopen the vault or commit import', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const backup = await vault.export();
  vault.lock();
  const unlocking = vault.unlock(pass);
  vault.lock();
  await expect(unlocking).rejects.toThrow('locked');
  expect(vault.unlocked).toBe(false);
  const before = await readArchive();
  const restoring = vault.restore(backup, pass, true);
  vault.lock();
  await expect(restoring).rejects.toThrow('locked');
  expect(await readArchive()).toEqual(before);
});
test('entry deletion and complete vault deletion remove local records', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const record = { ...newIncident(), observableFacts: 'Delete fixture' };
  await vault.save(record);
  await vault.remove(record.id);
  expect(await vault.list()).toEqual([]);
  await vault.wipe();
  expect(await readArchive()).toBeUndefined();
  expect(await vault.exists()).toBe(false);
});
test('large multi-field records cannot make the stored vault unreadable', async () => {
  const vault = new Vault();
  await vault.create(pass);
  const before = await readArchive();
  const field = 'x'.repeat(20_000);
  const record = {
    ...newIncident(),
    observableFacts: field,
    quoteFromMemory: field,
    context: field,
    workImpact: field,
    userInterpretation: field,
    nextAction: field,
  };
  await expect(vault.save(record)).rejects.toThrow('record-limit');
  expect(await readArchive()).toEqual(before);
  vault.lock();
  await vault.unlock(pass);
  expect(await vault.list()).toEqual([]);
});
