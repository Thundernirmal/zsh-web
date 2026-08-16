import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const siteRoutes = ['/', '/commands/', '/tips/', '/404.html'];

test('homepage terminal loads Ghostty WASM and accepts shell input', async ({ page }) => {
	const errors: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto('/');
	const terminal = page.locator('[data-terminal-ready="true"]');
	await expect(terminal).toBeVisible();
	await expect(terminal.locator('canvas')).toHaveCount(1);
	const input = page.getByLabel('Interactive shell demo input');
	await expect(terminal).not.toBeFocused();
	await expect(input).not.toBeFocused();
	await input.pressSequentially('help');
	await input.press('Enter');
	await input.pressSequentially('commands git');
	await input.press('Enter');
	await expect(terminal).toHaveAttribute('data-terminal-ready', 'true');
	expect(errors).toEqual([]);
});

for (const route of siteRoutes) {
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

test('command search, filters, expanded state, and history remain URL synchronized', async ({ page }) => {
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

test('client-side route transitions complete without console errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto('/');
	await page.getByRole('link', { name: 'Commands', exact: true }).click();
	await expect(page).toHaveURL(/\/commands\/?$/);
	await expect(page.getByRole('heading', { name: 'Command Reference' })).toBeVisible();
	await page.getByRole('link', { name: 'Tips', exact: true }).click();
	await expect(page).toHaveURL(/\/tips\/?$/);
	await expect(page.getByRole('heading', { name: 'Shell Tips', level: 1 })).toBeVisible();
	await page.locator('header a[href="/"]:visible').first().click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: "Nirmal's Shell", level: 1 })).toBeVisible();
	await page.goto('/404.html');
	await expect(page.getByRole('heading', { name: 'Command not found.' })).toBeVisible();

	expect(errors).toEqual([]);
});

test('404 page is branded and its recovery links work', async ({ page }) => {
	await page.goto('/404.html');
	await expect(page).toHaveTitle(/Page Not Found \| Nirmal's Shell/);
	await expect(page.getByText('HTTP 404', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Command not found.' })).toBeVisible();
	await expect(page.getByText('zsh: no such page: /requested/page', { exact: true })).toBeVisible();
	await page.getByRole('link', { name: 'Return Home' }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: "Nirmal's Shell" })).toBeVisible();
});
