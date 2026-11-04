import { z } from 'zod';
import { tarot } from './tarot';
export const dailySchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cardId: z.string().refine((id) => tarot.some((c) => c.id === id)),
  })
  .strict();
export function dailyCard(stored: unknown, day: string, random: () => number = Math.random) {
  const previous = dailySchema.safeParse(stored);
  if (previous.success && previous.data.day === day) return previous.data;
  const cards = tarot.filter((c) => c.id !== (previous.success ? previous.data.cardId : ''));
  return dailySchema.parse({ day, cardId: cards[Math.floor(random() * cards.length)]!.id });
}
