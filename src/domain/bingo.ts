import { z } from 'zod';
import authored from '../content/bingo.en.json';
import { shuffled } from './session';
export const bingoSchema = z
  .array(
    z
      .object({
        id: z.string().min(1),
        text: z.string().min(1).max(140),
        category: z.enum(['general', 'meetings', 'clarity', 'communication', 'process']),
      })
      .strict(),
  )
  .length(120);
export const bingo = bingoSchema.parse(authored);
export function customSquares(input: string) {
  const lines = input
    .split('\n')
    .map((text) => text.trim())
    .filter(Boolean);
  if (lines.length > 60 || lines.some((text) => text.length > 140)) throw new Error('bingo-limit');
  const seen = new Set<string>();
  return lines.filter((text) => {
    const key = text.normalize('NFKC').toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function bingoCategory(id?: string) {
  if (id === 'meeting_loop' || id === 'after_meeting_replay') return 'meetings';
  if (
    [
      'moving_goalposts',
      'conflicting_priorities',
      'vague_accusation',
      'circular_interrogation',
    ].includes(id ?? '')
  )
    return 'clarity';
  if (['colleague_gossip', 'guilt_induction', 'public_criticism'].includes(id ?? ''))
    return 'communication';
  return undefined;
}
export function bingoBoard(
  custom: readonly string[] = [],
  category?: string,
  random: () => number = Math.random,
  recent: readonly string[] = [],
) {
  const own = shuffled([...new Set(custom)], random).slice(0, 9);
  const pool = shuffled(bingo, random).filter((item) => !own.includes(item.text));
  const fresh = pool.filter((item) => !recent.includes(item.text));
  const candidates = fresh.length >= 9 - own.length ? fresh : pool;
  const matching = candidates.filter((item) => item.category === category),
    other = candidates.filter((item) => item.category !== category);
  return shuffled(
    [...own, ...matching, ...other]
      .slice(0, 9)
      .map((item) => (typeof item === 'string' ? item : item.text)),
    random,
  );
}
