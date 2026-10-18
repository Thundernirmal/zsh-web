import { expect, test } from '@playwright/test';
import legacyLinks from '../../src/data/docs-links.json' with { type: 'json' };

// Contracts on the emitted HTML, CSS and chunks, which no browser engine
// changes, so these run once, in the desktop Chromium project.

test('every generated legacy target exists in rendered topic HTML', async ({ request }) => {
  const pages = new Map<string, string>();
  for (const url of Object.values(legacyLinks)) {
    const [route, anchor] = url.split('#');
    if (!pages.has(route)) {
      const response = await request.get(route);
      expect(response.status(), route).toBe(200);
      pages.set(route, await response.text());
    }
    expect(pages.get(route), url).toContain(`id="${anchor}"`);
  }
});

test('emitted legacy-link CSS keeps its hiding rule independent of :has support', async ({ page, request }) => {
  await page.goto('/docs/');
  const paths = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
  const rules: string[] = [];
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    rules.push(...Array.from((await response.text()).matchAll(/[^{}]*\[data-legacy-links\][^{}]*\{[^{}]*\}/g), (match) => match[0]));
  }
  expect(rules.length).toBeGreaterThan(0);
  expect(rules.join('')).not.toContain(':has(');
  expect(rules.join('')).toMatch(/a:not\(:target\)[^{]*\{[^}]*display:none/);
});

test('docs routes use the same external controller chunk', async ({ page, request }) => {
  const controllers = new Set<string>();
  const inspectLoadedScripts = async () => {
    const urls = await page.evaluate(() => performance.getEntriesByType('resource')
      .map((entry) => entry.name).filter((url) => new URL(url).pathname.endsWith('.js')));
    for (const url of urls) {
      const response = await request.get(url);
      expect(response.ok()).toBe(true);
      if ((await response.text()).includes('data-docs-search')) controllers.add(new URL(url).pathname);
    }
  };
  await page.goto('/');
  await inspectLoadedScripts();
  expect(controllers.size).toBe(0);
  for (const path of ['/docs/', '/docs/nix/']) {
    await page.goto(path);
    await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
    await inspectLoadedScripts();
    expect(controllers.size).toBe(1);
  }
});
