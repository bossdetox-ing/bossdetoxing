import { test as base, chromium, expect, type BrowserContext, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

// Radix/shadcn selects: open the combobox by its label, then choose the visible option.
async function pick(page: import('@playwright/test').Page, label: string | RegExp, option: string) {
  await page.getByRole('combobox', { name: label, exact: typeof label === 'string' }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

const test = base.extend<{
  extension: {
    context: BrowserContext;
    page: Page;
    id: string;
    requests: string[];
    errors: string[];
  };
}>({
  // Playwright requires destructuring even when this fixture has no dependencies.
  // eslint-disable-next-line no-empty-pattern
  extension: async ({}, use) => {
    const path = resolve('.output/chrome-mv3');
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    const context = await chromium.launchPersistentContext('', {
      ...(executablePath ? { executablePath } : { channel: 'chromium' }),
      headless: true,
      args: [`--disable-extensions-except=${path}`, `--load-extension=${path}`],
      viewport: { width: 380, height: 900 },
      colorScheme: 'dark',
    });
    let worker = context.serviceWorkers()[0];
    worker ??= await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    const requests: string[] = [];
    const errors: string[] = [];
    context.on('request', (request) => {
      if (/^https?:|^wss?:/.test(request.url())) requests.push(request.url());
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`chrome-extension://${id}/sidepanel.html`);
    await base.info().attach('browser-environment', {
      body: JSON.stringify({
        browser: context.browser()?.version(),
        platform: process.platform,
        arch: process.arch,
      }),
      contentType: 'application/json',
    });
    await use({ context, page, id, requests, errors });
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
    await context.close();
  },
});
async function responseIs(page: Page, id: string, tone: 'yellow' | 'grey' | 'firm') {
  const seed = JSON.parse(readFileSync('BOSSDETOX_ING_V1_HANDOFF/CONTENT_SEED.json', 'utf8'));
  const overrides = JSON.parse(readFileSync('src/content/en-overrides.json', 'utf8'));
  const variants = JSON.parse(readFileSync('src/content/replies.en.json', 'utf8'));
  const scenario = (seed.scenarios as { id: string; responses: Record<string, string> }[]).find(
    (s) => s.id === id,
  )!;
  const allowed = [overrides[id]?.[tone] ?? scenario.responses[tone], ...variants[id][tone]];
  await expect
    .poll(async () =>
      allowed.includes((await page.locator('.suggested-response').textContent()) ?? ''),
    )
    .toBe(true);
}
async function start(page: Page) {
  await page.getByRole('button', { name: 'Open my tools', exact: true }).click();
  await expect(page.locator('.daily-card')).toBeVisible();
  await page.getByRole('button', { name: 'Deal with my boss', exact: true }).click();
  await expect(page.locator('.pain-home h1')).toBeVisible();
}
async function openSituations(page: Page) {
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  const action = page.getByRole('button', { name: 'Deal with my boss', exact: true });
  if (await action.isVisible()) await action.click();
}
async function home(page: Page, action: string) {
  await page.getByRole('navigation').getByRole('button', { name: 'Tools', exact: true }).click();
  await page
    .locator('.action-list')
    .getByRole('button', { name: new RegExp(action) })
    .click();
}
async function createVault(page: Page) {
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByLabel('Repeat passphrase').fill('fictional browser test passphrase');
  await page.getByLabel('I understand there is no recovery').check();
  await page.getByRole('button', { name: 'Create encrypted vault', exact: true }).click();
  await page.getByLabel('Allow automatic encrypted calendar entries for my own selections').check();
}

test('fresh MV3 install, disclosures, default voices, exact clipboard and no page privileges', async ({
  extension: { page, context },
}) => {
  await expect(page.getByText(/A personal device can still have a managed/)).toBeVisible();
  await start(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator('.pain-tile')).toHaveCount(20);
  const tile = await page.locator('.pain-tile').nth(5).boundingBox();
  expect(tile!.y + tile!.height).toBeLessThan(700);
  await page.screenshot({ path: 'test-results/visual-regression-home.png', fullPage: true });
  await page
    .getByRole('button', { name: 'Job security or employment consequences raised', exact: true })
    .click();
  await expect(page.getByRole('region', { name: 'Private charm' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Professional response' })).toBeVisible();
  // Capture only clipboard writes, never read the operating-system clipboard.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copiedText: string }).copiedText = value;
        },
      },
    });
  });
  await page.getByRole('button', { name: 'Copy sentence' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveText('Copied');
  expect(await page.evaluate(() => (window as unknown as { copiedText: string }).copiedText)).toBe(
    await page.locator('.suggested-response').textContent(),
  );
  const behavior = await context
    .serviceWorkers()[0]!
    .evaluate(() => chrome.sidePanel.getPanelBehavior());
  expect(behavior.openPanelOnActionClick).toBe(true);
  const manifest = JSON.parse(readFileSync('.output/chrome-mv3/manifest.json', 'utf8'));
  expect(manifest.permissions.sort()).toEqual(['sidePanel', 'storage'].sort());
  expect(manifest.host_permissions).toEqual([]);
  expect(manifest.content_scripts).toBeUndefined();
  expect(manifest.action.default_popup).toBeUndefined();
  await page.screenshot({ path: 'test-results/home-dark.png', fullPage: true });
});
test('instant response styles, visible mantra and methods, optional edit and clipboard fallback', async ({
  extension: { page },
}) => {
  await start(page);
  const started = Date.now();
  await home(page, 'Help me answer');
  await expect(page.locator('.suggested-response')).toContainText(
    /deliverable|needs changing|needs work/i,
  );
  await expect(page.locator('textarea:visible')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Yellow Rock', exact: true })).toBeChecked();
  await page.screenshot({ path: 'test-results/reply-quick.png', fullPage: true });
  await page.getByRole('button', { name: 'Job warning', exact: true }).click();
  await expect(page.locator('.private-reminder .mantra')).not.toBeEmpty();
  const pinned = await page.locator('.private-reminder .mantra').textContent();
  await responseIs(page, 'dismissal_warning', 'yellow');
  await page.getByRole('radio', { name: 'Firm Rock', exact: true }).check();
  await expect(page.locator('.suggested-response')).toContainText('formal performance feedback');
  expect(Date.now() - started).toBeLessThan(10000);
  await expect(page.locator('.private-reminder .mantra')).toHaveText(pinned!);
  await page.getByRole('radio', { name: 'Grey Rock', exact: true }).check();
  await responseIs(page, 'dismissal_warning', 'grey');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Your professional sentence').fill('My edited response');
  await page.getByRole('radio', { name: 'Yellow Rock', exact: true }).check();
  await responseIs(page, 'dismissal_warning', 'yellow');
  await expect(page.locator('textarea:visible')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replace', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Colleague gossip', exact: true }).click();
  await expect(page.locator('.suggested-response')).not.toContainText(/narcissist|psychopath/);
  await page.getByText('More options', { exact: true }).click();
  await pick(page, 'Response format', 'Written follow-up');
  await expect(page.locator('.suggested-response')).toContainText('Decision: Not specified');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('fixture denied');
        },
      },
    });
  });
  await page.getByRole('button', { name: 'Copy sentence' }).click();
  await expect(page.getByRole('status')).toContainText('Clipboard unavailable');
});

test('keyboard style switching, all situations and exact edited-text copy without confirmations', async ({
  extension: { page },
}) => {
  await start(page);
  await home(page, 'Help me answer');
  await page.getByRole('radio', { name: 'Yellow Rock', exact: true }).focus();
  await page.keyboard.down('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Grey Rock', exact: true })).toBeChecked();
  await page.keyboard.up('ArrowRight');
  await responseIs(page, 'vague_accusation', 'grey');
  await expect(
    page.getByRole('group', { name: 'Observed situation', exact: true }).getByRole('button'),
  ).toHaveCount(21);
  await page
    .getByRole('group', { name: 'Observed situation', exact: true })
    .getByRole('button')
    .nth(12)
    .click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Your professional sentence').fill('Please confirm the priority.');
  await page.getByRole('button', { name: 'Use my edit', exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copiedText: string }).copiedText = value;
        },
      },
    });
  });
  await page.getByRole('button', { name: 'Copy sentence' }).click();
  expect(await page.evaluate(() => (window as unknown as { copiedText: string }).copiedText)).toBe(
    await page.locator('.suggested-response').textContent(),
  );
  await page.getByRole('radio', { name: 'Firm Rock', exact: true }).check();
  await expect(page.locator('.suggested-response')).not.toHaveText('Please confirm the priority.');
  await expect(page.getByRole('button', { name: 'Replace', exact: true })).toHaveCount(0);
});
test('response remains immediately usable in a narrow side panel', async ({
  extension: { page },
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await start(page);
  await home(page, 'Help me answer');
  const copy = page.getByRole('button', { name: 'Copy sentence' });
  const bounds = await copy.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(700);
  await expect(page.getByRole('radio', { name: 'Grey Rock', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/reply-320.png', fullPage: true });
});
test('calm and closure work without writing fields', async ({ extension: { page } }) => {
  await start(page);
  await home(page, 'Calm me');
  await expect(page.locator('.private-reminder .mantra')).toBeVisible();
  await expect(page.locator('input:visible, textarea:visible, select:visible')).toHaveCount(0);
  const first = await page.locator('.private-reminder .mantra').textContent();
  await page.getByRole('button', { name: 'Another reminder', exact: true }).click();
  await expect(page.locator('.private-reminder .mantra')).not.toHaveText(first!);
  await page.screenshot({ path: 'test-results/shield-quick.png', fullPage: true });
  await home(page, 'Help me let go');
  await expect(page.getByRole('button', { name: 'Finish and close' })).toBeVisible();
  await expect(page.locator('input:visible, textarea:visible')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/closure-quick.png', fullPage: true });
  await page.getByRole('button', { name: 'Finish and close' }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.daily-card')).toBeVisible();
});
test('accessibility, light theme, behavior library, keyboard blank and no humor preference', async ({
  extension: { page },
}) => {
  await start(page);
  async function audit() {
    const report = await new AxeBuilder({ page })
      .setLegacyMode(true)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(report.violations).toEqual([]);
  }
  await audit();
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await pick(page, 'Theme', 'Light');
  await page.getByLabel('Allow dry humor and symbolic rituals').uncheck();
  await audit();
  await openSituations(page);
  await audit();
  await page.screenshot({ path: 'test-results/home-light.png', fullPage: true });
  await home(page, 'Help me answer');
  await audit();
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Corporate Tarot/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^Bestiary/ }).click();
  await page.getByLabel('Search observable situations').fill('acceptance');
  await page.locator('.action-list button').first().click();
  await expect(
    page.getByRole('heading', { name: 'What to verify for your own record' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keep your record credible' })).toBeVisible();
  await audit();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Desk', exact: true })).toBeVisible();
  await audit();
});
test('note-taking entry points and fields are absent throughout the app', async ({
  extension: { page },
}) => {
  await start(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Tools', exact: true }).click();
  await expect(page.locator('.action-list button')).toHaveCount(3);
  await expect(
    page.getByRole('button', { name: /Write this down|Clarify the task|Grimoire/ }),
  ).toHaveCount(0);
  await home(page, 'Help me answer');
  await page.getByText('More options', { exact: true }).click();
  await expect(page.locator('textarea')).toHaveCount(0);
  await expect(page.getByLabel('Concrete facts', { exact: true })).toHaveCount(0);
  await home(page, 'Help me let go');
  await expect(page.locator('input,textarea')).toHaveCount(0);
  await expect(page.getByText('Write something down', { exact: true })).toHaveCount(0);
  await openSituations(page);
  await page
    .getByRole('button', { name: 'Changing requirements or priorities', exact: true })
    .click();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail textarea')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit event', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'docs/evidence/calendar-without-notes.png' });
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Boss Bingo/ }).click();
  await expect(page.getByRole('button', { name: /Write this down|Grimoire/ })).toHaveCount(0);
});

test('planned response ciphertext survives restart and renders literal text after unlock', async ({
  extension: { page },
}) => {
  await start(page);
  await createVault(page);
  await openSituations(page);
  await page
    .getByRole('button', { name: 'Changing requirements or priorities', exact: true })
    .click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const sentinel = '<img src=x onerror=alert(1)> FICTIONAL_PRIVATE_BROWSER_SENTINEL';
  await page.getByLabel('Your professional sentence').fill(sentinel);
  await page.getByRole('button', { name: 'Done / log plan', exact: true }).click();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail')).toContainText(sentinel);
  await expect(page.locator('.calendar-detail')).toContainText('Saved encrypted locally');
  await expect(page.locator('.calendar-detail img')).toHaveCount(0);
  const persisted = await page.evaluate(async () => {
    const storage = JSON.stringify(await chrome.storage.local.get(null));
    const disk = await new Promise<string>((resolve, reject) => {
      const request = indexedDB.open('bossdetox-vault', 1);
      request.onsuccess = () => {
        const db = request.result;
        const read = db.transaction('vault').objectStore('vault').get('current');
        read.onsuccess = () => {
          resolve(JSON.stringify(read.result));
          db.close();
        };
        read.onerror = reject;
      };
      request.onerror = reject;
    });
    return { storage, disk, local: JSON.stringify(localStorage) };
  });
  expect(JSON.stringify(persisted)).not.toContain('FICTIONAL_PRIVATE_BROWSER_SENTINEL');
  await page.getByRole('button', { name: 'Hide & lock', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Desk', exact: true })).toBeVisible();
  expect(await page.content()).not.toContain('FICTIONAL_PRIVATE_BROWSER_SENTINEL');
  await page.reload();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail')).toContainText(sentinel);
});

test('auto-lock clears response edits and locks encrypted history', async ({
  extension: { page },
}) => {
  await start(page);
  await page.clock.install();
  await createVault(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await pick(page, 'Lock after inactivity', '1 minute');
  await home(page, 'Help me answer');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Your professional sentence').fill('FICTIONAL_VOLATILE_RESPONSE');
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('heading', { name: 'Desk', exact: true })).toBeVisible();
  expect(await page.content()).not.toContain('FICTIONAL_VOLATILE_RESPONSE');
  await page.getByRole('button', { name: 'Return to tools', exact: true }).click();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vault locked', exact: true })).toBeVisible();
});

test('playful tools, all 78 tarot cards, manual bingo and serious concern gating', async ({
  extension: { page },
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await start(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Corporate Tarot/ }).click();
  test.setTimeout(120000);
  const titles = new Set<string>();
  for (let i = 0; i < 78; i++) {
    titles.add((await page.locator('.tarot-card h2').textContent())!);
    await expect
      .poll(() =>
        page
          .locator('.tarot-art')
          .evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
      )
      .toBe(true);
    if (i < 2)
      await page.screenshot({
        path: `test-results/visual-regression-tarot-${i + 1}.png`,
        fullPage: false,
      });
    await page.getByRole('button', { name: 'Draw one card' }).click();
  }
  expect(titles.size).toBe(78);
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Boss Bingo/ }).click();
  const squares = page.locator('.bingo-grid button');
  await expect(squares).toHaveCount(9);
  for (let i = 0; i < 3; i++) await squares.nth(i).click();
  await expect(page.getByRole('status')).toContainText('A line has formed');
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await expect(squares).toHaveCount(0);
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Bestiary/ }).click();
  await page.locator('.action-list button').first().click();
  await pick(page, 'Choose context, not a label for a person', 'Serious issue / get support');
  await expect(page.getByRole('heading', { name: 'Your safety comes first.' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Corporate Tarot/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Boss Bingo/ })).toHaveCount(0);
});
test('closure skips writing, offline and narrow layouts', async ({
  extension: { page, context },
}) => {
  await start(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await context.setOffline(true);
  await home(page, 'Help me let go');
  await page.getByRole('button', { name: 'Finish and close' }).click();
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  for (const width of [320, 160, 480]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `No horizontal overflow at ${width}px`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({ path: 'test-results/home-320.png', fullPage: true });
});
test('encrypted history export, intentional full wipe and authenticated restore', async ({
  extension: { page },
}) => {
  await start(page);
  await createVault(page);
  await openSituations(page);
  await page
    .getByRole('button', { name: 'Changing requirements or priorities', exact: true })
    .click();
  const snapshot = await page.locator('.protective-card .charm-text').textContent();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail')).toContainText('Saved encrypted locally');
  await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export encrypted backup' }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  const raw = readFileSync(backupPath!, 'utf8');
  expect(raw).not.toContain(snapshot!);
  await page.getByRole('button', { name: 'Delete all local data', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete vault and preferences' })).toBeDisabled();
  await page.getByLabel('I understand this deletes all local saved records').check();
  await page.getByRole('button', { name: 'Delete vault and preferences' }).click();
  await expect(page.getByRole('button', { name: 'Open my tools', exact: true })).toBeVisible();
  await start(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
  await page.getByText('Restore encrypted backup', { exact: true }).click();
  await page.getByLabel('Encrypted archive (.json, maximum 5 MB)').setInputFiles({
    name: 'fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(raw),
  });
  await page.getByLabel('Archive passphrase').fill('fictional browser test passphrase');
  await page.getByRole('button', { name: 'Authenticate & restore' }).click();
  await expect(page.getByRole('status')).toContainText('Backup authenticated and restored');
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail .charm-text')).toHaveText(snapshot!);
});

test('protective charm stays pinned across style, time and favorites; reroll updates one calendar event', async ({
  extension: { page },
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await start(page);
  await page.clock.install();
  const started = Date.now();
  await page
    .getByRole('button', { name: 'Job security or employment consequences raised', exact: true })
    .click();
  const charm = page.locator('.protective-card .charm-text');
  const initial = await charm.textContent();
  await expect(
    page.locator('input:not([type=radio]):visible,textarea:visible,select:visible'),
  ).toHaveCount(0);
  expect(Date.now() - started).toBeLessThan(10000);
  for (const style of ['Yellow Rock', 'Grey Rock', 'Firm Rock']) {
    await page.getByRole('radio', { name: style, exact: true }).check();
    await expect(charm).toHaveText(initial!);
    await page.screenshot({
      path: `test-results/visual-regression-card-${style.toLowerCase()}.png`,
      fullPage: false,
    });
  }
  const response = page.locator('.suggested-response');
  await expect(response).toContainText('formal performance feedback');
  const copy = await page.getByRole('button', { name: 'Copy sentence', exact: true }).boundingBox();
  expect(copy!.y + copy!.height).toBeLessThan(700);
  await page.getByRole('button', { name: 'Favorite mantra', exact: true }).click();
  await expect(charm).toHaveText(initial!);
  await page.clock.fastForward(20_000);
  await expect(charm).toHaveText(initial!);
  await page.getByRole('button', { name: 'Another', exact: true }).click();
  await expect(charm).not.toHaveText(initial!);
  const selected = await charm.textContent();
  await expect(response).toContainText('formal performance feedback');
  const report = await new AxeBuilder({ page })
    .setLegacyMode(true)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(report.violations).toEqual([]);
  await page.getByRole('button', { name: 'Done / log plan', exact: true }).click();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await expect(page.locator('.event-summary')).toHaveCount(1);
  await expect(page.locator('.event-summary')).toContainText('Response planned · not sent');
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail .charm-text')).toHaveText(selected!);
  await expect(page.locator('.calendar-detail')).toContainText('Session only · not saved');
  await page.screenshot({ path: 'test-results/visual-regression-calendar.png', fullPage: false });
  await page.screenshot({
    path: 'test-results/visual-regression-calendar-detail.png',
    fullPage: true,
  });
  const calendarReport = await new AxeBuilder({ page })
    .setLegacyMode(true)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(calendarReport.violations).toEqual([]);
  expect(
    await page.evaluate(async () => JSON.stringify(await chrome.storage.local.get(null))),
  ).not.toContain(selected!);
  await page.reload();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await expect(page.locator('.event-summary')).toHaveCount(0);
});

test('encrypted calendar consent, favorite and exact snapshot survive reload and event deletion', async ({
  extension: { page },
}) => {
  await start(page);
  await createVault(page);
  await openSituations(page);
  await page
    .getByRole('button', { name: 'Changing requirements or priorities', exact: true })
    .click();
  const selected = await page.locator('.protective-card .charm-text').textContent();
  await page.getByRole('button', { name: 'Favorite mantra', exact: true }).click();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByLabel('Allow automatic encrypted calendar entries for my own selections').check();
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail')).toContainText('Saved encrypted locally');
  await expect(page.locator('.calendar-detail .charm-text')).toHaveText(selected!);
  const disk = await page.evaluate(
    async () =>
      new Promise<string>((resolve, reject) => {
        const req = indexedDB.open('bossdetox-vault', 1);
        req.onsuccess = () => {
          const db = req.result;
          const read = db.transaction('vault').objectStore('vault').get('current');
          read.onsuccess = () => {
            resolve(JSON.stringify(read.result));
            db.close();
          };
          read.onerror = reject;
        };
        req.onerror = reject;
      }),
  );
  expect(disk).not.toContain(selected!);
  expect(disk).not.toContain('moving_goalposts');
  await page.reload();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();

  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await expect(page.locator('.event-summary')).toHaveCount(1);
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail .charm-text')).toHaveText(selected!);
  await page.getByRole('button', { name: 'Need clarity', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Need clarity', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Delete event', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(page.locator('.event-summary')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
});

test('WordArt tarot system renders and remains accessible in both themes', async ({
  extension: { page },
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 360, height: 800 });
  await start(page);
  const backgrounds: string[] = [];
  async function audit() {
    const result = await new AxeBuilder({ page })
      .setLegacyMode(true)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  for (const theme of ['dark', 'light']) {
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Settings', exact: true })
      .click();
    await pick(page, 'Theme', theme === 'dark' ? 'Dark' : 'Light');
    await openSituations(page);
    backgrounds.push(
      await page.locator('body').evaluate((node) => getComputedStyle(node).backgroundColor),
    );
    await expect(page.locator('.pain-wordart')).toHaveCount(20);
    await expect(page.getByText('Local only', { exact: true })).toHaveCount(0);
    await expect(page.getByText('No typing', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Return to focus', exact: true })).toHaveCount(0);
    await expect
      .poll(() =>
        page
          .locator('.pain-tile img')
          .evaluateAll((nodes) =>
            nodes.every(
              (node) =>
                (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    const last = await page.locator('.pain-tile').nth(5).boundingBox();
    expect(last!.y + last!.height).toBeLessThan(700);
    await audit();
    await page.screenshot({ path: `docs/evidence/color-home-${theme}.png` });
    await page
      .getByRole('button', { name: 'Job security or employment consequences raised', exact: true })
      .click();
    await audit();
    await page.screenshot({ path: `docs/evidence/color-protection-${theme}.png` });
    await page.getByRole('radio', { name: 'Firm Rock', exact: true }).check();
    await expect(page.locator('.suggested-response')).toContainText('formal performance feedback');
    await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
    await audit();
    await page.screenshot({ path: `docs/evidence/color-calendar-${theme}.png` });
    await page.getByRole('navigation').getByRole('button', { name: 'Tools', exact: true }).click();
    await audit();
    await page.screenshot({ path: `docs/evidence/color-tools-${theme}.png` });
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Explore', exact: true })
      .click();
    await page.getByRole('button', { name: /^Corporate Tarot/ }).click();
    await expect
      .poll(() =>
        page
          .locator('.tarot-art')
          .evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
      )
      .toBe(true);
    await audit();
    await page.screenshot({ path: `docs/evidence/color-tarot-${theme}.png` });
  }
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  await pick(page, 'Theme', 'System');
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  expect(
    await page.locator('body').evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe(backgrounds[1]);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(
    await page.locator('body').evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe(backgrounds[0]);
});

test('full deck browser and custom Bingo stay local and clear on end', async ({
  extension: { page },
}) => {
  await start(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.getByRole('button', { name: /Return to focus/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^Corporate Tarot/ }).click();
  await page.getByRole('button', { name: 'See the full deck', exact: true }).click();
  await expect(page.locator('.deck-library button')).toHaveCount(78);
  // The scrolling strip must keep full card height inside the flex content pane.
  expect((await page.locator('.deck-library').boundingBox())!.height).toBeGreaterThan(150);
  expect(
    (await page.locator('.deck-library button').first().boundingBox())!.height,
  ).toBeGreaterThan(150);
  await page.locator('.deck-library button').filter({ hasText: 'King of Swords' }).click();
  await expect(page.locator('.tarot-card h2')).toHaveText('King of Swords');
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Boss Bingo/ }).click();
  await expect(page.locator('.bingo-grid button')).toHaveCount(9);
  await page.getByRole('button', { name: 'Make my own board', exact: true }).click();
  const sentinel = '<b>FICTIONAL_CUSTOM_BINGO</b>';
  await page
    .getByLabel('My Bingo squares', { exact: true })
    .fill(sentinel + '\nMy fictional second square');
  await page.getByRole('button', { name: 'Use my squares', exact: true }).click();
  await expect(page.locator('.bingo-grid button').filter({ hasText: sentinel })).toHaveCount(1);
  await expect(page.locator('.bingo-grid b')).toHaveCount(0);
  await page.getByRole('button', { name: 'New random board', exact: true }).click();
  await expect(page.locator('.bingo-grid')).toContainText(sentinel);
  expect(
    await page.evaluate(async () => JSON.stringify(await chrome.storage.local.get(null))),
  ).not.toContain('FICTIONAL_CUSTOM_BINGO');
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  expect(await page.content()).not.toContain('FICTIONAL_CUSTOM_BINGO');
  await page.getByRole('button', { name: 'Start a new session', exact: true }).click();
  await expect(page.locator('.bingo-grid button')).toHaveCount(9);
  expect(await page.content()).not.toContain('FICTIONAL_CUSTOM_BINGO');
});

test('opening card persists for the day and browsing never replaces it', async ({
  extension: { page },
}) => {
  await page.getByRole('button', { name: 'Open my tools', exact: true }).click();
  const card = page.locator('.daily-card');
  await expect(card).toBeVisible();
  const id = await card.getAttribute('data-card-id');
  const day = await card.getAttribute('data-day');
  await page.screenshot({ path: 'docs/evidence/mobile-daily.png' });
  const answers = await page.evaluate(
    async (day) =>
      Promise.all([
        chrome.runtime.sendMessage({ type: 'daily-card', day }),
        chrome.runtime.sendMessage({ type: 'daily-card', day }),
      ]),
    day,
  );
  expect(answers.every((answer) => answer.card.cardId === id)).toBe(true);
  await page.getByRole('button', { name: 'Browse all 78 cards', exact: true }).click();
  await page.getByRole('button', { name: 'Draw one card', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.daily-card')).toHaveAttribute('data-card-id', id!);
  await page.reload();
  await expect(page.locator('.daily-card')).toHaveAttribute('data-card-id', id!);
  const daily = await page.evaluate(
    async () => (await chrome.storage.local.get('dailyCard')).dailyCard,
  );
  expect(daily).toEqual({ day, cardId: id });
});
test('header and navigation stay anchored while only the middle scrolls', async ({
  extension: { page },
}) => {
  await page.setViewportSize({ width: 360, height: 600 });
  await start(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  const header = await page.locator('.topbar').boundingBox();
  const nav = await page.getByRole('navigation').boundingBox();
  await page.locator('#main').evaluate((node) => node.scrollTo(0, node.scrollHeight));
  expect(await page.locator('#main').evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect((await page.locator('.topbar').boundingBox())!.y).toBe(header!.y);
  expect((await page.getByRole('navigation').boundingBox())!.y).toBe(nav!.y);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({ path: 'docs/evidence/mobile-fixed-chrome.png' });
});
test('boss pronouns, language choices and changing logos stay stable while reading', async ({
  extension: { page },
}) => {
  await start(page);
  let previous = await page.locator('.wordmark img').getAttribute('src');
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click();
  expect(await page.locator('.wordmark img').getAttribute('src')).not.toBe(previous);
  await expect(
    page.getByLabel('Strong language in private headings', { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel('Allow dry humor and symbolic rituals', { exact: true }),
  ).toBeChecked();
  await page.getByLabel('Allow dry humor and symbolic rituals', { exact: true }).uncheck();
  for (const pronoun of ['he', 'she', 'they']) {
    await pick(
      page,
      'Boss pronouns',
      { he: 'He / him', she: 'She / her', they: 'They / them' }[pronoun]!,
    );
    previous = await page.locator('.wordmark img').getAttribute('src');
    await openSituations(page);
    expect(await page.locator('.wordmark img').getAttribute('src')).not.toBe(previous);
    const title = page.locator('.pain-home h1');
    const text = await title.textContent();
    expect(text).toMatch(
      pronoun === 'he'
        ? /\bhe\b|\bhim\b|\bhis\b/
        : pronoun === 'she'
          ? /\bshe\b|\bher\b/
          : /\bthey\b|\bthem\b|\btheir\b/,
    );
    expect(text).not.toMatch(/fuck|asshole|bullshit/i);
    await expect(title).toHaveText(text!);
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Settings', exact: true })
      .click();
  }
});
