import { z } from 'zod';

export const MIN_ITERATIONS = 600_000;
export const MAX_ITERATIONS = 2_000_000;
const b64 = z
  .string()
  .max(200_000)
  .regex(/^[A-Za-z0-9+/]+={0,2}$/);
export const metadataSchema = z
  .object({
    id: z.uuid(),
    salt: b64,
    iterations: z.number().int().min(MIN_ITERATIONS).max(MAX_ITERATIONS),
    algorithm: z.literal('PBKDF2-SHA256/AES-256-GCM'),
  })
  .strict();
export type Metadata = z.infer<typeof metadataSchema>;
export const envelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.uuid(),
    kind: z.enum(['verifier', 'incident', 'task', 'calendar_event', 'mantra_state']),
    ivB64: b64.refine((v) => fromB64(v).length === 12),
    ciphertextB64: b64,
  })
  .strict();
export type Envelope = z.infer<typeof envelopeSchema>;
export function toB64(bytes: Uint8Array): string {
  let result = '';
  for (const byte of bytes) result += String.fromCharCode(byte);
  return btoa(result);
}
export function fromB64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
export function randomB64(length: number): string {
  return toB64(crypto.getRandomValues(new Uint8Array(length)));
}
export async function deriveKey(passphrase: string, metadata: Metadata): Promise<CryptoKey> {
  const salt = fromB64(metadata.salt);
  if (salt.length < 16 || salt.length > 64) throw new Error('Invalid vault metadata');
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: metadata.iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
export async function calibrateIterations(): Promise<number> {
  const start = performance.now();
  await deriveKey('calibration-only', {
    id: crypto.randomUUID(),
    salt: randomB64(16),
    iterations: MIN_ITERATIONS,
    algorithm: 'PBKDF2-SHA256/AES-256-GCM',
  });
  const elapsed = Math.max(1, performance.now() - start);
  return Math.min(
    MAX_ITERATIONS,
    Math.max(MIN_ITERATIONS, Math.round((MIN_ITERATIONS * 250) / elapsed)),
  );
}
function aad(meta: Metadata, id: string, kind: Envelope['kind']) {
  return new TextEncoder().encode(
    JSON.stringify([1, meta.id, meta.salt, meta.iterations, id, kind]),
  );
}
export async function encrypt(
  key: CryptoKey,
  meta: Metadata,
  id: string,
  kind: Envelope['kind'],
  value: unknown,
): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(meta, id, kind), tagLength: 128 },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return {
    schemaVersion: 1,
    id,
    kind,
    ivB64: toB64(iv),
    ciphertextB64: toB64(new Uint8Array(ciphertext)),
  };
}
export async function decrypt(
  key: CryptoKey,
  meta: Metadata,
  envelope: Envelope,
): Promise<unknown> {
  const value = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromB64(envelope.ivB64),
      additionalData: aad(meta, envelope.id, envelope.kind),
      tagLength: 128,
    },
    key,
    fromB64(envelope.ciphertextB64),
  );
  return JSON.parse(new TextDecoder().decode(value));
}
