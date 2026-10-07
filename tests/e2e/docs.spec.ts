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
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
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

for (const width of [320, 390, 667, 1024, 1440]) {
  test(`Custom docs topic layouts reflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const topic of guideTopics) {
      await page.goto(`/docs/${topic.slug}/`);
      const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, content: document.querySelector('.markdown-doc')?.getBoundingClientRect().width ?? 0 }));
      expect(layout.document, `${topic.slug} at ${width}px`).toBeLessThanOrEqual(layout.viewport);
      expect(layout.content).toBeGreaterThan(0);
      expect(layout.content).toBeLessThanOrEqual(800);
    }
  });
}

test('guide navigation has its final responsive state with JavaScript disabled', async ({ browser, baseURL }) => {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    try {
      const page = await context.newPage();
      await page.goto(new URL('/docs/', baseURL).href);
      await expect(page.getByRole('searchbox', { name: 'Search docs', exact: true })).not.toBeVisible();
      await expect(page.getByText('Guide search requires JavaScript. Browse the guide topics.', { exact: true })).toBeVisible();
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
  expect(await page.evaluate(() => sessionStorage.getItem(`docs-query:${history.state.docsQueryId}`))).toBe('fakeroot');
  await expect(page.getByRole('list', { name: 'Guide search results' })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('fakeroot');
  expect(errors).toEqual([]);
});

test('cached result counts do not repeatedly mutate the search live region', async ({ page }) => {
  await page.goto('/docs/?q=fakeroot');
  const status = page.getByRole('status');
  const results = page.getByRole('list', { name: 'Guide search results' }).getByRole('link');
  await expect(results.first()).toBeVisible();
  const count = await results.count();
  expect(count).toBeGreaterThan(0);
  await expect(status).toHaveText(`${count} matching topic${count === 1 ? '' : 's'}`);
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

test('immediate reload and history traversal restore the complete pending query', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Docs', exact: true }).first().click();
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await input.pressSequentially('fakeroot', { delay: 15 });
  await page.goBack();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  await expect(page.getByRole('heading', { name: "Nirmal's Shell", level: 1 })).toBeVisible();
  await page.goForward();
  await expect(input).toHaveValue('fakeroot');
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('list', { name: 'Guide search results' })).toBeVisible();
  await input.fill('nix profiles');
  await page.reload();
  await expect(input).toHaveValue('nix profiles');
  await expect(page.getByRole('list', { name: 'Guide search results' })).toBeVisible();
  // A new navigation with an explicit query must not reuse an old entry snapshot.
  await page.goto('/docs/?q=upkg');
  await expect(input).toHaveValue('upkg');
});

test('failed search stays failed while typing until Retry or topic navigation', async ({ page }) => {
  let attempts = 0;
  await page.route('**/docs-search.json?*', (route) => { attempts += 1; return route.abort(); });
  await page.goto('/docs/');
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await input.pressSequentially('fakeroot', { delay: 50 });
  const retry = page.getByRole('button', { name: 'Retry search' });
  await expect(retry).toBeVisible();
  expect(attempts).toBe(1);
  await retry.focus();
  await retry.press('Enter');
  await expect(input).toBeFocused();
  await expect.poll(() => attempts).toBe(2);
  await expect(retry).toBeVisible();
  await page.route('**/docs-search.json?*', (route) => { attempts += 1; return route.fulfill({ json: [{ title: 'Recovered index', url: '/docs/nix/', text: 'fakeroot' }] }); });
  await page.getByRole('navigation', { name: 'Guide pagination' }).getByRole('link').last().click();
  await expect(page.getByRole('heading', { name: 'Installation and requirements', level: 1 })).toBeVisible();
  await expect(input).toBeEnabled();
  await input.fill('fakeroot');
  await expect(page.getByRole('link', { name: /^Recovered index/ })).toBeVisible();
  expect(attempts).toBe(3);
});

for (const arrival of ['deep link', 'native fragment']) {
  test(`legacy ${arrival} redirects preserve target, scroll and router state through Back`, async ({ page }) => {
    await page.goto(`/docs/?keep=1${arrival === 'deep link' ? '#contents' : ''}`);
    await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
    if (arrival === 'native fragment') await page.evaluate(() => { location.hash = 'contents'; });
    await expect(page).toHaveURL(/\/docs\/\?keep=1#explore-the-guide$/);
    await expect.poll(() => page.evaluate(() => history.state?.index)).toEqual(expect.any(Number));
    await expect.poll(() => page.evaluate(() => document.querySelector(':target')?.id)).toBe('explore-the-guide');
    await expect(page.locator('[data-legacy-links] a:visible')).toHaveCount(0);
    await expect(page.locator('#explore-the-guide')).toBeInViewport();
    await expect.poll(() => page.locator('#explore-the-guide').evaluate((element) => {
      const box = element.getBoundingClientRect();
      const header = document.querySelector('[data-site-header]')!.getBoundingClientRect();
      return box.top >= Math.max(0, header.bottom) && box.top < innerHeight;
    })).toBe(true);
    await page.getByRole('navigation', { name: 'Guide pagination' }).getByRole('link').last().click();
    await expect(page.getByRole('heading', { name: 'Installation and requirements', level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/docs\/\?keep=1#explore-the-guide$/);
    await expect(page.getByRole('heading', { name: 'Shell guide', level: 1 })).toBeVisible();
    await expect(page.locator('#explore-the-guide')).toBeAttached();
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Installation and requirements', level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Shell guide', level: 1 })).toBeVisible();
  });
}

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

test('displayed typographic quotes and straight quotes find the same guide passage', async ({ page }) => {
  const authored = `Author's "sample phrase"`;
  await page.route('**/docs-search.json?*', (route) => route.fulfill({ json: [{ title: 'Quote fixture', url: '/docs/finders/', text: authored }] }));
  await page.route('**/docs/finders/', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<article[^>]*>/, '$&<p data-quote-fixture>Author’s “sample phrase”</p>');
    await route.fulfill({ response, body });
  });
  await page.goto('/docs/finders/');
  const displayed = await page.locator('[data-quote-fixture]').innerText();
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await expect(input).toBeEnabled();
  await input.fill(displayed);
  const result = page.getByRole('list', { name: 'Guide search results' }).getByRole('link', { name: /^Quote fixture/ });
  await expect(result).toBeVisible();
  await input.fill(authored);
  await expect(result).toBeVisible();
});

test('multi-term excerpts use a body match when the first term is only in the title', async ({ page }) => {
  const text = 'unrelated introduction '.repeat(20) + 'workflow context ' + 'completeword '.repeat(20);
  await page.route('**/docs-search.json?*', (route) => route.fulfill({ json: [{ title: 'Example', url: '/docs/nix/', text }] }));
  await page.goto('/docs/?q=Example%20workflow');
  await expect(page.locator('.docs-search-result span')).toContainText('workflow context');
  await expect(page.locator('.docs-search-result span')).toHaveText(/^…/);
});

test('missing navigation timing honors a fresh URL query', async ({ page }) => {
  await page.addInitScript(() => {
    history.replaceState({ index: 0, scrollX: 0, scrollY: 0, docsQueryId: 'existing-entry' }, '');
    sessionStorage.setItem('docs-query:existing-entry', 'stale query');
    const getEntries = performance.getEntriesByType.bind(performance);
    performance.getEntriesByType = (type) => type === 'navigation' ? [] : getEntries(type);
  });
  await page.goto('/docs/?q=nix');
  await expect(page.getByRole('searchbox', { name: 'Search docs', exact: true })).toHaveValue('nix');
});

test('separate document loads of one route retain independent query snapshots', async ({ page }) => {
  await page.goto('/docs/');
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  await input.fill('alpha');
  const first = await page.evaluate(() => history.state.docsQueryId);
  await page.goto('/docs/?z=1');
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  await input.fill('beta');
  const second = await page.evaluate(() => history.state.docsQueryId);
  expect(first).toEqual(expect.any(String));
  expect(second).not.toBe(first);
  await page.goBack();
  await expect(input).toHaveValue('alpha');
  await expect.poll(() => page.evaluate(() => history.state.docsQueryId)).toBe(first);
  await page.reload();
  await expect(input).toHaveValue('alpha');
  await page.goForward();
  await expect(input).toHaveValue('beta');
  await expect.poll(() => page.evaluate(() => history.state.docsQueryId)).toBe(second);
});

test('a late rejected index request cannot disable search on the next topic', async ({ page }) => {
  let attempts = 0;
  let abortOld: (() => Promise<void>) | undefined;
  await page.route('**/docs-search.json?*', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await new Promise<void>((resolve) => { abortOld = async () => { await route.abort(); resolve(); }; });
    } else await route.fulfill({ json: [{ title: 'Recovered index', url: '/docs/nix/', text: 'fresh query' }] });
  });
  await page.goto('/docs/');
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await expect(input).toBeEnabled();
  await input.fill('old query');
  await expect.poll(() => Boolean(abortOld)).toBe(true);
  await page.getByRole('navigation', { name: 'Guide pagination' }).getByRole('link').last().click();
  await expect(page.getByRole('heading', { name: 'Installation and requirements', level: 1 })).toBeVisible();
  await expect(input).toBeEnabled();
  await abortOld!();
  await input.fill('fresh query');
  await expect(page.getByRole('link', { name: /^Recovered index/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry search' })).not.toBeVisible();
  expect(attempts).toBe(2);
});

test('a missing docs chunk offers a native page reload with an honest failure status', async ({ page }) => {
  await page.clock.install();
  await page.route('**/_astro/docs*.js', (route) => route.abort());
  await page.goto('/docs/?keep=1');
  await page.clock.fastForward(10_001);
  await expect(page.getByRole('status')).toContainText('Couldn’t initialize guide search');
  const reload = page.getByRole('link', { name: 'Reload search' });
  await expect(reload).toBeVisible();
  await expect(reload).toHaveAttribute('href', /\/docs\/\?keep=1$/);
  await page.unroute('**/_astro/docs*.js');
  await reload.click();
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await expect(input).toBeEnabled();
  await input.fill('nix');
  await expect(page.getByRole('list', { name: 'Guide search results' })).toBeVisible();
});

test('legacy redirects retain query state', async ({ page }) => {
  await page.goto('/docs/?q=nix&keep=1#aliases');
  await expect(page).toHaveURL(/\/docs\/shell-basics\/\?q=nix&keep=1#aliases$/);
  await expect(page.getByRole('searchbox', { name: 'Search docs', exact: true })).toHaveValue('nix');
});

test('legacy anchors offer an actionable destination without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(new URL('/docs/#setup-and-scope', baseURL).href);
    const link = page.locator('#setup-and-scope');
    await expect(link).toBeVisible();
    await expect(link).toBeInViewport();
    await link.focus();
    await link.press('Enter');
    await expect(page).toHaveURL(/\/docs\/installation\/#setup-and-scope$/);
    await expect(page.getByRole('heading', { name: 'Setup and scope', exact: true })).toBeVisible();
  } finally { await context.close(); }
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


test('a changed index version refreshes the cache after topic navigation', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/docs-search.json?*', (route) => {
    requests.push(route.request().url());
    const updated = new URL(route.request().url()).searchParams.get('v') === 'updated';
    return route.fulfill({ json: [{ title: updated ? 'Updated index' : 'Original index', url: '/docs/nix/', text: updated ? 'newterm' : 'oldterm' }] });
  });
  await page.route('**/docs/nix/', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/data-index-url="[^"]+"/, 'data-index-url="/docs-search.json?v=updated"');
    await route.fulfill({ response, body });
  });
  await page.goto('/docs/?q=oldterm');
  await page.getByRole('link', { name: /^Original index/ }).click();
  await expect(page.getByRole('heading', { name: 'Nix profiles and pickers', level: 1 })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search docs', exact: true }).fill('newterm');
  await expect(page.getByRole('link', { name: /^Updated index/ })).toBeVisible();
  expect(requests).toHaveLength(2);
});

test('ordinary native fragments retain complete router state, query and scroll through traversal', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/docs/nix/');
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => { location.hash = 'picker-cache-and-dependencies'; });
  await expect.poll(() => page.evaluate(() => history.state?.index)).toEqual(expect.any(Number));
  await expect(page.locator('#picker-cache-and-dependencies')).toBeInViewport();
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await input.fill('nix profiles');
  await expect(page.getByRole('list', { name: 'Guide search results' })).toBeVisible();
  await input.evaluate((element) => (element as HTMLInputElement).blur());
  const state = await page.evaluate(() => history.state);
  expect(state).toMatchObject({ index: expect.any(Number), scrollX: expect.any(Number), scrollY: expect.any(Number), docsQueryId: expect.any(String) });
  await page.evaluate(() => scrollTo({ top: 400, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(400);
  await page.locator('.docs-pagination a').last().evaluate((link) => (link as HTMLAnchorElement).click());
  await expect(page.getByRole('heading', { name: 'Credentials', level: 1 })).toBeVisible();
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  // Hold the traversal fetch across the URL flush cadence: the outgoing
  // controller stays connected while history already names the Nix entry.
  await input.fill('credentials');
  await input.fill('pending destination edit');
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let requested = false;
  await page.route('**/docs/nix/**', async (route) => {
    const response = await route.fetch();
    requested = true;
    await held;
    await route.fulfill({ response });
  });
  const back = page.goBack();
  await expect.poll(() => requested).toBe(true);
  await page.clock.fastForward(1_001);
  expect(await page.evaluate(() => sessionStorage.getItem(`docs-query:${history.state.docsQueryId}`))).toBe('nix profiles');
  expect(new URL(page.url()).searchParams.get('q')).toBe('nix profiles');
  release();
  await back;
  await expect(page.getByRole('heading', { name: 'Nix profiles and pickers', level: 1 })).toBeVisible();
  await expect(input).toHaveValue('nix profiles');
  await expect.poll(() => page.evaluate(() => history.state?.index)).toBe(state.index);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(400);
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Credentials', level: 1 })).toBeVisible();
});

test('query snapshots work on an insecure HTTP origin', async ({ page, request, baseURL }) => {
  const origin = 'http://docs-http.test';
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    const response = await request.get(new URL(url.pathname + url.search, baseURL).href);
    await route.fulfill({ response });
  });
  await page.goto(`${origin}/docs/`);
  expect(await page.evaluate(() => isSecureContext)).toBe(false);
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await input.pressSequentially('fakeroot', { delay: 15 });
  const identity = await page.evaluate(() => history.state.docsQueryId);
  expect(identity).toEqual(expect.any(String));
  await page.reload();
  await expect(input).toHaveValue('fakeroot');
  expect(await page.evaluate(() => history.state.docsQueryId)).toBe(identity);
});

for (const anchor of ['aliases', 'contents']) {
  test(`native legacy #${anchor} redirects carry the complete pending query`, async ({ page }) => {
    await page.clock.install();
    await page.goto('/docs/?keep=1');
    await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
    const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
    await input.fill('nix');
    await input.fill('nix profiles');
    expect(new URL(page.url()).searchParams.get('q')).toBe('nix');
    await page.evaluate((value) => { location.hash = value; }, anchor);
    await expect.poll(() => new URL(page.url()).hash).toBe(anchor === 'contents' ? '#explore-the-guide' : '#aliases');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('nix profiles');
    expect(new URL(page.url()).searchParams.get('keep')).toBe('1');
    await expect(input).toHaveValue('nix profiles');
    await expect.poll(() => page.evaluate(() => history.state?.index)).toEqual(expect.any(Number));
  });
}

test('a stalled index times out and exposes working retry without losing the query', async ({ page }) => {
  await page.clock.install();
  let attempts = 0;
  await page.route('**/docs-search.json?*', async (route) => {
    attempts += 1;
    if (attempts > 1) await route.fulfill({ json: [{ title: 'Timeout recovery', url: '/docs/nix/', text: 'retained query' }] });
  });
  await page.goto('/docs/');
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await expect(input).toBeEnabled();
  await input.fill('retained query');
  await expect.poll(() => attempts).toBe(1);
  await page.clock.fastForward(10_001);
  const retry = page.getByRole('button', { name: 'Retry search' });
  await expect(retry).toBeVisible();
  await page.clock.fastForward(501);
  await expect(page.getByRole('status')).toHaveText('Search unavailable');
  await expect(input).toHaveValue('retained query');
  await retry.click();
  await expect(input).toBeFocused();
  await expect(page.getByRole('link', { name: /^Timeout recovery/ })).toBeVisible();
  expect(attempts).toBe(2);
});

test('docs command shortcuts accept either case and select the existing query', async ({ page }) => {
  await page.goto('/docs/');
  const input = page.getByRole('searchbox', { name: 'Search docs', exact: true });
  await expect(input).toBeEnabled();
  for (const key of ['Control+k', 'Control+Shift+K', 'Meta+k', 'Meta+Shift+K']) {
    await input.fill('seed query');
    await page.getByRole('link', { name: 'Commands', exact: true }).first().focus();
    await page.keyboard.press(key);
    await expect(input).toBeFocused();
    expect(await input.evaluate((element) => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd])).toEqual([0, 'seed query'.length]);
    await page.keyboard.insertText('replacement');
    await expect(input).toHaveValue('replacement');
  }
});

test('snapshot commit links have a descriptive name and a visible link affordance', async ({ page }) => {
  await page.goto('/docs/');
  const source = page.getByRole('complementary', { name: 'Documentation source' });
  const commit = source.getByRole('link', { name: /^Source commit [a-f0-9]{8}$/ });
  await expect(commit).toHaveAttribute('href', /\/tree\/[a-f0-9]{40}$/);
  expect(await commit.evaluate((link) => getComputedStyle(link).textDecorationLine)).toContain('underline');
  await commit.focus();
  await expect(commit).toBeFocused();
  await expect(source.getByRole('link', { name: 'View GUIDE.md source' })).toBeVisible();
});

test('partial search initialization keeps the native reload recovery available', async ({ page }) => {
  await page.clock.install();
  await page.route('**/docs/', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(/<template data-search-template>[\s\S]*?<\/template>/, '') });
  });
  await page.goto('/docs/');
  await expect(page.locator('[data-docs-search]')).not.toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('searchbox', { name: 'Search docs', exact: true })).toBeDisabled();
  await page.clock.fastForward(10_001);
  await expect(page.getByRole('status')).toContainText('Couldn’t initialize guide search');
  const reload = page.getByRole('link', { name: 'Reload search' });
  await expect(reload).toBeVisible();
  await page.unroute('**/docs/');
  await reload.click();
  await expect(page.locator('[data-docs-search]')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('searchbox', { name: 'Search docs', exact: true })).toBeEnabled();
});
