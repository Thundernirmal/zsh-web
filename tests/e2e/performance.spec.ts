import { test, expect } from '@playwright/test';

test('mobile guide navigation stays stable while controllers load slowly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    let shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layout = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!layout.hadRecentInput) shift += layout.value;
      }
      document.documentElement.dataset.layoutShift = String(shift);
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.route('**/*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('/docs/');
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(Number(await page.locator('html').getAttribute('data-layout-shift') ?? 0)).toBeLessThan(0.1);
});

test('mobile constrained loading, search and expanded DOM stay within budgets', async ({ page }, testInfo) => {
  const cdp = await page.context().newCDPSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 100, downloadThroughput: 200_000, uploadThroughput: 100_000,
  });
  const start = Date.now();
  await page.goto('/commands/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: 'Read upkg reference', exact: true })).toBeAttached();
  const usefulContentMs = Date.now() - start;
  expect(usefulContentMs).toBeLessThan(10_000);
  const search = page.getByRole('searchbox');
  await expect.poll(async () => {
    await page.keyboard.press('ControlOrMeta+k');
    return search.evaluate((element) => element === document.activeElement);
  }, { timeout: 20_000 }).toBe(true);
  const searchStart = Date.now();
  await search.fill('upkg');
  await expect(page.locator('[data-command]')).toHaveCount(2);
  const searchMs = Date.now() - searchStart;
  expect(searchMs).toBeLessThan(1_500);
  await search.fill('');
  const expandedByCommand: Record<string, number> = {};
  for (const name of ['upkg', 'npkg', 'cgm']) {
    await page.locator(`[data-command="${name}"] [data-slot="accordion-trigger"]`).click();
    await expect(page.locator(`[data-command="${name}"] [data-slot="accordion-content"]`)).toBeVisible();
    expandedByCommand[name] = await page.locator('*').count();
  }
  const expandedElements = Math.max(...Object.values(expandedByCommand));
  expect(expandedElements).toBeLessThan(2_200);
  await testInfo.attach('performance.json', { body: JSON.stringify({ usefulContentMs, searchMs, expandedElements, expandedByCommand }), contentType: 'application/json' });
  await cdp.detach();
});
