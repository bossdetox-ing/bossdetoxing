import workerChecks from '../content/worker-first.en.json';
import { z } from 'zod';
import seed from '../content/content-seed.json';
import overrides from '../content/en-overrides.json';
import practices from '../content/en-practices.json';
import { en } from '../content/en';
import { mantras, mantraSchema } from './mantras';
import { tarot, tarotDeckSchema } from './tarot';

const text = z.string().trim().min(1);
export const toneSchema = z.enum(['yellow', 'grey', 'firm']);
export type Tone = z.infer<typeof toneSchema>;
const refs = { id: text, sourceIds: z.array(text) };
const strings = z.array(text);
export const evidenceLabels = en.evidenceLabels;
export const contentSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    scenarios: z
      .array(
        z.object({
          ...refs,
          label: text,
          observedExample: text,
          techniqueIds: strings.min(1),
          responses: z.object({ yellow: text, grey: text, firm: text }),
          privateMantras: strings.min(1),
          recommendedTone: toneSchema,
          nextAction: text,
        }),
      )
      .min(20),
    behaviors: z
      .array(
        z.object({
          ...refs,
          title: text,
          observedIndicators: strings.min(1),
          alternativeExplanations: strings.min(1),
          doNotInfer: strings.min(1),
          techniqueIds: strings.min(1),
          factualFollowUp: text,
        }),
      )
      .min(20),
    techniques: z
      .array(
        z.object({
          ...refs,
          title: text,
          evidenceType: z.enum([
            'research_supported_process',
            'clinical_skill_adaptation',
            'practitioner_heuristic',
            'symbolic_entertainment',
          ]),
          mechanism: text,
          whenUseful: strings,
          caution: strings.min(1),
          microExercise: strings,
        }),
      )
      .min(20),
    mantras: z.array(mantraSchema).min(250),
    tarot: tarotDeckSchema,
    corporateWeather: strings.min(12),
    sources: z.array(
      z.object({
        id: text,
        title: text,
        url: z.url().refine((v) => v.startsWith('https://')),
        sourceType: text,
      }),
    ),
  })
  .superRefine((data, ctx) => {
    const techniques = new Set(data.techniques.map((t) => t.id));
    const sources = new Set(data.sources.map((t) => t.id));
    const scenarios = new Set(data.scenarios.map((t) => t.id));
    for (const group of [
      data.scenarios,
      data.behaviors,
      data.techniques,
      data.mantras,
      data.tarot,
      data.sources,
    ]) {
      if (new Set(group.map((x) => x.id)).size !== group.length)
        ctx.addIssue({ code: 'custom', message: 'Duplicate content ID' });
    }
    for (const item of [...data.scenarios, ...data.behaviors]) {
      if (item.techniqueIds.some((id) => !techniques.has(id)))
        ctx.addIssue({ code: 'custom', message: 'Unknown technique' });
    }
    for (const item of [...data.scenarios, ...data.behaviors, ...data.techniques]) {
      if (item.sourceIds.some((id) => !sources.has(id)))
        ctx.addIssue({ code: 'custom', message: 'Unknown source' });
    }
    if (data.mantras.some((m) => m.situationIds.some((id) => !scenarios.has(id))))
      ctx.addIssue({ code: 'custom', message: 'Unknown mantra scenario' });
  });
export const content = contentSchema.parse({
  ...seed,
  mantras,
  tarot,
});
for (const scenario of content.scenarios) {
  const edited = overrides[scenario.id as keyof typeof overrides];
  if (edited) Object.assign(scenario.responses, edited);
}
for (const technique of content.techniques) {
  technique.whenUseful = content.scenarios
    .filter((s) => s.techniqueIds.includes(technique.id))
    .map((s) => s.label);
  technique.microExercise = practices[technique.id as keyof typeof practices] ?? [];
}
export type Scenario = (typeof content.scenarios)[number];
export type Technique = (typeof content.techniques)[number];
export const defaultScenario = content.scenarios[0]!;

// This is a product synthesis, rather than a named, validated clinical skill.
const controlledPause = content.techniques.find((t) => t.id === 'controlled_pause');
if (controlledPause) controlledPause.evidenceType = 'practitioner_heuristic';

for (const behavior of content.behaviors) {
  const key = behavior.id.replace(/^behavior_/, '') as keyof typeof workerChecks;
  behavior.alternativeExplanations = workerChecks[key];
}
