import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const siteRoutes = ['/', '/commands/', '/tips/', '/404.html'];

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
	const searchbox = page.getByRole('searchbox');
	await expect.poll(async () => {
		await page.keyboard.press('ControlOrMeta+k');
		return searchbox.evaluate((element) => element === document.activeElement);
	}).toBe(true);
	await searchbox.fill('upkg');
	await expect(page).toHaveURL(/q=upkg/);
	await page.getByRole('button', { name: /^Functions,/ }).click();
	await expect(page).toHaveURL(/type=function/);
	await page.locator('[data-command="upkg"] [data-slot="accordion-trigger"]').click();
	await expect(page).toHaveURL(/command=function%3Aupkg/);
	await page.reload();
	await expect(page.locator('[data-command="upkg"] [data-slot="accordion-content"]')).toBeVisible();
});

test('function syntax copy hands over a runnable example, not the template', async ({ page }) => {
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/commands/?command=function%3Aupkg');
	const command = page.locator('[data-command="upkg"]');
	await expect(command.locator('[data-slot="accordion-content"]')).toBeVisible();
	await expect(command.getByRole('heading', { name: 'Syntax', exact: true })).toBeVisible();
	await expect(command.getByText('upkg [command] [args] [flags]')).toBeVisible();

	const syntaxCopy = command.getByRole('button', { name: 'Copy example: upkg' });
	await expect(syntaxCopy).toBeVisible();
	await expect.poll(async () => {
		await syntaxCopy.click();
		return page.evaluate(() => navigator.clipboard.readText());
	}).toBe('upkg');
});

test('filter-removal chips are real buttons keyboard users can activate', async ({ page }) => {
	await page.goto('/commands/?q=git&type=function&cat=git');
	const queryChip = page.getByRole('button', { name: 'Remove query filter: git' });
	const typeChip = page.getByRole('button', { name: 'Remove type filter: Functions' });
	const categoryChip = page.getByRole('button', { name: 'Remove category filter: Git' });
	// Visibility implies the island hydrated; the chips are React-rendered.
	await expect(queryChip).toBeVisible();
	await expect(typeChip).toBeVisible();
	await expect(categoryChip).toBeVisible();

	await categoryChip.focus();
	await page.keyboard.press('Enter');
	await expect(categoryChip).toBeHidden();
	await typeChip.focus();
	await page.keyboard.press('Enter');
	await expect(typeChip).toBeHidden();
	await queryChip.focus();
	await page.keyboard.press('Enter');
	await expect(queryChip).toBeHidden();

	await expect.poll(() => page.url()).toMatch(/\/commands\/?$/);
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

test('terminal prompt cursor is aligned inline with the prompt indicator', async ({ page }) => {
	// motion-safe entrance animations skew boundingBox() while in flight; measure at rest.
	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const route of ['/', '/404.html']) {
		await page.goto(route);
		const chevron = page.locator('pre code svg.lucide-chevron-right').last();
		const cursor = page.locator('pre code .bg-category-packages').first();
		await expect(chevron).toBeVisible();
		await expect(cursor).toBeVisible();

		const chevronBox = await chevron.boundingBox();
		const cursorBox = await cursor.boundingBox();
		expect(chevronBox).not.toBeNull();
		expect(cursorBox).not.toBeNull();

		const chevronCenter = (chevronBox?.y ?? 0) + (chevronBox?.height ?? 0) / 2;
		const cursorCenter = (cursorBox?.y ?? 0) + (cursorBox?.height ?? 0) / 2;
		expect(Math.abs(chevronCenter - cursorCenter)).toBeLessThanOrEqual(1);
	}
});

test('rewritten shell actions expose their own syntax and parent source', async ({ page }) => {
	await page.goto('/commands/?type=action');
	await expect.poll(() => page.locator('[data-command="upkg"]').count()).toBe(0);
	const action = page.locator('[data-command="upkg-plan"]');
	await action.locator('[data-slot="accordion-trigger"]').click();
	await expect(action.getByText('upkg plan [--only <list>]', { exact: true })).toBeVisible();
	await expect(action.getByRole('button', { name: 'Copy example: upkg plan', exact: true })).toBeVisible();
});

for (const name of ['cat', 'ztheme']) {
	test(`direct links land on ${name} and focus its trigger`, async ({ page }) => {
		const kind = name === 'cat' ? 'alias' : 'function';
		await page.goto(`/commands/?command=${kind}%3A${name}`);
		const trigger = page.locator(`[data-command="${name}"] [data-slot="accordion-trigger"]`);
		await expect(trigger).toBeFocused();
		await expect.poll(() => trigger.evaluate((element) => {
			const top = element.getBoundingClientRect().top;
			return top >= 0 && top < window.innerHeight;
		})).toBe(true);
	});
}

test('full command reference works with JavaScript disabled', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/commands/');
	await page.getByRole('link', { name: 'Read upkg reference', exact: true }).click();
	await expect(page).toHaveURL(/\/commands\/upkg\/$/);
	await expect(page.getByRole('heading', { level: 1, name: 'upkg' })).toBeVisible();
	await expect(page.getByText('upkg [command] [args] [flags]', { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'lib/functions-upkg.zsh', exact: true })).toHaveAttribute('href', /\/blob\/[a-f0-9]{40}\/lib\/functions-upkg.zsh$/);
	await context.close();
});

test('search matches separate tokens and ranks exact command names first', async ({ page }) => {
	await page.goto('/commands/?q=upkg');
	await expect.poll(() => page.locator('[data-command]').count()).toBe(2);
	await expect(page.locator('[data-command]').first()).toHaveAttribute('data-command', 'upkg');
	await page.getByRole('searchbox').fill('upgrade managers');
	await expect(page.locator('[data-command="upkg"]')).toBeVisible();
});

test('command sharing copies its permanent static reference URL', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => {
			document.documentElement.dataset.copiedText = text;
		} } });
	});
	await page.goto('/commands/?command=function%3Aupkg');
	const copy = page.getByRole('button', { name: 'Copy link to upkg', exact: true });
	await expect.poll(async () => {
		await copy.click();
		return page.locator('html').getAttribute('data-copied-text');
	}).toBe('https://zsh.nirmalkatariya.com/commands/upkg/');
});
