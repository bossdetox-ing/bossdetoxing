import { z } from 'zod';
import { snapshotSchema } from './mantras';
// A plain object schema drops keys it doesn't list.
const event = z.object({
  id: z.uuid(),
  kind: z.literal('calendar_event'),
  createdAtISO: z.iso.datetime(),
  updatedAtISO: z.iso.datetime(),
  eventType: z.literal('self_reported_trigger'),
  source: z.literal('user_tap'),
  categoryId: z.string().min(1),
  situationId: z.string().min(1),
  mantra: snapshotSchema,
  phase: z.enum(['before', 'during', 'after']),
});
// 1.1.0 saved reply and outcome fields the app no longer records. Old encrypted records still
// carry them, so they are accepted here and dropped on read.
export const calendarEventSchema = event
  .extend({
    status: z.enum(['tagged', 'planned']).optional(),
    plannedResponseStyle: z.enum(['yellow', 'grey', 'firm']).nullable().optional(),
    plannedResponseId: z.string().nullable().optional(),
    plannedResponseText: z.string().max(20000).nullable().optional(),
    outcome: z.enum(['need_clarity', 'agreed', 'changed', 'no_decision']).nullable().optional(),
    notes: z.string().max(20000).optional(),
  })
  .strict()
  .transform((saved) => event.parse(saved));
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export function localDay(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
