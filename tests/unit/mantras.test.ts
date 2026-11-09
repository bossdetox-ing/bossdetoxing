import { expect, test } from 'vitest';
import seed from '../../src/content/content-seed.json';
import {
  eligibleMantras,
  mantraById,
  mantras,
  reflectionFor,
  reflections,
  rememberMantra,
  reviewMantras,
  selectMantra,
  type MantraContext,
} from '../../src/domain/mantras';
const context: MantraContext = {
  situationId: 'meeting_loop',
  phase: 'during',
  humor: true,
  serious: false,
};
test('original IDs are never deleted, and active lines pass editorial lint', () => {
  for (const m of seed.mantras) expect(mantras.some((item) => item.id === m.id)).toBe(true);
  expect(mantras.filter((m) => !m.id.match(/_a\d+$/))).toHaveLength(250);
  expect(
    reviewMantras(
      mantras,
      seed.scenarios.map((s) => s.id),
    ),
  ).toEqual([]);
});
test('retired lines resolve by ID but never rotate', () => {
  const retired = mantras.filter((m) => m.retired);
  expect(retired.length).toBeGreaterThan(0);
  for (const m of retired) expect(mantraById.get(m.id)).toBe(m);
  for (const phase of ['before', 'during', 'after'] as const)
    for (const scenario of seed.scenarios)
      for (const humor of [true, false])
        expect(
          eligibleMantras({ ...context, phase, humor, situationId: scenario.id }).some(
            (m) => m.retired,
          ),
        ).toBe(false);
});
test('every situation rotates at least 12 plain lines, every active line has its own read-more', () => {
  for (const scenario of seed.scenarios)
    expect(
      mantras.filter(
        (m) => !m.retired && m.variant === 'plain' && m.situationIds.includes(scenario.id),
      ).length,
    ).toBeGreaterThanOrEqual(12);
  // “Reflection can wait…” deliberately has no read-more.
  for (const m of mantras.filter((m) => !m.retired && m.id !== 'm_suspected_retaliation_a01')) {
    const reflection = reflectionFor(m.id);
    expect(reflection, m.id).toBeDefined();
    expect(reflection!.situationId).toBe(m.situationIds[0] ?? 'general');
    expect(reflection!.text.split(/\s+/).length).toBeLessThanOrEqual(120);
  }
  expect(reflections.every((r) => mantras.some((m) => m.reflectionId === r.id))).toBe(true);
});
test('without a phase, every active line of the situation rotates', () => {
  for (const scenario of seed.scenarios) {
    const eligible = eligibleMantras({ situationId: scenario.id, humor: false, serious: false });
    for (const m of mantras.filter(
      (m) => !m.retired && m.variant === 'plain' && m.situationIds.includes(scenario.id),
    ))
      expect(eligible).toContain(m);
  }
});
test('phase, behavior and serious-mode rules are strict eligibility boundaries', () => {
  for (const phase of ['before', 'during', 'after'] as const)
    for (const scenario of seed.scenarios) {
      const eligible = eligibleMantras({
        ...context,
        phase,
        situationId: scenario.id,
        serious: true,
      });
      expect(eligible.length).toBeGreaterThan(1);
      expect(
        eligible.every(
          (m) =>
            m.variant !== 'dark_humor' &&
            m.seriousSafe &&
            m.phases.includes(phase) &&
            (!m.situationIds.length || m.situationIds.includes(scenario.id)),
        ),
      ).toBe(true);
    }
  expect(eligibleMantras({ ...context, humor: false }).every((m) => m.variant === 'plain')).toBe(
    true,
  );
});
test('weighted choice never returns response scripts, current or fresh history entries', () => {
  let history: string[] = [];
  let current: string | undefined;
  const eligible = eligibleMantras(context);
  for (let i = 0; i < eligible.length; i++) {
    const chosen = selectMantra(context, history, [], current, () => 0.42);
    expect(history).not.toContain(chosen.id);
    expect(chosen.id).not.toBe(current);
    history = rememberMantra(history, chosen.id);
    current = chosen.id;
  }
  const next = selectMantra(context, history, [], current, () => 0);
  expect(next.id).toBe(history[0]);
});
test('favorites increase weight without overriding exclusions or safety', () => {
  const pool = eligibleMantras(context)
    .filter((m) => m.situationIds.length)
    .slice(0, 2);
  expect(selectMantra(context, [], [], undefined, () => 0.55, pool).id).toBe(pool[1]!.id);
  expect(selectMantra(context, [], [pool[0]!.id], undefined, () => 0.55, pool).id).toBe(
    pool[0]!.id,
  );
  expect(selectMantra(context, [pool[0]!.id], [pool[0]!.id], pool[0]!.id, () => 0, pool).id).toBe(
    pool[1]!.id,
  );
});

test('high-risk situations exclude general humor even when humor is enabled', () => {
  for (const situationId of [
    'dismissal_warning',
    'suspected_retaliation',
    'surveillance_concern',
  ]) {
    const eligible = eligibleMantras({ ...context, situationId, humor: true, serious: false });
    expect(eligible.length).toBeGreaterThan(1);
    expect(eligible.every((mantra) => mantra.variant === 'plain')).toBe(true);
  }
});
