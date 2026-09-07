import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const siteRoutes = ['/', '/commands/', '/tips/', '/404.html', '/commands/upkg/', '/get-started/', '/docs/', '/troubleshooting/'];

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

test('browser chrome receives the site dark theme metadata and canvas color', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#1e1e2e');
	await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
	const colors = await page.evaluate(() => ({
		html: getComputedStyle(document.documentElement).backgroundColor,
		body: getComputedStyle(document.body).backgroundColor,
	}));
	expect(colors).toEqual({ html: 'rgb(30, 30, 46)', body: 'rgb(30, 30, 46)' });
});

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

test('function syntax copy hands over a runnable example, not the template', async ({ page, browserName }) => {
	test.skip(browserName !== 'chromium', 'System clipboard permissions are Chromium-only; mocked failure/retry and share coverage runs on all engines.');
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
					text: 'Run croot to enter the Git repository root',
                    commandId: 'command-croot',
                    commandName: 'croot',
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
	await expect(page.locator('[data-tip-reference]')).toHaveCount(0);
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
	await page.evaluate(() => document.fonts.ready);
	await page.getByRole('link', { name: 'Commands', exact: true }).click();
	await expect(page).toHaveURL(/\/commands\/?$/);
	await expect(page.getByRole('heading', { name: 'Command Reference' })).toBeVisible();
	await expect(page.locator('html')).not.toHaveAttribute('data-astro-transition', /.+/);
	await page.getByRole('link', { name: 'Tips', exact: true }).click();
	await expect(page).toHaveURL(/\/tips\/?$/);
	await expect(page.getByRole('heading', { name: 'Shell Tips', level: 1 })).toBeVisible();
	await expect(page.locator('html')).not.toHaveAttribute('data-astro-transition', /.+/);
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
		await page.evaluate(() => document.fonts.ready);
		const chevron = page.locator('pre code svg.lucide-chevron-right').last();
		const cursor = page.locator('pre code .bg-category-packages').first();
		await expect(chevron).toBeVisible();
		await expect(cursor).toBeVisible();

        await expect.poll(async () => page.evaluate(() => {
          const chevron = Array.from(document.querySelectorAll('pre code svg.lucide-chevron-right')).at(-1)?.getBoundingClientRect();
          const cursor = document.querySelector('pre code .bg-category-packages')?.getBoundingClientRect();
          return chevron && cursor ? Math.abs(chevron.y + chevron.height / 2 - cursor.y - cursor.height / 2) : Infinity;
        })).toBeLessThanOrEqual(1);
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

test('copy rejection is visible, retry succeeds, and text stays selectable', async ({ page }) => {
	await page.addInitScript(() => {
		let calls = 0;
		Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {
			if (++calls === 1) throw new Error('Clipboard blocked');
		} } });
	});
	await page.goto('/commands/?command=function%3Aupkg');
	const searchbox = page.getByRole('searchbox');
	await expect.poll(async () => {
		await page.keyboard.press('ControlOrMeta+k');
		return searchbox.evaluate((element) => element === document.activeElement);
	}).toBe(true);
	const command = page.locator('[data-command="upkg"]');
	const copy = command.getByRole('button', { name: 'Copy example: upkg', exact: true });
	await copy.click();
	await expect(command.getByRole('status').filter({ hasText: 'Could not copy; select the text manually.' })).toBeVisible();
	expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
	await expect(command.getByText('upkg [command] [args] [flags]', { exact: true })).toBeVisible();
	await copy.click();
	await expect(command.getByRole('status').filter({ hasText: 'Copied to clipboard' })).toHaveCount(1);
	await expect(command.getByText('Could not copy; select the text manually.')).toHaveCount(0);
});

test('tips lead to static command documentation', async ({ page }) => {
	await page.goto('/tips/?q=croot');
	const link = page.getByRole('link', { name: 'croot', exact: true });
	await expect(link).toHaveAttribute('href', '/commands/croot/');
	await link.click();
	await expect(page.getByRole('heading', { name: 'croot', level: 1 })).toBeVisible();
});

test('setup and troubleshooting are reachable from the homepage', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => document.fonts.ready);
	await page.locator('main').getByRole('link', { name: 'Get Started', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Install the shared configuration' })).toBeVisible();
	await expect(page.locator('html')).not.toHaveAttribute('data-astro-transition', /.+/);
	await page.locator('main').getByRole('link', { name: 'Troubleshooting', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Secret Service is unavailable' })).toBeVisible();
});

test('the committed shell guide is reachable from the homepage', async ({ page }) => {
	await page.goto('/');
	const docsAction = page.locator('main').getByRole('link', { name: 'Read Docs', exact: true });
	await expect(docsAction).toHaveAttribute('href', '/docs/');
	await docsAction.click();
	await expect(page.getByRole('heading', { name: 'Shared Zsh Configuration Guide', level: 1 })).toBeVisible();
	await expect(page.getByText('Documentation snapshot', { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'View GUIDE.md source' })).toHaveAttribute(
		'href',
		/\/blob\/[0-9a-f]{40}\/GUIDE\.md$/,
	);
	await expect(page.getByRole('link', { name: 'README.md', exact: true })).toHaveAttribute(
		'href',
		/\/blob\/[0-9a-f]{40}\/README\.md$/,
	);
	const firstTable = page.locator('.markdown-doc table').first();
	await expect(firstTable).toHaveAttribute('tabindex', '0');
	await firstTable.focus();
	await expect(firstTable).toBeFocused();
});

test('homepage actions and guide content follow the site motion preference', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await page.goto('/');
	const homeAction = page.locator('main').getByRole('link', { name: 'Get Started', exact: true });
	await expect(homeAction).toHaveAttribute('href', '/get-started/');
	await expect(page.locator('main').getByRole('link', { name: 'Browse Commands', exact: true })).toHaveCount(0);
	expect(await homeAction.locator('..').evaluate((element) => getComputedStyle(element).animationName)).not.toBe('none');

	await page.goto('/get-started/');
	const guideContent = page.locator('main > .max-w-prose');
	expect(await guideContent.evaluate((element) => getComputedStyle(element).animationName)).not.toBe('none');

	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.reload();
	expect(await guideContent.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});

test('getting started distinguishes and copies terminal commands and configuration', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => {
			document.documentElement.dataset.copiedText = text;
		} } });
	});
	await page.goto('/get-started/');
	const snippets = page.locator('[data-shell-snippet]');
	await expect(snippets).toHaveCount(5);
	await expect(page.getByText('Run in terminal', { exact: true })).toHaveCount(4);
	await expect(page.getByText('Add to ~/.zshrc', { exact: true })).toHaveCount(1);
	await expect(snippets.filter({ hasText: 'git clone' }).locator('[data-shell-prompt]')).toHaveText('$');
	await expect(snippets.filter({ hasText: 'source "$HOME/.config/zsh/init.zsh"' }).locator('[data-shell-prompt]')).toHaveCount(0);
	const copyButtons = snippets.getByRole('button', { name: /^Copy/ });
	await expect(copyButtons).toHaveCount(5);
	if ((page.viewportSize()?.width ?? 0) < 640) {
		for (const button of await copyButtons.all()) {
			const box = await button.boundingBox();
			expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
			expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
		}
	}

	const cloneSnippet = snippets.filter({ hasText: 'git clone' });
	const copyClone = cloneSnippet.getByRole('button', { name: 'Copy clone command', exact: true });
	await expect(cloneSnippet).toHaveAttribute('data-copy-ready', 'true');
	await copyClone.click();
	await expect(page.locator('html')).toHaveAttribute(
		'data-copied-text',
		'git clone https://github.com/Thundernirmal/zsh.git "$HOME/.config/zsh"',
	);
	await expect(cloneSnippet.getByRole('status')).toHaveText('Copied to clipboard');

	const configSnippet = snippets.filter({ hasText: 'source "$HOME/.config/zsh/init.zsh"' });
	await configSnippet.getByRole('button', { name: 'Copy Zsh configuration', exact: true }).click();
	await expect(page.locator('html')).toHaveAttribute(
		'data-copied-text',
		'if [ -r "$HOME/.config/zsh/init.zsh" ]; then\n  source "$HOME/.config/zsh/init.zsh"\nfi',
	);
	await expect(configSnippet.getByRole('button', { name: 'Copied to clipboard', exact: true })).toBeVisible();
});

test('getting started reports a blocked clipboard and keeps the command selectable', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {
			throw new Error('Clipboard blocked');
		} } });
	});
	await page.goto('/get-started/');
	const zdoctorSnippet = page.locator('[data-shell-snippet]').filter({ hasText: 'zdoctor' });
	await zdoctorSnippet.getByRole('button', { name: 'Copy zdoctor command', exact: true }).click();
	await expect(zdoctorSnippet.getByRole('status')).toHaveText('Could not copy; select the snippet manually.');
	await expect(zdoctorSnippet.getByText('zdoctor', { exact: true })).toBeVisible();
});

test('reading links are visually distinct without hover', async ({ page }) => {
	await page.goto('/get-started/');
	const inlineLink = page.getByRole('link', { name: 'zdoctor', exact: true });
	const navigationLink = page.getByRole('link', { name: 'Browse Commands', exact: true });
	for (const link of [inlineLink, navigationLink]) {
		const styles = await link.evaluate((element) => {
			const style = getComputedStyle(element);
			const parentStyle = getComputedStyle(element.parentElement as HTMLElement);
			return {
				color: style.color,
				parentColor: parentStyle.color,
				decoration: style.textDecorationLine,
			};
		});
		expect(styles.decoration).toContain('underline');
		expect(styles.color).not.toBe(styles.parentColor);
	}
	expect((await inlineLink.boundingBox())?.height ?? Infinity).toBeLessThanOrEqual(32);
});

test('mixed commands show one command-level mutation caution and concise subcommand synonyms', async ({ page }) => {
	await page.goto('/commands/?command=function%3Aupkg');
	const command = page.locator('[data-command="upkg"]');
	await expect(command.locator('[data-command-caution]')).toHaveCount(1);
	await expect(command.locator('[data-example-caution]')).toHaveCount(0);
	await expect(command.getByText('Some subcommands change stored data or packages. Check the selected operation before running.', { exact: true })).toHaveCount(1);
	await expect(command.getByText('Also known as: check, list', { exact: true }).filter({ visible: true })).toHaveCount(1);
});

test('collapsed command rows keep static reference links inline', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/commands/');
	const command = page.locator('[data-command="upkg"]');
	const trigger = command.locator('[data-slot="accordion-trigger"]');
	const commandName = trigger.locator('span[translate="no"]').first();
	const chevron = trigger.locator('[data-slot="accordion-trigger-icon"]:visible');
	const reference = command.getByRole('link', { name: 'Read upkg reference', exact: true });
	await expect(reference).toHaveAttribute('href', '/commands/upkg/');
	await expect(reference).toHaveAttribute('title', 'Read upkg reference');
	await expect(reference).toHaveCSS('border-top-style', 'solid');
	expect(await reference.evaluate((element) => getComputedStyle(element, '::before').content)).toContain('Reference ↗');
	const layout = await Promise.all([command.boundingBox(), trigger.boundingBox(), commandName.boundingBox(), chevron.boundingBox(), reference.boundingBox()]);
	const [commandBox, triggerBox, commandNameBox, chevronBox, referenceBox] = layout;
	expect(commandBox).not.toBeNull();
	expect(triggerBox).not.toBeNull();
	expect(commandNameBox).not.toBeNull();
	expect(chevronBox).not.toBeNull();
	expect(referenceBox).not.toBeNull();
	expect(commandBox?.height ?? Infinity).toBeLessThanOrEqual(88);
	expect(referenceBox?.y ?? -1).toBeGreaterThanOrEqual(triggerBox?.y ?? 0);
	expect((referenceBox?.y ?? Infinity) + (referenceBox?.height ?? 0)).toBeLessThanOrEqual(
		(triggerBox?.y ?? 0) + (triggerBox?.height ?? 0),
	);
	expect(Math.abs(
		(referenceBox?.y ?? 0) + (referenceBox?.height ?? 0) / 2
		- ((chevronBox?.y ?? 0) + (chevronBox?.height ?? 0) / 2),
	)).toBeLessThanOrEqual(2);
	expect(Math.abs(
		(referenceBox?.y ?? 0) + (referenceBox?.height ?? 0) / 2
		- ((commandNameBox?.y ?? 0) + (commandNameBox?.height ?? 0) / 2),
	)).toBeLessThanOrEqual(2);

	await page.setViewportSize({ width: 390, height: 844 });
	await page.reload();
	expect(await reference.evaluate((element) => getComputedStyle(element, '::before').content)).toContain('Docs ↗');
	const mobileLayout = await Promise.all([command.boundingBox(), trigger.boundingBox(), commandName.boundingBox(), chevron.boundingBox(), reference.boundingBox()]);
	const [mobileCommandBox, mobileTriggerBox, mobileCommandNameBox, mobileChevronBox, mobileReferenceBox] = mobileLayout;
	expect(mobileCommandBox?.height ?? Infinity).toBeLessThanOrEqual(140);
	expect(mobileReferenceBox?.width ?? 0).toBeGreaterThanOrEqual(44);
	expect(mobileReferenceBox?.height ?? 0).toBeGreaterThanOrEqual(44);
	expect(mobileReferenceBox?.y ?? -1).toBeGreaterThanOrEqual(mobileTriggerBox?.y ?? 0);
	expect((mobileReferenceBox?.y ?? Infinity) + (mobileReferenceBox?.height ?? 0)).toBeLessThanOrEqual(
		(mobileTriggerBox?.y ?? 0) + (mobileTriggerBox?.height ?? 0),
	);
	expect(Math.abs(
		(mobileReferenceBox?.y ?? 0) + (mobileReferenceBox?.height ?? 0) / 2
		- ((mobileChevronBox?.y ?? 0) + (mobileChevronBox?.height ?? 0) / 2),
	)).toBeLessThanOrEqual(2);
	expect(Math.abs(
		(mobileReferenceBox?.y ?? 0) + (mobileReferenceBox?.height ?? 0) / 2
		- ((mobileCommandNameBox?.y ?? 0) + (mobileCommandNameBox?.height ?? 0) / 2),
	)).toBeLessThanOrEqual(2);
});

test('filtered and expanded reference states have no accessibility violations', async ({ page }) => {
	await page.goto('/commands/?q=upkg&type=function&cat=packages&command=function%3Aupkg');
	await expect(page.locator('[data-command="upkg"] [data-slot="accordion-content"]')).toBeVisible();
	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
});

test('reference text reflows at 200% sizing and a 320px viewport', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await page.goto('/commands/upkg/');
	await page.addStyleTag({ content: 'html { font-size: 200%; }' });
	await expect(page.getByRole('heading', { level: 1, name: 'upkg' })).toBeVisible();
	const widths = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
	expect(widths.content).toBeLessThanOrEqual(widths.viewport);
	await expect(page.locator('main').getByRole('link', { name: 'lib/functions-upkg.zsh', exact: true })).toBeVisible();
});
