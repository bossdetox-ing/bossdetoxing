import { z } from 'zod';
import { snapshotSchema } from './mantras';
export const calendarEventSchema = z
  .object({
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
    status: z.enum(['tagged', 'planned']),
    plannedResponseStyle: z.enum(['yellow', 'grey', 'firm']).nullable(),
    plannedResponseId: z.string().nullable(),
    plannedResponseText: z.string().max(20000).nullable(),
    outcome: z.enum(['need_clarity', 'agreed', 'changed', 'no_decision']).nullable(),
    notes: z.string().max(20000),
  })
  .strict()
  .superRefine((event, ctx) => {
    if (
      event.status === 'tagged' &&
      (event.plannedResponseStyle || event.plannedResponseId || event.plannedResponseText)
    )
      ctx.addIssue({ code: 'custom', message: 'Unplanned event cannot claim a response' });
    if (
      event.status === 'planned' &&
      (!event.plannedResponseStyle || !event.plannedResponseId || !event.plannedResponseText)
    )
      ctx.addIssue({ code: 'custom', message: 'A plan needs an explicit response' });
  });
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export function localDay(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
