import { z } from 'zod';
import {
  calibrateIterations,
  decrypt,
  deriveKey,
  encrypt,
  envelopeSchema,
  metadataSchema,
  randomB64,
} from './crypto';
import type { Metadata } from './crypto';
import { commitArchive, readArchive } from './idb';
import { calendarEventSchema } from '../domain/calendar';

const short = z.string().max(20_000);
export const incidentSchema = z
  .object({
    id: z.uuid(),
    kind: z.literal('incident'),
    createdAtISO: z.iso.datetime(),
    updatedAtISO: z.iso.datetime(),
    context: short,
    observableFacts: short.trim().min(1),
    quoteFromMemory: short,
    workImpact: short,
    emotion: short,
    userInterpretation: short,
    behaviorIds: z.array(short).max(20),
    actualDecisions: short,
    unresolvedQuestions: short,
    nextAction: short,
    followUpStatus: z.enum(['none', 'pending', 'done']),
  })
  .strict();
export const taskRecordSchema = z
  .object({
    id: z.uuid(),
    kind: z.literal('task'),
    createdAtISO: z.iso.datetime(),
    updatedAtISO: z.iso.datetime(),
    title: short,
    brief: short,
  })
  .strict();
export const mantraStateSchema = z
  .object({
    id: z.uuid(),
    kind: z.literal('mantra_state'),
    createdAtISO: z.iso.datetime(),
    updatedAtISO: z.iso.datetime(),
    favorites: z.array(z.string().min(1)).max(250),
    recentIds: z.array(z.string().min(1)).max(64),
  })
  .strict();
export const recordSchema = z.union([
  incidentSchema,
  taskRecordSchema,
  calendarEventSchema,
  mantraStateSchema,
]);
export type VaultRecord = z.infer<typeof recordSchema>;
export type Incident = z.infer<typeof incidentSchema>;
export const MAX_ARCHIVE_BYTES = 5 * 1024 * 1024;
export const archiveSchema = z
  .object({
    format: z.literal('bossdetox.ing-vault'),
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    revision: z.uuid(),
    metadata: metadataSchema,
    verifier: envelopeSchema.refine((v) => v.kind === 'verifier'),
    records: z.array(envelopeSchema.refine((v) => v.kind !== 'verifier')).max(2000),
  })
  .strict()
  .superRefine((archive, ctx) => {
    const ids = [archive.verifier.id, ...archive.records.map((r) => r.id)];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate records' });
    if (
      archive.schemaVersion === 1 &&
      archive.records.some(
        (record) => record.kind === 'calendar_event' || record.kind === 'mantra_state',
      )
    )
      ctx.addIssue({ code: 'custom', message: 'New records require archive version 2' });
  })
  .transform((archive) => ({ ...archive, schemaVersion: 2 as const }));
export type Archive = z.infer<typeof archiveSchema>;
export function parseArchive(raw: string): Archive {
  if (new TextEncoder().encode(raw).length > MAX_ARCHIVE_BYTES)
    throw new Error('Archive exceeds 5 MB');
  return archiveSchema.parse(JSON.parse(raw));
}
export class Vault {
  private key?: CryptoKey;
  private archive?: Archive;
  private generation = 0;
  private writes: Promise<void> = Promise.resolve();
  private enqueue(operation: () => Promise<void>) {
    const generation = this.generation;
    const pending = this.writes.then(() => {
      this.assertSession(generation);
      return operation();
    });
    this.writes = pending.catch(() => undefined);
    return pending;
  }
  lock() {
    this.generation++;
    this.key = undefined;
    this.archive = undefined;
  }
  get unlocked() {
    return !!this.key;
  }
  async exists() {
    return !!(await readArchive());
  }
  private assertSession(generation: number) {
    if (generation !== this.generation) throw new Error('Vault locked. Unlock and retry.');
  }
  async create(passphrase: string) {
    if (passphrase.length < 12) throw new Error('Use at least 12 characters');
    const generation = this.generation;
    const metadata: Metadata = {
      id: crypto.randomUUID(),
      salt: randomB64(16),
      iterations: await calibrateIterations(),
      algorithm: 'PBKDF2-SHA256/AES-256-GCM',
    };
    const key = await deriveKey(passphrase, metadata);
    const verifier = await encrypt(key, metadata, crypto.randomUUID(), 'verifier', {
      check: 'bossdetox.ing-v1',
    });
    const archive: Archive = {
      format: 'bossdetox.ing-vault',
      schemaVersion: 2,
      revision: crypto.randomUUID(),
      metadata,
      verifier,
      records: [],
    };
    this.assertSession(generation);
    await commitArchive(archive, undefined);
    this.assertSession(generation);
    this.key = key;
    this.archive = archive;
  }
  async unlock(passphrase: string) {
    const generation = this.generation;
    const archive = archiveSchema.parse(await readArchive());
    const key = await deriveKey(passphrase, archive.metadata);
    await this.authenticate(archive, key);
    this.assertSession(generation);
    this.key = key;
    this.archive = archive;
  }
  private async authenticate(archive: Archive, key: CryptoKey) {
    const verifier = await decrypt(key, archive.metadata, archive.verifier);
    if (JSON.stringify(verifier) !== JSON.stringify({ check: 'bossdetox.ing-v1' }))
      throw new Error('Invalid verifier');
    for (const envelope of archive.records) {
      const record = recordSchema.parse(await decrypt(key, archive.metadata, envelope));
      if (record.id !== envelope.id || record.kind !== envelope.kind)
        throw new Error('Invalid record');
    }
  }
  async list(): Promise<VaultRecord[]> {
    const generation = this.generation;
    if (!this.key || !this.archive) throw new Error('Vault locked');
    const key = this.key;
    const archive = this.archive;
    const records = await Promise.all(
      archive.records.map(async (envelope) =>
        recordSchema.parse(await decrypt(key, archive.metadata, envelope)),
      ),
    );
    this.assertSession(generation);
    return records.sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
  }
  save(record: VaultRecord) {
    return this.enqueue(() => this.saveRecord(record));
  }
  private async saveRecord(record: VaultRecord) {
    const generation = this.generation;
    if (!this.key || !this.archive) throw new Error('Vault locked');
    const archive = this.archive;
    const safe = recordSchema.parse(record);
    if (new TextEncoder().encode(JSON.stringify(safe)).byteLength > 100_000)
      throw new Error('record-limit');
    const envelope = await encrypt(this.key, archive.metadata, safe.id, safe.kind, safe);
    const next = {
      ...archive,
      revision: crypto.randomUUID(),
      records: [...archive.records.filter((r) => r.id !== safe.id), envelope],
    };
    archiveSchema.parse(next);
    if (JSON.stringify(next).length > MAX_ARCHIVE_BYTES || next.records.length > 2000)
      throw new Error('Vault is full. Export a backup before deleting older notes.');
    this.assertSession(generation);
    await commitArchive(next, archive.revision);
    this.assertSession(generation);
    this.archive = next;
  }
  remove(id: string) {
    return this.removeMany([id]);
  }
  removeMany(ids: readonly string[]) {
    return this.enqueue(() => this.removeRecords(ids));
  }
  private async removeRecords(ids: readonly string[]) {
    if (!this.key || !this.archive) throw new Error('Vault locked');
    const generation = this.generation;
    const archive = this.archive;
    const next = {
      ...archive,
      revision: crypto.randomUUID(),
      records: archive.records.filter((r) => !ids.includes(r.id)),
    };
    await commitArchive(next, archive.revision);
    this.assertSession(generation);
    this.archive = next;
  }
  async export(): Promise<string> {
    const archive = await readArchive();
    if (!archive) throw new Error('No vault to export');
    return JSON.stringify(archiveSchema.parse(archive));
  }
  async restore(raw: string, passphrase: string, replace: boolean) {
    const generation = this.generation;
    const archive = parseArchive(raw);
    const existing = await readArchive();
    if (existing && !replace) throw new Error('Explicit replacement confirmation required');
    const key = await deriveKey(passphrase, archive.metadata);
    await this.authenticate(archive, key);
    this.assertSession(generation);
    await commitArchive({ ...archive, revision: crypto.randomUUID() }, existing?.revision);
    this.lock();
  }
  async wipe() {
    this.lock();
    const existing = await readArchive();
    await commitArchive(undefined, existing?.revision);
  }
}
export function newIncident(): Incident {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    kind: 'incident',
    createdAtISO: timestamp,
    updatedAtISO: timestamp,
    context: '',
    observableFacts: '',
    quoteFromMemory: '',
    workImpact: '',
    emotion: '',
    userInterpretation: '',
    behaviorIds: [],
    actualDecisions: '',
    unresolvedQuestions: '',
    nextAction: '',
    followUpStatus: 'none',
  };
}
