import { expect, test } from '@playwright/test';
import { guideTopics } from '../../scripts/docs-guide.mjs';

test('guide sidebar keeps every keyboard-focused topic visible in a short viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 500 });
  await page.goto('/docs/maintenance/');
  await expect(page.locator('[data-docs-menu]')).toHaveAttribute('data-ready', 'true');
  const links = page.getByRole('navigation', { name: 'Guide navigation', exact: true }).getByRole('link');
  await expect(links).toHaveCount(guideTopics.length + 1);
  for (const fontSize of ['100%', '200%']) {
    await page.locator('html').evaluate((element, value) => { element.style.fontSize = value; }, fontSize);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    // Let the shared header's ResizeObserver publish its new sticky offset.
    await expect.poll(() => page.locator('[data-site-header]').evaluate((header) =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height')) === Math.round(header.getBoundingClientRect().height),
    )).toBe(true);
    await links.first().focus();
    for (let index = 0; index < await links.count(); index += 1) {
      const link = links.nth(index);
      await expect(link).toBeFocused();
      await expect.poll(() => link.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const header = document.querySelector('[data-site-header]')!.getBoundingClientRect();
        return box.top >= header.bottom && box.bottom <= innerHeight;
      }), { message: `Topic ${index} at ${fontSize} text size stays in view` }).toBe(true);
      if (index + 1 < await links.count()) await page.keyboard.press('Tab');
    }
    expect(await page.locator('.docs-sidebar').evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  }
});

test('Custom docs topic layouts reflow across desktop and mobile widths', async ({ page }) => {
  for (const width of [320, 390, 667, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const topic of guideTopics) {
      await page.goto(`/docs/${topic.slug}/`);
      const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, content: document.querySelector('.markdown-doc')?.getBoundingClientRect().width ?? 0 }));
      expect(layout.document, `${topic.slug} at ${width}px`).toBeLessThanOrEqual(layout.viewport);
      expect(layout.content).toBeGreaterThan(0);
      expect(layout.content).toBeLessThanOrEqual(800);
    }
  }
});
