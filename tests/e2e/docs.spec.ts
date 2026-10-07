import { expect, test } from '@playwright/test';
import { guideTopics } from '../../src/lib/guide-topics.mjs';
import legacyLinks from '../../src/data/docs-links.json' with { type: 'json' };

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

test('guide search restores URL queries on reload and clears without dropping other URL state', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/docs-search.json')) requests.push(request.url()); });
  await page.goto('/docs/nix/?q=%20%20&keep=1#picker-cache-and-dependencies');
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  expect(requests).toHaveLength(0);
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await input.fill('Nix profiles');
  await expect(page.getByRole('list', { name: 'Guide search results' })).toBeVisible();
  await page.reload();
  await expect(input).toHaveValue('Nix profiles');
  await expect(page.getByRole('list', { name: 'Guide search results' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(input).toBeFocused();
  await expect(page).toHaveURL(/\/docs\/nix\/\?keep=1#picker-cache-and-dependencies$/);
  await page.reload();
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  await expect(input).toHaveValue('');
  expect(requests).toHaveLength(2);
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

test('guide navigation has its final responsive state with JavaScript disabled', async ({ browser, baseURL }) => {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    try {
      const page = await context.newPage();
      await page.goto(new URL('/docs/', baseURL).href);
      const navigation = page.getByRole('navigation', { name: 'Guide navigation', exact: true });
      if (width < 1024) {
        await expect(navigation).not.toBeVisible();
        const summary = page.locator('[data-docs-menu] summary');
        await summary.focus();
        await summary.press('Enter');
      }
      await expect(navigation).toBeVisible();
      await expect(navigation.getByRole('link')).toHaveCount(guideTopics.length + 1);
      await navigation.getByRole('link', { name: /Nix profiles and pickers/ }).click();
      await expect(page.getByRole('heading', { name: 'Nix profiles and pickers', level: 1 })).toBeVisible();
    } finally { await context.close(); }
  }
});

test('sustained typing keeps search responsive and history writes bounded', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = history.replaceState.bind(history);
    let writes = 0;
    history.replaceState = (...args) => {
      document.documentElement.dataset.historyWrites = String(++writes);
      return original(...args);
    };
  });
  await page.goto('/docs/');
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  const initialWrites = Number(await page.locator('html').getAttribute('data-history-writes'));
  const started = Date.now();
  await input.pressSequentially('x'.repeat(140), { delay: 15 });
  await expect(page.getByRole('status')).toContainText('No matches');
  await input.fill('fakeroot');
  await expect(page.getByRole('list', { name: 'Guide search results' }).getByRole('link', { name: /^Installation/ })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('fakeroot');
  const writes = Number(await page.locator('html').getAttribute('data-history-writes')) - initialWrites;
  expect(writes).toBeLessThanOrEqual(Math.ceil((Date.now() - started) / 1000) + 1);
  expect(writes).toBeLessThan(100);
  expect(errors).toEqual([]);
});

test('a rejected history write does not block search and is retried', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/docs/');
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => {
    const original = history.replaceState.bind(history);
    let reject = true;
    history.replaceState = (...args) => {
      if (reject) { reject = false; throw new DOMException('History rate limit', 'SecurityError'); }
      return original(...args);
    };
  });
  await page.getByRole('searchbox', { name: 'Search docs', exact: true }).fill('fakeroot');
  await expect(page.getByRole('list', { name: 'Guide search results' })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('fakeroot');
  expect(errors).toEqual([]);
});

test('cached result counts do not repeatedly mutate the search live region', async ({ page }) => {
  await page.goto('/docs/?q=fakeroot');
  const status = page.getByRole('status');
  await expect(status).toHaveText('2 matching topics');
  await status.evaluate((element) => {
    let mutations = 0;
    new MutationObserver((records) => { element.dataset.mutations = String(mutations += records.length); }).observe(element, { childList: true, characterData: true, subtree: true });
    element.dataset.mutations = '0';
  });
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await input.pressSequentially(' '.repeat(20), { delay: 30 });
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(await input.inputValue());
  await expect(status).toHaveAttribute('data-mutations', '0');
});

test('search excerpts retain complete context words', async ({ page }) => {
  const text = 'prefixword '.repeat(12) + 'workflow ' + 'completeword '.repeat(20);
  await page.route('**/docs-search.json?*', (route) => route.fulfill({ json: [{ title: 'Example', url: '/docs/nix/', text }] }));
  await page.goto('/docs/?q=workflow');
  const excerpt = page.locator('.docs-search-result span');
  await expect(excerpt).toHaveText(/^…prefixword (?:prefixword )*workflow (?:completeword )*completeword…$/);
});

test('forced colors retain an actual search focus outline', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Forced-colors emulation is supported by Chromium.');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/docs/');
  await page.getByRole('searchbox', { name: 'Search docs', exact: true }).focus();
  const outline = await page.locator('.docs-search-field').evaluate((element) => ({ width: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle }));
  expect(outline).toEqual({ width: '2px', style: 'solid' });
});

test('narrow guide tables preserve copy-sensitive identifiers and scroll by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/docs/shell-basics/');
  await page.evaluate(() => document.fonts.ready);
  const table = page.locator('.markdown-doc table').filter({ hasText: 'INTERACTIVE_COMMENTS' });
  await expect(table).toHaveAttribute('tabindex', '0');
  const code = table.locator('code').filter({ hasText: /^INTERACTIVE_COMMENTS$/ });
  const dimensions = await code.evaluate((element) => ({ height: element.getBoundingClientRect().height, line: parseFloat(getComputedStyle(element).lineHeight) }));
  expect(dimensions.height).toBeLessThan(dimensions.line * 1.5);
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await table.press('ArrowRight');
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
