import { expect, test } from 'vitest';
import { content, contentSchema } from '../../src/domain/content';
import { buildBrief, clarification, emptyTask, copyRisks } from '../../src/domain/task';
import { hasLine, remainingSeconds, shuffled } from '../../src/domain/session';
import { resolveLocale } from '../../src/content';
import { professionalResponse } from '../../src/domain/scripts';
test('spoken responses preserve the selected tone and follow-ups never invent agreement', () => {
  const scenario = content.scenarios[0]!;
  expect(professionalResponse(scenario, 'firm', 'spoken')).toBe(scenario.responses.firm);
  expect(professionalResponse(scenario, 'yellow', 'spoken')).toBe(
    'Could we look at one specific deliverable and the outcome you want?',
  );
  expect(professionalResponse(scenario, 'yellow', 'follow_up')).toContain(
    'Decision: Not specified',
  );
});
test('locale packs preserve nested English fallback without mixing missing content', () => {
  const pack = resolveLocale({
    locale: 'es',
    messages: { home: 'Inicio', tones: { yellow: 'Cálido' } },
  });
  expect(pack.messages.home).toBe('Inicio');
  expect(pack.messages.tones.yellow).toBe('Cálido');
  expect(pack.messages.tones.firm).toBe('Firm · bounded');
  expect(pack.content).toBe(content);
});
test('all content IDs, references, counts and safety distinctions validate', () => {
  expect(contentSchema.safeParse(content).success).toBe(true);
  expect(content.scenarios).toHaveLength(20);
  for (const scenario of content.scenarios)
    expect(Object.values(scenario.responses)).toHaveLength(3);
  for (const behavior of content.behaviors) {
    expect(behavior.alternativeExplanations.length).toBeGreaterThan(0);
    expect(behavior.doNotInfer.length).toBeGreaterThan(0);
  }
});
test('rejects missing tone, unknown reference, duplicated ID and predictive cards', () => {
  for (const mutate of [
    (data: typeof content) => {
      data.scenarios[0]!.responses.firm = '';
    },
    (data: typeof content) => {
      data.scenarios[0]!.techniqueIds.push('unknown');
    },
    (data: typeof content) => {
      data.scenarios.push(data.scenarios[0]!);
    },
    (data: typeof content) => {
      Object.assign(data.tarot[0]!, { notPrediction: false });
    },
  ]) {
    const fixture = structuredClone(content);
    mutate(fixture);
    expect(contentSchema.safeParse(fixture).success).toBe(false);
  }
});
test('rough notes never silently become confirmed facts', () => {
  const task = {
    ...emptyTask(),
    notes: 'The homepage must be changed. We all agreed Alex would deliver Friday.',
  };
  const brief = buildBrief(task);
  expect(brief).toContain('Owner: Not specified');
  expect(brief).toContain('Deadline: Not specified');
  expect(brief).toContain('Definition of done: Not specified');
  expect(brief).toContain('user notes, unverified');
  expect(clarification(task).match(/\?/g)).toHaveLength(3);
});
test('explicit requirements remain distinct and malicious HTML is ordinary text', () => {
  const task = {
    ...emptyTask(),
    previousRequirement: 'Old',
    currentRequirement: 'New',
    notes: '<script>alert(1)</script>',
    owner: 'Entered owner',
  };
  expect(buildBrief(task)).toContain('Previous requirement: Old');
  expect(buildBrief(task)).toContain('Current requirement: New');
  expect(buildBrief(task)).toContain('<script>alert(1)</script>');
});
test('copy review flags likely secrets while making no comprehensive detection claim', () => {
  expect(copyRisks('token: sample-only')).toBe(true);
  expect(copyRisks('fake@example.test')).toBe(true);
  expect(copyRisks('https://internal.example.test')).toBe(true);
  expect(copyRisks('What is the deliverable?')).toBe(false);
});
test('local session utilities do not invent marks or drift the timer', () => {
  expect(hasLine([0, 1, 2])).toBe(true);
  expect(hasLine([0, 3])).toBe(false);
  const squares = shuffled(content.bingoSquares, () => 0.5).slice(0, 9);
  expect(new Set(squares).size).toBe(9);
  expect(remainingSeconds(5000, 1101)).toBe(4);
  expect(remainingSeconds(1000, 2000)).toBe(0);
});
