import { test as base, chromium, expect, type BrowserContext, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

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
async function start(page: Page) {
  await page.getByRole('button', { name: 'Open my tools', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep your footing.' })).toBeVisible();
}
async function home(page: Page, action: string) {
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await page
    .locator('.action-list')
    .getByRole('button', { name: new RegExp(action) })
    .click();
}
async function createVault(page: Page) {
  await home(page, 'Write this down');
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByLabel('Repeat passphrase').fill('fictional browser test passphrase');
  await page.getByLabel('I understand there is no recovery').check();
  await page.getByRole('button', { name: 'Create encrypted vault', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New factual entry' })).toBeVisible();
}

test('fresh MV3 install, disclosures, default voices, exact clipboard and no page privileges', async ({
  extension: { page, context },
}) => {
  await expect(page.getByText(/A personal device can still have a managed/)).toBeVisible();
  await start(page);
  await expect(page.getByText('Internal voice', { exact: true })).toBeVisible();
  await expect(page.getByText('External voice', { exact: true })).toBeVisible();
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
  await expect(page.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => (window as unknown as { copiedText: string }).copiedText)).toBe(
    'Could we clarify the specific deliverable and expected result?',
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
test('response tones, edit protection, factual follow-up and clipboard failure', async ({
  extension: { page },
}) => {
  await start(page);
  await home(page, 'Help me answer');
  await page.getByRole('button', { name: 'Deep', exact: true }).click();
  await page.getByLabel('Observed situation').selectOption('dismissal_warning');
  await expect(page.getByLabel('Your professional sentence')).toHaveValue(/concrete expectations/);
  await page.getByLabel('Response tone').selectOption('firm');
  await expect(page.getByLabel('Your professional sentence')).toHaveValue(
    /formal performance feedback/,
  );
  await page.getByLabel('Your professional sentence').fill('My edited response');
  await page.getByLabel('Response tone').selectOption('grey');
  await expect(page.getByLabel('Your professional sentence')).toHaveValue('My edited response');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel('Response tone').selectOption('yellow');
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await page.getByLabel('Observed situation').selectOption('colleague_gossip');
  await expect(page.getByLabel('Your professional sentence')).not.toHaveValue(
    /narcissist|psychopath/,
  );
  await page.getByLabel('Response format').selectOption('follow_up');
  await expect(page.getByLabel('Your professional sentence')).toHaveValue(
    /Decision: Not specified/,
  );
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
  await page.getByLabel('Theme', { exact: true }).selectOption('light');
  await page.getByLabel('Allow dry humor and symbolic rituals').uncheck();
  await audit();
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  await audit();
  await page.screenshot({ path: 'test-results/home-light.png', fullPage: true });
  await home(page, 'Help me answer');
  await audit();
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Corporate Tarot/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^Bestiary/ }).click();
  await page.getByLabel('Search observable situations').fill('acceptance');
  await page.locator('.action-list button').first().click();
  await expect(page.getByRole('heading', { name: 'Other explanations' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What this does not establish' })).toBeVisible();
  await audit();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
  await audit();
});
test('ambiguous work stays unverified, change comparison and explicit copy review', async ({
  extension: { page },
}) => {
  await start(page);
  await home(page, 'Clarify the task');
  await page.getByLabel('What were you asked to do?').fill('The homepage must be changed');
  await page.getByText('Add confirmed details', { exact: true }).click();
  await page.getByLabel('Previous requirement', { exact: true }).fill('Old heading');
  await page.getByLabel('Current requirement', { exact: true }).fill('New heading');
  await page.getByRole('button', { name: 'Create structured brief' }).click();
  await expect(page.locator('.brief-fields').getByText('Not specified')).toHaveCount(10);
  await expect(page.getByRole('heading', { name: 'Requirement change' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy clarification' })).toBeDisabled();
  await page
    .getByLabel('Edit the clarification before copying')
    .fill('Please contact fake@example.test to clarify.');
  await page.getByLabel('I have reviewed this message').check();
  await page.getByRole('button', { name: 'Copy clarification' }).click();
  await expect(page.getByRole('heading', { name: 'Review before copying' })).toBeVisible();
});
test('vault persists ciphertext, locks on blank and restart, and recovers exact literal text', async ({
  extension: { page },
}) => {
  await start(page);
  await createVault(page);
  await page.getByRole('button', { name: 'New factual entry' }).click();
  const sentinel = '<img src=x onerror=alert(1)> FICTIONAL_PRIVATE_BROWSER_SENTINEL';
  await page.getByLabel('What happened? (observable facts)').fill(sentinel);
  await page.getByRole('button', { name: 'Save encrypted note' }).click();
  await expect(page.getByText(sentinel, { exact: true })).toBeVisible();
  expect(await page.locator('.records img').count()).toBe(0);
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
    });
    return { storage, disk, local: JSON.stringify(localStorage) };
  });
  expect(JSON.stringify(persisted)).not.toContain('FICTIONAL_PRIVATE_BROWSER_SENTINEL');
  await page.getByRole('button', { name: 'Hide & lock' }).click();
  await expect(page.getByText('Notes', { exact: true })).toBeVisible();
  expect(await page.content()).not.toContain('FICTIONAL_PRIVATE_BROWSER_SENTINEL');
  await page.reload();
  await home(page, 'Write this down');
  await expect(page.getByRole('heading', { name: 'Vault locked', exact: true })).toBeVisible();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await expect(page.getByText(sentinel, { exact: true })).toBeVisible();
});
test('auto-lock clears drafts and safe blank removes task content from accessible DOM', async ({
  extension: { page },
}) => {
  await start(page);
  await page.clock.install();
  await createVault(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Lock after inactivity').selectOption('1');
  await home(page, 'Clarify the task');
  await page.getByLabel('What were you asked to do?').fill('FICTIONAL_VOLATILE_TASK');
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
  expect(await page.content()).not.toContain('FICTIONAL_VOLATILE_TASK');
  await page.getByRole('button', { name: 'Return to tools' }).click();
  await home(page, 'Write this down');
  await expect(page.getByRole('heading', { name: 'Vault locked', exact: true })).toBeVisible();
});
test('playful tools, all twelve tarot cards, manual bingo and serious concern gating', async ({
  extension: { page },
}) => {
  await start(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Corporate Tarot/ }).click();
  const titles = new Set<string>();
  for (let i = 0; i < 12; i++) {
    titles.add((await page.locator('.tarot-card h2').textContent())!);
    await page.getByRole('button', { name: 'Draw one card' }).click();
  }
  expect(titles.size).toBe(12);
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Boss Bingo/ }).click();
  const squares = page.locator('.bingo-grid button');
  await expect(squares).toHaveCount(9);
  for (let i = 0; i < 3; i++) await squares.nth(i).click();
  await expect(page.getByRole('status')).toContainText('A line has formed');
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await expect(squares).toHaveCount(0);
  await page.getByRole('button', { name: 'Serious concern or immediate danger' }).click();
  await expect(page.getByRole('heading', { name: 'Your safety comes first.' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Corporate Tarot/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Boss Bingo/ })).toHaveCount(0);
});
test('closure skips writing, timer pause/reset, offline and narrow layouts', async ({
  extension: { page, context },
}) => {
  await start(page);
  await page.clock.install();
  await context.setOffline(true);
  await home(page, 'Help me let go');
  await page.getByRole('button', { name: 'Skip writing' }).click();
  await expect(page.getByRole('heading', { name: 'Enough for now.' })).toBeVisible();
  await page.getByRole('button', { name: 'Return to focus' }).click();
  await page.getByRole('button', { name: '15 minutes', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.clock.fastForward(60_000);
  await expect(page.getByRole('timer')).toHaveText('14:00');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.fastForward(60_000);
  await expect(page.getByRole('timer')).toHaveText('14:00');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('15:00');
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click();
  for (const width of [320, 160, 480]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({ path: 'test-results/home-320.png', fullPage: true });
});
test('encrypted task save, export download, intentional full wipe and authenticated restore', async ({
  extension: { page },
}) => {
  await start(page);
  await createVault(page);
  await home(page, 'Clarify the task');
  await page.getByLabel('What were you asked to do?').fill('Fictional task saved only on request');
  await page.getByRole('button', { name: 'Create structured brief' }).click();
  await page.getByRole('button', { name: 'Save brief to unlocked vault' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved encrypted locally.');
  await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export encrypted backup' }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  const raw = readFileSync(backupPath!, 'utf8');
  expect(raw).not.toContain('Fictional task saved only');
  await page.getByRole('button', { name: 'Delete all local data', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete vault and preferences' })).toBeDisabled();
  await page.getByLabel('I understand this deletes all local saved notes').check();
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
  await home(page, 'Write this down');
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await expect(page.getByText(/Fictional task saved only on request/)).toBeVisible();
});
