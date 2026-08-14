import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const coreRoutes = ['/', '/commands/', '/tips/'];
const phoneViewports = [
	{ width: 320, height: 800 },
	{ width: 360, height: 800 },
	{ width: 390, height: 844 },
	{ width: 430, height: 932 },
	{ width: 667, height: 375 },
];

for (const route of coreRoutes) {
	test(`${route} has no serious accessibility violations`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto(route);
		await expect(page.locator('main')).toBeVisible();
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();
		expect(results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
	});
}

test('core routes fit required mobile viewports', async ({ page }) => {
	for (const viewport of phoneViewports) {
		await page.setViewportSize(viewport);
		for (const route of coreRoutes) {
			await page.goto(route);
			const dimensions = await page.evaluate(() => ({
				documentWidth: document.documentElement.scrollWidth,
				viewportWidth: document.documentElement.clientWidth,
			}));
			expect(dimensions.documentWidth, `${route} should fit ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(dimensions.viewportWidth);
		}
	}
});

test('mobile navigation has stable touch targets and follows scroll direction', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const heights: number[] = [];

	for (const route of coreRoutes) {
		await page.goto(route);
		const header = page.locator('[data-site-header]');
		heights.push(await header.evaluate((element) => element.getBoundingClientRect().height));

		for (const label of ['Home', 'Commands', 'Tips']) {
			const box = await page.getByRole('link', { name: label, exact: true }).boundingBox();
			expect(box?.height ?? 0, `${label} should be touch friendly on ${route}`).toBeGreaterThanOrEqual(44);
		}
	}

	expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);

	await page.goto('/commands/');
	const header = page.locator('[data-site-header]');
	await page.evaluate(() => window.scrollTo(0, 500));
	await expect(header).toHaveAttribute('data-scroll-state', 'hidden');
	await page.evaluate(() => window.scrollBy(0, -80));
	await expect(header).toHaveAttribute('data-scroll-state', 'visible');
	await page.evaluate(() => window.scrollTo(0, 500));
	await expect(header).toHaveAttribute('data-scroll-state', 'hidden');
	await page.getByRole('link', { name: 'Home', exact: true }).focus();
	await expect(header).toHaveAttribute('data-scroll-state', 'visible');
});

test('mobile search and filter controls are readable and do not scroll horizontally', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 800 });

	for (const route of ['/commands/', '/tips/']) {
		await page.goto(route);
		const search = page.getByRole('searchbox');
		const searchBox = await search.boundingBox();
		expect(searchBox?.height ?? 0).toBeGreaterThanOrEqual(44);
		expect(await search.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
	}

	await page.goto('/commands/');
	const filters = page.getByRole('group', { name: 'Filter commands by type' });
	const dimensions = await filters.evaluate(({ clientWidth, scrollWidth }) => ({ clientWidth, scrollWidth }));
	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

	for (const filter of await filters.getByRole('button').all()) {
		const box = await filter.boundingBox();
		expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
		const alignment = await filter.evaluate((button) => {
			const children = Array.from(button.children) as HTMLElement[];
			const buttonRect = button.getBoundingClientRect();
			const childRects = children.map((child) => child.getBoundingClientRect());
			const pairLeft = Math.min(...childRects.map(({ left }) => left));
			const pairRight = Math.max(...childRects.map(({ right }) => right));
			return {
				alignItems: getComputedStyle(button).alignItems,
				centerDelta: Math.abs((pairLeft + pairRight) / 2 - (buttonRect.left + buttonRect.right) / 2),
				justifyContent: getComputedStyle(button).justifyContent,
			};
		});
		expect(alignment.alignItems).toBe('center');
		expect(alignment.justifyContent).toBe('center');
		expect(alignment.centerDelta).toBeLessThanOrEqual(1);
	}

	await page.setViewportSize({ width: 768, height: 800 });
	await page.goto('/commands/');
	for (const filter of await page.getByRole('group', { name: 'Filter commands by type' }).getByRole('button').all()) {
		const alignment = await filter.evaluate((button) => {
			const children = Array.from(button.children) as HTMLElement[];
			const buttonRect = button.getBoundingClientRect();
			const childRects = children.map((child) => child.getBoundingClientRect());
			const pairLeft = Math.min(...childRects.map(({ left }) => left));
			const pairRight = Math.max(...childRects.map(({ right }) => right));
			return {
				alignItems: getComputedStyle(button).alignItems,
				centerDelta: Math.abs((pairLeft + pairRight) / 2 - (buttonRect.left + buttonRect.right) / 2),
				justifyContent: getComputedStyle(button).justifyContent,
			};
		});
		expect(alignment.alignItems).toBe('center');
		expect(alignment.justifyContent).toBe('center');
		expect(alignment.centerDelta).toBeLessThanOrEqual(1);
	}
});

test('expanded command details use the mobile typography and heading contract', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/commands/?command=function%3Aupkg');

	const command = page.locator('[data-command="upkg"]');
	await expect(command.locator('[data-slot="accordion-content"]')).toBeVisible();
	await expect(command.locator('h2')).toHaveCount(1);
	expect(await command.locator('h3').count()).toBeGreaterThan(0);
	await expect(command.locator('h4')).toHaveCount(0);

	const roleSizes = await page.evaluate(() => {
		const size = (selector: string) => {
			const element = document.querySelector<HTMLElement>(selector);
			return element ? Number.parseFloat(getComputedStyle(element).fontSize) : 0;
		};
		return {
			command: size('[data-command="upkg"] h2 [translate="no"]'),
			heading: size('[data-command="upkg"] [data-detail-section-heading]'),
			label: size('[data-command="upkg"] [data-detail-label]'),
			body: size('[data-command="upkg"] [data-detail-body]'),
			code: size('[data-command="upkg"] [data-detail-code]'),
		};
	});

	expect(roleSizes.command).toBeGreaterThanOrEqual(18);
	expect(roleSizes.heading).toBeGreaterThanOrEqual(16);
	expect(roleSizes.label).toBeGreaterThanOrEqual(16);
	expect(roleSizes.body).toBeGreaterThanOrEqual(16);
	expect(roleSizes.code).toBeGreaterThanOrEqual(16);
});

test('search, filters, expanded command, and history state remain URL synchronized', async ({ page }) => {
	await page.goto('/commands/');
	await page.getByRole('searchbox').fill('upkg');
	await expect(page).toHaveURL(/q=upkg/);
	await page.getByRole('button', { name: /^Functions,/ }).click();
	await expect(page).toHaveURL(/type=function/);
	await page.getByRole('button', { name: /upkg/i }).click();
	await expect(page).toHaveURL(/command=function%3Aupkg/);
	await page.reload();
	await expect(page.locator('[data-command="upkg"] [data-slot="accordion-content"]')).toBeVisible();
});

test('tip roulette loads its catalogue on demand and honors reduced motion', async ({ page }) => {
	const requests: string[] = [];
	await page.route('**/tips.json', async (route) => {
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify([
				{
					text: 'Use .. to move up one directory',
					category: 'navigation',
					source: 'globals',
					availability: 'Always available',
				},
			]),
		});
	});
	page.on('request', (request) => {
		if (request.url().endsWith('/tips.json')) requests.push(request.url());
	});
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	expect(requests).toEqual([]);
	const category = page.locator('[data-tip-category]');
	const placeholders = page.locator('[data-tip-placeholders]');
	const placeholderCategory = page.locator('[data-tip-placeholder-category]');
	const placeholderSource = page.locator('[data-tip-placeholder-source]');
	await expect(category).toBeHidden();
	await expect(page.locator('[data-tip-source]')).toBeHidden();
	await expect(page.locator('[data-tip-availability]')).toBeHidden();
	await expect(placeholderCategory).toHaveText('Category');
	await expect(placeholderSource).toHaveText('Source');
	await expect(placeholderCategory).toBeVisible();
	await expect(placeholderSource).toBeVisible();
	const initialText = await page.locator('[data-tip-text]').textContent();
	await page.getByRole('button', { name: 'Show Random Tip' }).click();
	await expect.poll(() => requests.length).toBe(1);
	await expect(page.locator('[data-tip-text]')).not.toHaveText(initialText ?? '');
	await expect(category).toBeVisible();
	await expect(category).toHaveAttribute('data-category', 'navigation');
	await expect(placeholders).toBeHidden();
	await expect(category.locator('[data-tip-category-label]')).toHaveText('Navigation');
	await expect(category.locator('[data-tip-category-icon="navigation"]')).toBeVisible();
	await expect(category.locator('[data-tip-category-icon]:visible')).toHaveCount(1);
	const categoryLayout = await category.evaluate((element) => {
		const label = element.querySelector<HTMLElement>('[data-tip-category-label]');
		const badgeRect = element.getBoundingClientRect();
		const labelRect = label?.getBoundingClientRect();
		return {
			display: getComputedStyle(element).display,
			labelInsideBadge: Boolean(
				labelRect
				&& labelRect.width > 0
				&& labelRect.top >= badgeRect.top
				&& labelRect.bottom <= badgeRect.bottom,
			),
		};
	});
	expect(categoryLayout).toEqual({ display: 'flex', labelInsideBadge: true });
	await expect(page.getByRole('button', { name: 'Show Random Tip' })).toBeEnabled();
});

test('core routes have no browser console errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('pageerror', (error) => errors.push(error.message));
	for (const route of coreRoutes) await page.goto(route);
	expect(errors).toEqual([]);
});
