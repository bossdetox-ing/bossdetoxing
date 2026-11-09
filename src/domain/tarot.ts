import { z } from 'zod';
import authored from '../content/tarot.en.json';
import authoredReflections from '../content/tarot-reflections.en.json';
export const tarotCardSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    fictionalSymbolism: z.string().min(1),
    groundedMantra: z.string().min(1),
    nextAction: z.string().min(1),
    notPrediction: z.literal(true),
    humorAllowed: z.boolean(),
    arcana: z.enum(['major', 'minor']),
    number: z.number().int().min(0).max(21),
    suit: z.enum(['swords', 'cups', 'wands', 'pentacles']).nullable(),
    rank: z.string().nullable(),
    traditionalName: z.string().min(1),
  })
  .strict();
export const tarotDeckSchema = z
  .array(tarotCardSchema)
  .length(78)
  .superRefine((cards, ctx) => {
    if (new Set(cards.map((c) => c.id)).size !== 78)
      ctx.addIssue({ code: 'custom', message: 'Duplicate cards' });
    const major = cards.filter((c) => c.arcana === 'major');
    if (
      major.length !== 22 ||
      new Set(major.map((c) => c.number)).size !== 22 ||
      major.some((c) => c.suit !== null || c.rank !== null)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid major arcana' });
    for (const suit of ['swords', 'cups', 'wands', 'pentacles']) {
      const minor = cards.filter((c) => c.suit === suit);
      if (
        minor.length !== 14 ||
        new Set(minor.map((c) => c.number)).size !== 14 ||
        minor.some((c) => c.arcana !== 'minor' || c.number < 1 || c.number > 14 || !c.rank)
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid suit' });
    }
  });
export const tarot = tarotDeckSchema.parse(authored);

/** The card's "Read more": a short reflection and an optional prompt, opened under its mantra. */
export const tarotReflections = z
  .array(
    z
      .object({
        cardId: z.string().min(1),
        text: z.string().trim().min(1),
        /** Absent when the reflection ends on its own last sentence. */
        prompt: z.string().trim().min(1).optional(),
      })
      .strict(),
  )
  .parse(authoredReflections);
const reflectionByCard = new Map(tarotReflections.map((r) => [r.cardId, r]));
export const tarotReflection = (cardId: string) => reflectionByCard.get(cardId);
