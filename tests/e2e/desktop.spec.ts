import { expect, test } from '@playwright/test';

const siteRoutes = ['/', '/commands/', '/tips/', '/404.html'];
const desktopViewports = [
	{ width: 1024, height: 768 },
	{ width: 1280, height: 800 },
	{ width: 1440, height: 900 },
	{ width: 1920, height: 1080 },
];

test('site routes fit and center the content shell at desktop viewports', async ({ page }) => {
	for (const viewport of desktopViewports) {
		await page.setViewportSize(viewport);
		for (const route of siteRoutes) {
			await page.goto(route);
			const dimensions = await page.evaluate(() => {
				const main = document.querySelector<HTMLElement>('main.content-shell');
				const rect = main?.getBoundingClientRect();
				return {
					documentWidth: document.documentElement.scrollWidth,
					viewportWidth: document.documentElement.clientWidth,
					layoutWidth: window.innerWidth,
					mainLeft: rect?.left ?? -1,
					mainWidth: rect?.width ?? -1,
				};
			});

			expect(dimensions.documentWidth, `${route} should fit ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(dimensions.viewportWidth);
			expect(dimensions.mainWidth).toBeGreaterThan(0);
			expect(dimensions.mainWidth).toBeLessThanOrEqual(1000);
			const rightGutter = dimensions.layoutWidth - dimensions.mainLeft - dimensions.mainWidth;
			expect(Math.abs(dimensions.mainLeft - rightGutter), `${route} should remain centered at ${viewport.width}px`).toBeLessThanOrEqual(16);
		}
	}
});

test('desktop navigation exposes the full header and remains visible while scrolling', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/commands/');

	const header = page.locator('[data-site-header]');
	await expect(page.getByRole('link', { name: "Nirmal's Shell" })).toBeVisible();
	await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible();
	await expect(page.locator('nav a[href="/"]').filter({ hasText: 'Home' })).toBeHidden();
	await expect(page.getByRole('link', { name: 'Commands', exact: true })).toHaveAttribute('aria-current', 'page');

	await page.evaluate(() => window.scrollTo(0, 600));
	await expect(header).toHaveAttribute('data-scroll-state', 'visible');
	const transform = await header.evaluate((element) => getComputedStyle(element).transform);
	expect(transform).toBe('none');
});

test('desktop home brand follows its intersection target across view transitions', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/');

	let brand = page.locator('[data-scroll-brand]');
	await expect(brand).toHaveAttribute('data-visible', 'false');
	await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
	await expect(brand).toHaveAttribute('data-visible', 'true');
	await expect(brand).toBeVisible();

	await page.getByRole('link', { name: 'Commands', exact: true }).click();
	await expect(page).toHaveURL(/\/commands\/?$/);
	await expect(page.getByRole('heading', { name: 'Command Reference' })).toBeVisible();
	await expect(page.locator('[data-site-header]')).toHaveCount(1);
	await expect(page.getByRole('link', { name: "Nirmal's Shell" })).toBeVisible();

	await page.getByRole('link', { name: "Nirmal's Shell" }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: "Nirmal's Shell", level: 1 })).toBeVisible();
	brand = page.locator('[data-scroll-brand]');
	await expect(brand).toHaveAttribute('data-visible', 'false');
	await expect(page.locator('[data-site-header]')).toHaveCount(1);
});

test('desktop page sections use their wide-screen grid layouts', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/');
	const commandHeading = await page.getByRole('heading', { name: 'Command Library' }).boundingBox();
	const tipsHeading = await page.getByRole('heading', { name: 'Shell Tips' }).boundingBox();
	expect(commandHeading).not.toBeNull();
	expect(tipsHeading).not.toBeNull();
	expect(Math.abs((commandHeading?.y ?? 0) - (tipsHeading?.y ?? 0))).toBeLessThanOrEqual(4);
	expect(tipsHeading?.x ?? 0).toBeGreaterThan((commandHeading?.x ?? 0) + (commandHeading?.width ?? 0));

	await page.goto('/commands/');
	for (const label of ['total commands', 'custom functions', 'entries with extracted details']) {
		await expect(page.getByText(label, { exact: true })).toBeVisible();
	}

	await page.goto('/tips/');
	const searchBox = await page.getByRole('searchbox').boundingBox();
	const categoryBox = await page.locator('[data-slot="select-trigger"]').boundingBox();
	expect(searchBox).not.toBeNull();
	expect(categoryBox).not.toBeNull();
	expect(Math.abs((searchBox?.y ?? 0) - (categoryBox?.y ?? 0))).toBeLessThanOrEqual(2);
	expect(searchBox?.width ?? 0).toBeGreaterThan(categoryBox?.width ?? 0);
});

test('desktop j/k and arrow keys move through command accordions and tip cards', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	const focusedIndex = (locator: ReturnType<typeof page.locator>) =>
		locator.evaluateAll((elements) => elements.indexOf(document.activeElement as HTMLElement));

	// Commands: j/k walk the accordion triggers.
	await page.goto('/commands/');
	const triggers = page.locator('[data-command] button[data-slot="accordion-trigger"]');
	await expect.poll(async () => {
		await page.keyboard.press('j');
		return focusedIndex(triggers);
	}).toBe(0);
	await expect.poll(async () => {
		await page.keyboard.press('j');
		return focusedIndex(triggers);
	}).toBe(1);
	await expect.poll(async () => {
		await page.keyboard.press('k');
		return focusedIndex(triggers);
	}).toBe(0);

	// Tips: arrows walk the tip rows (roving tabindex), j/k included.
	await page.goto('/tips/');
	const tips = page.locator('[role="listitem"][tabindex]');
	await expect.poll(async () => {
		await page.keyboard.press('ArrowDown');
		return focusedIndex(tips);
	}).toBe(0);
	await expect.poll(async () => {
		await page.keyboard.press('j');
		return focusedIndex(tips);
	}).toBe(1);
	await expect.poll(async () => {
		await page.keyboard.press('k');
		return focusedIndex(tips);
	}).toBe(0);

	// ArrowUp from outside the list wraps to the last row.
	await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
	const tipCount = await tips.count();
	await expect.poll(async () => {
		await page.keyboard.press('ArrowUp');
		return focusedIndex(tips);
	}).toBe(tipCount - 1);
});

test('desktop command and tip explorers support keyboard and extended-result workflows', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/commands/');
	const commandSearch = page.getByRole('searchbox');
	await expect.poll(async () => {
		await page.keyboard.press('ControlOrMeta+k');
		return commandSearch.evaluate((element) => element === document.activeElement);
	}).toBe(true);
	await commandSearch.fill('upkg');
	await expect(page.locator('[data-command]')).toHaveCount(2);
	await expect(page.locator('[data-command="upkg-plan"]')).toBeVisible();
	await page.locator('[data-command="upkg"] [data-slot="accordion-trigger"]').click();
	const command = page.locator('[data-command="upkg"]');
	await expect(command.locator('[data-slot="accordion-content"]')).toBeVisible();
	await expect(command.locator('[data-slot="table"]')).toBeVisible();

	await page.goto('/tips/');
	await expect(page.getByRole('listitem')).toHaveCount(24);
	await page.getByRole('button', { name: /Show 24 More Tips/ }).click();
	await expect(page.getByRole('listitem')).toHaveCount(48);
	const tipSearch = page.getByRole('searchbox');
	await expect.poll(async () => {
		await page.keyboard.press('ControlOrMeta+k');
		return tipSearch.evaluate((element) => element === document.activeElement);
	}).toBe(true);
	await tipSearch.fill('definitely-no-matching-tip');
	await expect(page.getByRole('heading', { name: 'No Tips Found' })).toBeVisible();
	await page.getByRole('button', { name: 'Clear Search' }).click();
	await expect(tipSearch).toBeFocused();
	await expect(page).not.toHaveURL(/q=/);

	await page.locator('[data-slot="select-trigger"]').click();
	await page.getByRole('option', { name: /^Navigation \(/ }).click();
	await expect(page).toHaveURL(/cat=navigation/);
	await expect(page.getByRole('listitem').first()).toContainText('Navigation');
});
