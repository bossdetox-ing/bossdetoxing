import { z } from 'zod';
import authored from '../content/headings.en.json';
export const headings = z
  .array(
    z
      .object({
        id: z.string(),
        tone: z.enum(['plain', 'playful', 'unfiltered']),
        templates: z.object({ he: z.string(), she: z.string(), they: z.string() }),
      })
      .strict(),
  )
  .length(30)
  .parse(authored);
export function chooseHeading(
  humor: boolean,
  strong: boolean,
  current?: string,
  random: () => number = Math.random,
) {
  const allowed = headings.filter(
    (h) => (humor || h.tone === 'plain') && (strong || h.tone !== 'unfiltered') && h.id !== current,
  );
  return allowed[Math.floor(random() * allowed.length)]!.id;
}
export function headingText(
  id: string,
  pronouns: 'he' | 'she' | 'they',
  humor: boolean,
  strong: boolean,
) {
  const chosen = headings.find((h) => h.id === id);
  const safe =
    chosen && (humor || chosen.tone === 'plain') && (strong || chosen.tone !== 'unfiltered')
      ? chosen
      : headings[0]!;
  return safe.templates[pronouns];
}
