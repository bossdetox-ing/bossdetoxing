import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
test('background registers side panel without page access', () => {
  const worker = readFileSync('entrypoints/background.ts', 'utf8');
  expect(worker).toContain('openPanelOnActionClick: true');
  expect(worker).toContain("setPopup({ popup: 'sidepanel.html?surface=popup' })");
  expect(worker).not.toMatch(/tabs\.|scripting\.|fetch\(/);
});
