import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { guideTopics } from '../../src/lib/guide-topics.mjs';

// axe audits the DOM and computed styles, which match across engines, so
// these run in the desktop and mobile Chromium projects only.
const siteRoutes = ['/', '/commands/', '/tips/', '/404.html', '/commands/upkg/', '/get-started/', '/docs/', ...guideTopics.map((topic) => `/docs/${topic.slug}/`), '/troubleshooting/'];

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

test('filtered and expanded reference states have no accessibility violations', async ({ page }) => {
	await page.goto('/commands/?q=upkg&type=function&cat=packages&command=function%3Aupkg');
	await expect(page.locator('[data-command="upkg"] [data-slot="accordion-content"]')).toBeVisible();
	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
});
