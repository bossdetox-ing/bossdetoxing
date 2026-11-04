import authored from '../content/replies.en.json';
import { z } from 'zod';
import type { Scenario, Tone } from './content';
export const replyVariants = z
  .record(
    z.string(),
    z
      .object({
        yellow: z.array(z.string().min(1)).length(2),
        grey: z.array(z.string().min(1)).length(2),
        firm: z.array(z.string().min(1)).length(2),
      })
      .strict(),
  )
  .parse(authored);
const last = new Map<string, number>();
export function responseVersion(id: string) {
  const previous = last.get(id);
  const choices = [0, 1, 2].filter((index) => index !== previous);
  const chosen = choices[Math.floor(Math.random() * choices.length)]!;
  last.set(id, chosen);
  return chosen;
}
export function responseSet(scenario: Scenario, version: number) {
  return Object.fromEntries(
    (['yellow', 'grey', 'firm'] as const).map((tone) => [
      tone,
      version === 0
        ? scenario.responses[tone]
        : (replyVariants[scenario.id]?.[tone][version - 1] ?? scenario.responses[tone]),
    ]),
  ) as Record<Tone, string>;
}
export function clearReplyHistory() {
  last.clear();
}
