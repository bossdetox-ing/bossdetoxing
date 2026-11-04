import { z } from 'zod';

// A user's own threat: one word or short phrase drawn in a live WordArt style, plus their own
// line to say and line to write. Private: encrypted with history on, memory-only otherwise.
export const liveStyles = [
  'flame',
  'neon',
  'rainbow',
  'chrome',
  'ocean',
  'bronze',
  'ice',
  'ink',
] as const;
export type LiveStyle = (typeof liveStyles)[number];

export const customThreatSchema = z
  .object({
    id: z.string().regex(/^custom:[\w-]{8,64}$/),
    label: z.string().trim().min(1).max(24),
    style: z.enum(liveStyles),
    description: z.string().max(140).optional(),
    say: z.string().max(300),
    write: z.string().max(600),
  })
  .strict();
export type CustomThreat = z.infer<typeof customThreatSchema>;

export const isCustomThreat = (id: string) => id.startsWith('custom:');
export const newCustomThreatId = () => `custom:${crypto.randomUUID()}`;
