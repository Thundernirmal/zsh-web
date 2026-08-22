import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'desktop-chrome',
			testMatch: ['**/core.spec.ts', '**/desktop.spec.ts'],
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'mobile-chrome',
			testMatch: ['**/core.spec.ts', '**/mobile.spec.ts'],
			use: { ...devices['Pixel 7'], viewport: { width: 320, height: 800 } },
		},
	],
	webServer: {
		command: `ASTRO_PREVIEW_BACKGROUND=0 astro preview --host 127.0.0.1 --port ${port}`,
		url: `http://127.0.0.1:${port}`,
		reuseExistingServer: false,
		timeout: 30_000,
	},
});
