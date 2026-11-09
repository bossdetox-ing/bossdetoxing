import { z } from 'zod';
import authored from '../content/mantras.en.json';
import authoredReflections from '../content/reflections.en.json';

export const mantraPurposes = ['grounding', 'self_respect', 'distancing', 'dark_humor'] as const;
export const phases = ['before', 'during', 'after'] as const;
export const mantraSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().trim().min(1).max(200),
    situationIds: z.array(z.string()),
    behaviorIds: z.array(z.string()),
    purpose: z.enum(mantraPurposes),
    phases: z.array(z.enum(phases)).min(1),
    emotions: z.array(
      z.enum(['afraid', 'angry', 'guilty', 'embarrassed', 'confused', 'overloaded', 'other']),
    ),
    variant: z.enum(['plain', 'dark_humor']),
    seriousSafe: z.boolean(),
    /** The reflection behind this line, opened from "read more". */
    reflectionId: z.string().min(1).optional(),
    /** Out of rotation, kept so saved favorites and history still resolve. */
    retired: z.literal(true).optional(),
  })
  .strict();
export type Mantra = z.infer<typeof mantraSchema>;
export type MantraContext = {
  situationId?: string;
  emotion?: string;
  /** Unset: lines for every phase rotate. */
  phase?: (typeof phases)[number];
  purpose?: (typeof mantraPurposes)[number];
  humor: boolean;
  serious: boolean;
};
export const reflectionSchema = z
  .object({
    id: z.string().min(1),
    situationId: z.string().min(1),
    phases: z.array(z.enum(phases)).min(1),
    text: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
  })
  .strict();
export type Reflection = z.infer<typeof reflectionSchema>;
export const reflections = z.array(reflectionSchema).parse(authoredReflections);
export const reflectionById = new Map(reflections.map((r) => [r.id, r]));
export const mantras = z
  .array(mantraSchema)
  .min(250)
  .superRefine((library, ctx) => {
    for (const m of library)
      if (
        m.reflectionId &&
        reflectionById.get(m.reflectionId)?.situationId !== (m.situationIds[0] ?? 'general')
      )
        ctx.addIssue({ code: 'custom', message: `Unknown reflection: ${m.id}` });
  })
  .parse(authored);
export const mantraById = new Map(mantras.map((m) => [m.id, m]));
export function reflectionFor(mantraId: string): Reflection | undefined {
  const id = mantraById.get(mantraId)?.reflectionId;
  return id ? reflectionById.get(id) : undefined;
}
export const snapshotSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1).max(200),
    locale: z.literal('en'),
    purpose: z.enum(mantraPurposes),
  })
  .strict();
export type MantraSnapshot = z.infer<typeof snapshotSchema>;
export function snapshot(mantra: Mantra): MantraSnapshot {
  return { id: mantra.id, text: mantra.text, locale: 'en', purpose: mantra.purpose };
}
const highRiskSituations = ['dismissal_warning', 'suspected_retaliation', 'surveillance_concern'];
export function eligibleMantras(context: MantraContext, library: readonly Mantra[] = mantras) {
  return library.filter(
    (m) =>
      !m.retired &&
      (!context.phase || m.phases.includes(context.phase)) &&
      (!m.situationIds.length ||
        (!!context.situationId && m.situationIds.includes(context.situationId))) &&
      ((context.humor && !highRiskSituations.includes(context.situationId ?? '')) ||
        m.variant !== 'dark_humor') &&
      (!context.serious || (m.seriousSafe && m.variant !== 'dark_humor')),
  );
}
export function selectMantra(
  context: MantraContext,
  recent: readonly string[],
  favorites: readonly string[],
  currentId?: string,
  random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296,
  library: readonly Mantra[] = mantras,
): Mantra {
  const eligible = eligibleMantras(context, library).filter((m) => m.id !== currentId);
  if (!eligible.length) throw new Error('No eligible mantra');
  const fresh = eligible.filter((m) => !recent.includes(m.id));
  if (!fresh.length)
    return [...eligible].sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id))[0]!;
  const weights = fresh.map(
    (m) =>
      (m.situationIds.includes(context.situationId ?? '') ? 6 : 1) *
      (m.purpose === context.purpose ? 3 : 1) *
      (m.emotions.includes(context.emotion as Mantra['emotions'][number]) ? 2 : 1) *
      (favorites.includes(m.id) ? 1.5 : 1),
  );
  let cursor =
    Math.min(1 - Number.EPSILON, Math.max(0, random())) * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < fresh.length; i++) {
    cursor -= weights[i]!;
    if (cursor < 0) return fresh[i]!;
  }
  return fresh[fresh.length - 1]!;
}
export function rememberMantra(history: readonly string[], id: string) {
  return [...history.filter((item) => item !== id), id].slice(-64);
}
export function normalizeMantra(text: string) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export function reviewMantras(
  library: readonly Mantra[],
  situationIds: readonly string[],
): string[] {
  const issues: string[] = [];
  library = library.filter((m) => !m.retired);
  const seenIds = new Set<string>();
  const seenText = new Set<string>();
  for (const m of library) {
    const normalized = normalizeMantra(m.text);
    const words = normalized.split(' ');
    if (seenIds.has(m.id) || seenText.has(normalized)) issues.push(`Duplicate: ${m.id}`);
    seenIds.add(m.id);
    seenText.add(normalized);
    if (words.length > 24 || words.length < 5) issues.push(`Word limit: ${m.id}`);
    if (!/[.!?]$/.test(m.text) || /\s{2,}|\b(\w+)\s+\1\b/i.test(m.text))
      issues.push(`Grammar lint: ${m.id}`);
    if (
      m.situationIds.some((id) => !situationIds.includes(id)) ||
      m.behaviorIds.some((id) => !m.situationIds.includes(id.replace(/^behavior_/, '')))
    )
      issues.push(`Unknown taxonomy: ${m.id}`);
    if (
      (m.purpose === 'dark_humor') !== (m.variant === 'dark_humor') ||
      (m.variant === 'dark_humor' &&
        (m.seriousSafe || m.situationIds.some((id) => highRiskSituations.includes(id))))
    )
      issues.push(`Unsafe humor: ${m.id}`);
    if (
      /\b(narcissist|psychopath|sociopath|diagnos|cure|guarantee[ds]?|always safe|nothing bad|won't be fired|everything will be fine|just be positive)\b/i.test(
        m.text,
      )
    )
      issues.push(`Unsafe claim: ${m.id}`);
  }
  // Shared short phrases are normal English; long token overlap identifies copy-like variants.
  for (let i = 0; i < library.length; i++)
    for (let j = i + 1; j < library.length; j++) {
      const a = new Set(normalizeMantra(library[i]!.text).split(' '));
      const b = new Set(normalizeMantra(library[j]!.text).split(' '));
      const common = [...a].filter((word) => b.has(word)).length;
      if (common / new Set([...a, ...b]).size >= 0.78)
        issues.push(`Near duplicate: ${library[i]!.id} / ${library[j]!.id}`);
    }
  return issues;
}
