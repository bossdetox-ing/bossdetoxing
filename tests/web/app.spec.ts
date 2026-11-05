import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const app = 'http://127.0.0.1:5191';
async function enter(page: import('@playwright/test').Page) {
  await page.goto(app);
  await page.getByRole('button', { name: 'Open my tools', exact: true }).click();
  await expect(page.locator('.daily-card')).toBeVisible();
}
test('PWA is responsive across phones, landscape, tablet and desktop with fixed chrome', async ({
  page,
}) => {
  await enter(page);
  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [740, 360],
    [768, 1024],
    [1024, 768],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const route of ['Home', 'Settings']) {
      await page.locator('.topbar').getByRole('button', { name: route, exact: true }).click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} ${width}`,
      ).toBe(true);
      const header = await page.locator('.topbar').boundingBox();
      await page.locator('#main').evaluate((node) => node.scrollTo(0, node.scrollHeight));
      expect((await page.locator('.topbar').boundingBox())!.y).toBe(header!.y);
      expect(await page.evaluate(() => scrollY)).toBe(0);
    }
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('.topbar').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.daily-card')).toBeVisible();
  await page.screenshot({ path: 'test-results/evidence/pwa-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/evidence/pwa-phone.png' });
});
test('offline PWA keeps daily card and settings and can browse all artwork without transmitting input', async ({
  page,
  context,
}) => {
  const external: string[] = [];
  const writes: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith(app)) external.push(request.url());
    if (request.method() !== 'GET') writes.push(request.url());
  });
  await enter(page);
  const id = await page.locator('.daily-card').getAttribute('data-card-id');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('combobox', { name: 'Theme', exact: true }).click();
  await page.getByRole('option', { name: 'Light', exact: true }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.daily-card')).toHaveAttribute('data-card-id', id!);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Browse the corporate tarot deck', exact: true }).click();
  await expect(page.locator('.deck-grid button')).toHaveCount(78);
  expect(
    await page.locator('.deck-grid img').evaluateAll(async (nodes) => {
      const loaded = await Promise.all(
        nodes.map(async (node) => {
          const image = new Image();
          image.src = (node as HTMLImageElement).src;
          await image.decode();
          return image.naturalWidth > 0;
        }),
      );
      return loaded.every(Boolean);
    }),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/evidence/pwa-stacked-deck.png' });
  await page.locator('.topbar').getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Asshole boss fight', exact: true }).click();
  await page.locator('.pain-tile').first().click();
  const initial = await page.locator('.suggested-response').textContent();
  await page.getByRole('radio', { name: 'Firm Rock', exact: true }).check();
  await expect(page.locator('.suggested-response')).not.toHaveText(initial!);
  expect(external).toEqual([]);
  expect(writes).toEqual([]);
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(report.violations).toEqual([]);
});
test('web calendar history encrypts locally, unlocks after reload and clears with deliberate wipe', async ({
  page,
}) => {
  await enter(page);
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional pwa passphrase only');
  await page.getByLabel('Repeat passphrase').fill('fictional pwa passphrase only');
  await page.getByLabel('I understand there is no recovery').check();
  await page.getByRole('button', { name: 'Create encrypted vault', exact: true }).click();
  await page.getByLabel('Allow automatic encrypted calendar entries for my own selections').check();
  await page.locator('.topbar').getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Asshole boss fight', exact: true }).click();
  await page
    .getByRole('button', { name: 'Changing requirements or priorities', exact: true })
    .click();
  const charm = await page.locator('.protective-card .charm-text').textContent();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.locator('.event-summary').first().click();
  await expect(page.locator('.calendar-detail')).toContainText('Saved encrypted locally');
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  expect(storage).not.toContain(charm!);
  expect(storage).not.toContain('moving_goalposts');
  const disk = await page.evaluate(
    () =>
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
  expect(disk).not.toContain(charm!);
  expect(disk).not.toContain('moving_goalposts');
  await page.reload();
  await page.getByRole('button', { name: 'Open private calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Enable encrypted history', exact: true }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('fictional pwa passphrase only');
  await page.getByRole('button', { name: 'Unlock vault', exact: true }).click();
  await page.locator('.event-summary').click();
  await expect(page.locator('.calendar-detail .charm-text')).toHaveText(charm!);
  await expect(page.locator('.calendar-detail textarea')).toHaveCount(0);
  await page.locator('.topbar').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Delete all local data', exact: true }).click();
  await page.getByLabel('I understand this deletes all local saved records').check();
  await page.getByRole('button', { name: 'Delete vault and preferences', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open my tools', exact: true })).toBeVisible();
});
