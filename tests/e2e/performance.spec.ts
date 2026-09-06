import { test, expect } from '@playwright/test';

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
