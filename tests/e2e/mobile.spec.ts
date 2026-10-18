import { expect, test } from '@playwright/test';
import { waitForSearchIsland } from './helpers';

const siteRoutes = ['/', '/commands/', '/tips/', '/docs/', '/404.html'];
const phoneViewports = [
	{ width: 320, height: 800 },
	{ width: 360, height: 800 },
	{ width: 390, height: 844 },
	{ width: 430, height: 932 },
	{ width: 667, height: 375 },
];

test('site routes fit required mobile viewports', async ({ page }) => {
	// Load each route once and resize through the viewports; layout is CSS-driven.
	for (const route of siteRoutes) {
		await page.goto(route);
		for (const viewport of phoneViewports) {
			await page.setViewportSize(viewport);
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

		for (const label of ['Home', 'Docs', 'Commands', 'Tips']) {
			const link = page.locator('[data-site-header]').getByRole('link', { name: label, exact: true });
			const box = await link.boundingBox();
			expect(box?.height ?? 0, `${label} should be touch friendly on ${route}`).toBeGreaterThanOrEqual(44);
			expect(box?.width ?? 0, `${label} should be touch friendly on ${route}`).toBeGreaterThanOrEqual(44);
			expect(await link.evaluate((element) => element.scrollWidth <= element.clientWidth), `${label} should not clip on ${route}`).toBe(true);
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
	await page.locator('[data-site-header]').getByRole('link', { name: 'Home', exact: true }).focus();
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

	// Phones pick type and category from two selects sharing one 44px row.
	await page.goto('/commands/');
	await expect(page.getByRole('group', { name: 'Filter commands by type' })).toBeHidden();
	const type = page.getByRole('combobox', { name: 'Filter commands by type' });
	const category = page.getByRole('combobox', { name: 'Filter commands by category' });
	const [typeBox, categoryBox] = await Promise.all([type.boundingBox(), category.boundingBox()]);
	for (const box of [typeBox, categoryBox]) expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
	expect(Math.abs((typeBox?.y ?? 0) - (categoryBox?.y ?? 1))).toBeLessThanOrEqual(1);
	expect((typeBox?.x ?? 0) + (typeBox?.width ?? 0)).toBeLessThanOrEqual(categoryBox?.x ?? 0);
	for (const trigger of [type, category]) {
		expect(await trigger.evaluate(({ clientWidth, scrollWidth }) => scrollWidth <= clientWidth)).toBe(true);
	}
	// Results start higher than with the former five-button grid.
	const firstRow = await page.locator('[data-command]').first().boundingBox();
	expect(firstRow?.y ?? Infinity).toBeLessThan(520);

	// Open the select exactly once after hydration: a second click on an open
	// select is blocked by its popup, so retrying the click cannot recover.
	await waitForSearchIsland(page);
	await type.click();
	const functions = page.getByRole('option', { name: /^Functions \(/ });
	await expect(functions).toBeVisible();
	await functions.click();
	await expect(page).toHaveURL(/type=function/);
	await expect(type).toContainText('Functions');
	await expect(page.locator('[data-command]').first()).toContainText('Function');
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

test('copy controls meet touch target dimensions in expanded references', async ({ page }) => {
	await page.goto('/commands/?command=function%3Aupkg');
	const command = page.locator('[data-command="upkg"]');
	await expect(command.locator('[data-slot="accordion-content"]')).toBeVisible();
	const buttons = command.getByRole('button', { name: /Copy/ });
	expect(await buttons.count()).toBeGreaterThan(0);
	for (const button of await buttons.all()) {
		if (!(await button.isVisible())) continue;
		const box = await button.boundingBox();
		expect(box?.height).toBeGreaterThanOrEqual(44);
		expect(box?.width).toBeGreaterThanOrEqual(44);
	}
});
