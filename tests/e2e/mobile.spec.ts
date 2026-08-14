import { expect, test } from '@playwright/test';

const siteRoutes = ['/', '/commands/', '/tips/', '/404.html'];
const phoneViewports = [
	{ width: 320, height: 800 },
	{ width: 360, height: 800 },
	{ width: 390, height: 844 },
	{ width: 430, height: 932 },
	{ width: 667, height: 375 },
];

test('site routes fit required mobile viewports', async ({ page }) => {
	for (const viewport of phoneViewports) {
		await page.setViewportSize(viewport);
		for (const route of siteRoutes) {
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

	for (const route of siteRoutes) {
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
