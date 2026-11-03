import { en } from '../content/en';
export const taskFields = [
  'objective',
  'deliverable',
  'currentRequirement',
  'previousRequirement',
  'owner',
  'deadline',
  'priority',
  'acceptanceCriteria',
  'constraints',
  'dependencies',
  'decisions',
  'workImpact',
] as const;
export type TaskField = (typeof taskFields)[number];
export type TaskInput = { notes: string } & Record<TaskField, string>;
export const emptyTask = (): TaskInput =>
  Object.fromEntries(['notes', ...taskFields].map((key) => [key, ''])) as TaskInput;
export const taskLabels: Record<TaskField, string> = en.taskLabels;
export const questionByField = en.taskQuestions;
export type QuestionKey = keyof typeof questionByField;
export function unknowns(input: TaskInput): QuestionKey[] {
  return (Object.keys(questionByField) as QuestionKey[]).filter((key) => !input[key].trim());
}
export function clarification(input: TaskInput, selected = unknowns(input).slice(0, 3)): string {
  const hasConflict = !!(input.priority.trim() || input.workImpact.trim());
  const questions = selected
    .slice(0, hasConflict ? 2 : 3)
    .map((key) => questionByField[key])
    .join(' ');
  const conflict = hasConflict ? ` ${en.taskText.conflict}` : '';
  return `${en.taskText.clarify} ${questions}${conflict}`.trim();
}
export function buildBrief(input: TaskInput): string {
  const copy = en.taskText;
  const confirmed = taskFields
    .map((key) => `${taskLabels[key]}: ${input[key].trim() || en.unspecified}`)
    .join('\n');
  return `${copy.title}\n\n${confirmed}\n\n${copy.raw}\n${input.notes || en.unspecified}\n\n${copy.unknowns}\n${
    unknowns(input)
      .map((key) => taskLabels[key])
      .join(', ') || copy.reviewDetails
  }\n\n${copy.next} ${unknowns(input).length ? copy.confirmMissing : copy.verifyDone}\n\n${copy.separate}`;
}
export function copyRisks(value: string): boolean {
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|\b(?:password|passwd|secret|token|api[_ -]?key|customer|client|credential)\b|\b\d{3}[- .]?\d{3}[- .]?\d{4}\b/i.test(
    value,
  );
}
