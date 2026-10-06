import { expect, test } from '@playwright/test';
import { guideTopics } from '../../scripts/docs-guide.mjs';

test('Starlight topic layouts reflow across desktop and mobile widths', async ({ page }) => {
  for (const width of [320, 390, 667, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const topic of guideTopics) {
      await page.goto(`/docs/${topic.slug}/`);
      const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, content: document.querySelector('.sl-markdown-content')?.getBoundingClientRect().width ?? 0 }));
      expect(layout.document, `${topic.slug} at ${width}px`).toBeLessThanOrEqual(layout.viewport);
      expect(layout.content).toBeGreaterThan(0);
      expect(layout.content).toBeLessThanOrEqual(800);
    }
  }
});
