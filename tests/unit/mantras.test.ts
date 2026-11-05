import { expect, test } from 'vitest';
import seed from '../../src/content/content-seed.json';
import {
  eligibleMantras,
  mantras,
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
test('250 original internal phrases retain IDs and pass editorial lint', () => {
  expect(mantras).toHaveLength(250);
  for (const m of seed.mantras) expect(mantras.some((item) => item.id === m.id)).toBe(true);
  for (const mantra of mantras) {
    expect(mantra.text).toMatch(/^(I |I'|My )/);
    expect(mantra.text).not.toMatch(/\b(?:will|should|you|your|you’re)\b/i);
  }
  expect(
    reviewMantras(
      mantras,
      seed.scenarios.map((s) => s.id),
    ),
  ).toEqual([]);
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
