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
  const seed = JSON.parse(readFileSync('src/content/content-seed.json', 'utf8'));
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
  await page.getByRole('button', { name: 'Asshole boss fight', exact: true }).click();
  await expect(page.locator('.pain-home h1')).toBeVisible();
}
async function goHome(page: Page) {
  // No bottom navigation: the logo is Home.
  await page.locator('.topbar').getByRole('button', { name: 'Home', exact: true }).click();
}
async function openSituations(page: Page) {
  await goHome(page);
  // The label follows settings: "Boss fight", "Asshole boss fight" or "Fight <name>".
  await page.getByRole('button', { name: /^(Asshole boss fight|Boss fight|Fight .+)$/ }).click();
}
async function fight(page: Page, threat?: string) {
  // Boss fight: Home → the threat grid → the reply screen, optionally switching the threat.
  await openSituations(page);
  await page.locator('.pain-tile').first().click();
  if (threat) await pick(page, 'Threat', threat);
}
async function openDeck(page: Page) {
  await goHome(page);
  await page.getByRole('button', { name: 'Browse the corporate tarot deck', exact: true }).click();
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
  await expect(page.getByText(/A personal device can still have a managed/)).toBeHidden();
  await page.getByRole('button', { name: 'Private has limits.', exact: true }).click();
  await expect(page.getByText(/A personal device can still have a managed/)).toBeVisible();
  await start(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator('.pain-tile:not(.add-tile)')).toHaveCount(20);
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
  await fight(page, 'Vague criticism');
  await responseIs(page, 'vague_accusation', 'grey');
  await expect(page.locator('textarea:visible')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Grey Rock', exact: true })).toBeChecked();
  await page.screenshot({ path: 'test-results/reply-quick.png', fullPage: true });
  await pick(page, 'Threat', 'Job threats');
  await expect(page.locator('.protective-card .charm-text')).not.toBeEmpty();
  const pinned = await page.locator('.protective-card .charm-text').textContent();
  await responseIs(page, 'dismissal_warning', 'grey');
  await page.getByRole('radio', { name: 'Firm Rock', exact: true }).check();
  await expect(page.locator('.suggested-response')).toContainText('formal performance feedback');
  expect(Date.now() - started).toBeLessThan(10000);
  await expect(page.locator('.protective-card .charm-text')).toHaveText(pinned!);
  await page.getByRole('radio', { name: 'Grey Rock', exact: true }).check();
  await responseIs(page, 'dismissal_warning', 'grey');
  await page.getByRole('radio', { name: 'Yellow Rock', exact: true }).check();
  await responseIs(page, 'dismissal_warning', 'yellow');
  await expect(page.locator('textarea:visible')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replace', exact: true })).toHaveCount(0);
  await pick(page, 'Threat', 'Gossip');
  await expect(page.locator('.suggested-response')).not.toContainText(/narcissist|psychopath/);
  // Say comes first, with its own line, then the written reply.
  await expect(page.locator('.spoken-response')).not.toBeEmpty();
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
  await expect(page.getByText('Clipboard unavailable')).toBeVisible();
});

test('keyboard style switching, all situations and exact edited-text copy without confirmations', async ({
  extension: { page },
}) => {
  await start(page);
  await fight(page, 'Vague criticism');
  await page.getByRole('radio', { name: 'Yellow Rock', exact: true }).focus();
  await page.keyboard.down('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Grey Rock', exact: true })).toBeChecked();
  await page.keyboard.up('ArrowRight');
  await responseIs(page, 'vague_accusation', 'grey');
  // Every threat is one tap away in the dropdown.
  await page.getByRole('combobox', { name: 'Threat', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(20);
  await page.getByRole('option').nth(12).click();
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
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replace', exact: true })).toHaveCount(0);
});
test('response remains immediately usable in a narrow side panel', async ({
  extension: { page },
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await start(page);
  await fight(page);
  const copy = page.getByRole('button', { name: 'Copy sentence' });
  const bounds = await copy.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(700);
  await expect(page.getByRole('radio', { name: 'Grey Rock', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/reply-320.png', fullPage: true });
});
test('accessibility, light theme, behavior library and keyboard blank', async ({
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
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click();
  await pick(page, 'Theme', 'Light');
  await audit();
  await openSituations(page);
  await audit();
  await page.screenshot({ path: 'test-results/home-light.png', fullPage: true });
  await fight(page);
  await audit();
  await fight(page, 'Chaos');
  await page.getByRole('button', { name: /^Bestiary/ }).click();
  await expect(
    page.getByRole('heading', { name: 'What to verify for your own record' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keep your record credible' })).toBeVisible();
  await audit();
  // Escape closes the sheet first; the next Escape is the panic switch.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Desk', exact: true })).toBeVisible();
  await audit();
});
test('note-taking entry points and fields are absent throughout the app', async ({
  extension: { page },
}) => {
  await start(page);
  await goHome(page);
  await expect(
    page.getByRole('button', { name: /Write this down|Clarify the task|Grimoire/ }),
  ).toHaveCount(0);
  await fight(page);
  await expect(page.locator('textarea')).toHaveCount(0);
  await expect(page.getByLabel('Concrete facts', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Write something down', { exact: true })).toHaveCount(0);
  await openSituations(page);
  await page
    .getByRole('button', { name: 'Changing requirements or priorities', exact: true })
    .click();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  // Each boss fight logs an event; any of them must open without note fields.
  await page.locator('.event-summary').first().click();
  await expect(page.locator('.calendar-detail textarea')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit event', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/evidence/calendar-without-notes.png' });
  await expect(page.getByRole('button', { name: /Write this down|Grimoire/ })).toHaveCount(0);
});

test('calendar event ciphertext survives restart and renders after unlock', async ({
  extension: { page },
}) => {
  await start(page);
  await createVault(page);
  await openSituations(page);
  await page
    .getByRole('button', { name: 'Changing requirements or priorities', exact: true })
    .click();
  // The chosen threat and its mantra are logged; only ciphertext may reach disk.
  const sentinel = (await page.locator('.protective-card .charm-text').textContent())!;
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail')).toContainText(sentinel);
  await expect(page.locator('.calendar-detail')).toContainText('Saved encrypted locally');
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
  expect(JSON.stringify(persisted)).not.toContain(sentinel);
  await page.getByRole('button', { name: 'Hide & lock', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Desk', exact: true })).toBeVisible();
  expect(await page.content()).not.toContain(sentinel);
  await page.reload();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail')).toContainText(sentinel);
});

test('a private note per threat is encrypted at rest and returns after unlock', async ({
  extension: { page },
}) => {
  await start(page);
  await fight(page);
  await page.getByRole('button', { name: 'Add a note', exact: true }).click();
  const sentinel = 'FICTIONAL_PRIVATE_NOTE_SENTINEL said in the standup';
  await page.getByRole('textbox', { name: 'Your note on this threat' }).fill(sentinel);
  await expect(page.getByText('Kept for this session only.')).toBeVisible();
  // Turn on encrypted history right here, without leaving the note.
  await page.getByRole('button', { name: 'Keep it encrypted', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await dialog.getByLabel('Repeat passphrase').fill('fictional browser test passphrase');
  await dialog.getByLabel('I understand there is no recovery').check();
  await dialog.getByRole('button', { name: 'Create encrypted vault', exact: true }).click();
  await dialog
    .getByLabel('Allow automatic encrypted calendar entries for my own selections')
    .check();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Saved encrypted on this device.')).toBeVisible();
  await page.waitForTimeout(900);
  const disk = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('bossdetox-vault', 1);
        request.onsuccess = () => {
          const read = request.result.transaction('vault').objectStore('vault').get('current');
          read.onsuccess = () => resolve(JSON.stringify(read.result));
          read.onerror = reject;
        };
        request.onerror = reject;
      }),
  );
  expect(disk.length).toBeGreaterThan(100);
  expect(disk).not.toContain('FICTIONAL_PRIVATE_NOTE_SENTINEL');
  await page.reload();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await fight(page);
  await expect(page.locator('.note-text')).toHaveText(sentinel);
});

test('an own threat with a WordArt word, say and write is encrypted at rest and returns', async ({
  extension: { page },
}) => {
  await start(page);
  await createVault(page);
  await openSituations(page);
  await page.getByRole('button', { name: 'Add your own', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'The word' }).fill('SENTINELWORD');
  await dialog
    .getByRole('textbox', { name: 'Description (optional)' })
    .fill('FICTIONAL_OWN_DESCRIPTION');
  await dialog.getByRole('radio', { name: 'Neon', exact: true }).click();
  await expect(dialog.locator('.wa-option[aria-checked="true"] .wa-neon')).toHaveText(
    'SENTINELWORD',
  );
  await dialog.getByRole('textbox', { name: 'What you say' }).fill('FICTIONAL_OWN_SAY line');
  await dialog.getByRole('textbox', { name: 'What you write' }).fill('FICTIONAL_OWN_WRITE line');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  // Saving opens the fight screen for the new threat with only the user's own lines.
  await expect(page.locator('.protective-card .wa-neon')).toHaveText('SENTINELWORD');
  await expect(page.locator('.spoken-response')).toHaveText('FICTIONAL_OWN_SAY line');
  await expect(page.locator('.suggested-response')).toHaveText('FICTIONAL_OWN_WRITE line');
  await expect(page.getByRole('radiogroup', { name: 'Response style' })).toHaveCount(0);
  await page.waitForTimeout(900);
  const disk = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('bossdetox-vault', 1);
        request.onsuccess = () => {
          const read = request.result.transaction('vault').objectStore('vault').get('current');
          read.onsuccess = () => resolve(JSON.stringify(read.result));
          read.onerror = reject;
        };
        request.onerror = reject;
      }),
  );
  expect(disk.length).toBeGreaterThan(100);
  for (const secret of ['SENTINELWORD', 'FICTIONAL_OWN_DESCRIPTION', 'FICTIONAL_OWN_SAY'])
    expect(disk).not.toContain(secret);
  await page.reload();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional browser test passphrase');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await openSituations(page);
  const tile = page.getByRole('button', { name: 'SENTINELWORD. FICTIONAL_OWN_DESCRIPTION' });
  await expect(tile.locator('.tile-marks')).toContainText('Logged 1×');
  await tile.click();
  await page.getByRole('button', { name: 'Edit this threat', exact: true }).click();
  await page.getByRole('button', { name: 'Delete this threat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add your own', exact: true })).toBeVisible();
  await expect(tile).toHaveCount(0);
});

test('auto-lock clears response edits and locks encrypted history', async ({
  extension: { page },
}) => {
  await start(page);
  await page.clock.install();
  await createVault(page);
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click();
  await pick(page, 'Lock after inactivity', '1 minute');
  await fight(page);
  const mantra = (await page.locator('.protective-card .charm-text').textContent())!;
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('heading', { name: 'Desk', exact: true })).toBeVisible();
  expect(await page.content()).not.toContain(mantra);
  await page.getByRole('button', { name: 'Return to tools', exact: true }).click();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vault locked', exact: true })).toBeVisible();
});

test('playful tools, all 78 tarot cards and the external support link', async ({
  extension: { page },
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await start(page);
  await openDeck(page);
  test.setTimeout(120000);
  const titles = new Set<string>();
  for (let i = 0; i < 78; i++) {
    await page.getByRole('button', { name: 'Draw one card' }).click();
    titles.add((await page.getByRole('dialog').locator('.tarot-card h2').textContent())!);
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
    await page.getByRole('button', { name: 'Close card' }).click();
  }
  expect(titles.size).toBe(78);
  await fight(page);
  await page.getByRole('button', { name: /^Bestiary/ }).click();
  // Serious support is the site's page, opened in a new tab (not followed here: no network).
  const support = page.getByRole('link', { name: /^Past friction\? Get serious support/ });
  await expect(support).toHaveAttribute('href', 'https://bossdetox.ing/support/');
  await expect(support).toHaveAttribute('target', '_blank');
  await expect(support).toHaveAttribute('rel', 'noopener noreferrer');
});
test('tools work offline and in narrow layouts', async ({ extension: { page, context } }) => {
  await start(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await context.setOffline(true);
  await fight(page);
  await expect(page.locator('.protective-card .charm-text')).toBeVisible();
  await goHome(page);
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
  await page.locator('.topbar').getByRole('button', { name: 'Settings' }).click();
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
  await page.locator('.topbar').getByRole('button', { name: 'Settings' }).click();
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

test('mantra rotates on screen, holds still with reduced motion, and the calendar keeps the drawn line', async ({
  extension: { page },
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  // Reduced motion stops the rotation, so style and favorite changes can be checked in place.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
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
  // With motion allowed the line moves on by itself once its reading bar fills.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(0, 0);
  await expect(charm).not.toHaveText(initial!, { timeout: 12_000 });
  const rotated = await charm.textContent();
  await page.getByRole('button', { name: 'Another', exact: true }).click();
  await expect(charm).not.toHaveText(rotated!);
  await expect(response).toContainText('formal performance feedback');
  const report = await new AxeBuilder({ page })
    .setLegacyMode(true)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(report.violations).toEqual([]);
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await expect(page.locator('.event-summary')).toHaveCount(1);
  await page.locator('.event-summary').click();
  // Rotation is display-only: the logged event keeps the line it was drawn with.
  await expect(page.locator('.calendar-detail .charm-text')).toHaveText(initial!);
  await expect(page.locator('.calendar-detail')).not.toContainText('Session only');
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
  ).not.toContain(initial!);
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
    await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click();
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
    await page.screenshot({ path: `test-results/evidence/color-home-${theme}.png` });
    await page
      .getByRole('button', { name: 'Job security or employment consequences raised', exact: true })
      .click();
    await audit();
    await page.screenshot({ path: `test-results/evidence/color-protection-${theme}.png` });
    await page.getByRole('radio', { name: 'Firm Rock', exact: true }).check();
    await expect(page.locator('.suggested-response')).toContainText('formal performance feedback');
    await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
    await audit();
    await page.screenshot({ path: `test-results/evidence/color-calendar-${theme}.png` });
    await openDeck(page);
    await page.locator('.deck-grid button').first().click();
    // Audit the card once its fade-in has finished, not mid-animation.
    await page
      .getByRole('dialog')
      .evaluate((node) =>
        Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)),
      );
    await expect
      .poll(() =>
        page
          .locator('.tarot-art')
          .evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
      )
      .toBe(true);
    await audit();
    await page.screenshot({ path: `test-results/evidence/color-tarot-${theme}.png` });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click();
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

test('full deck browser opens cards in a dialog with previous, next and close', async ({
  extension: { page },
}) => {
  await start(page);
  await openDeck(page);
  await expect(page.getByRole('button', { name: /Return to focus/ })).toHaveCount(0);
  await expect(page.locator('.deck-grid button')).toHaveCount(78);
  // Grid cells keep full card height inside the flex content pane.
  expect((await page.locator('.deck-grid button').first().boundingBox())!.height).toBeGreaterThan(
    120,
  );
  await page.locator('.deck-grid button').filter({ hasText: 'King of Swords' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.tarot-card h2')).toHaveText('The Serpent of Blame');
  await expect(dialog.locator('.arcana-name')).toHaveText('King of Swords');
  await dialog.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(dialog.locator('.tarot-card h2')).not.toHaveText('The Serpent of Blame');
  await dialog.getByRole('button', { name: 'Previous card', exact: true }).click();
  await expect(dialog.locator('.tarot-card h2')).toHaveText('The Serpent of Blame');
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.tarot-card h2')).not.toHaveText('The Serpent of Blame');
  // Escape closes the card without hiding and locking the app.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.deck-grid')).toBeVisible();
});

test('opening card persists for the day and browsing never replaces it', async ({
  extension: { page },
}) => {
  await page.getByRole('button', { name: 'Open my tools', exact: true }).click();
  const card = page.locator('.daily-card');
  await expect(card).toBeVisible();
  const id = await card.getAttribute('data-card-id');
  const day = await card.getAttribute('data-day');
  await page.screenshot({ path: 'test-results/evidence/mobile-daily.png' });
  const answers = await page.evaluate(
    async (day) =>
      Promise.all([
        chrome.runtime.sendMessage({ type: 'daily-card', day }),
        chrome.runtime.sendMessage({ type: 'daily-card', day }),
      ]),
    day,
  );
  expect(answers.every((answer) => answer.card.cardId === id)).toBe(true);
  await page.getByRole('button', { name: 'Browse the corporate tarot deck', exact: true }).click();
  await page.getByRole('button', { name: 'Draw one card', exact: true }).click();
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await goHome(page);
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
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click();
  const header = await page.locator('.topbar').boundingBox();
  await page.locator('#main').evaluate((node) => node.scrollTo(0, node.scrollHeight));
  expect(await page.locator('#main').evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  expect((await page.locator('.topbar').boundingBox())!.y).toBe(header!.y);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({ path: 'test-results/evidence/mobile-fixed-chrome.png' });
});
test('boss pronouns, language choices and changing logos stay stable while reading', async ({
  extension: { page },
}) => {
  await start(page);
  let previous = await page.locator('.wordmark img').getAttribute('src');
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click();
  expect(await page.locator('.wordmark img').getAttribute('src')).not.toBe(previous);
  await expect(
    page.getByLabel('Strong language in private headings', { exact: true }),
  ).toBeChecked();
  // Strong language off keeps the headings free of profanity for this check.
  await page.getByLabel('Strong language in private headings', { exact: true }).uncheck();
  for (const pronoun of ['he', 'she', 'they']) {
    await pick(
      page,
      'Boss pronouns',
      { he: 'He / him', she: 'She / her', they: 'They / them' }[pronoun]!,
    );
    // One navigation at a time: two in a row may land back on the same logo.
    await goHome(page);
    previous = await page.locator('.wordmark img').getAttribute('src');
    await page.getByRole('button', { name: /^(Asshole boss fight|Boss fight|Fight .+)$/ }).click();
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
    await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click();
  }
});
