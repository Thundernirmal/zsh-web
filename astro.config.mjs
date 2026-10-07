// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://zsh.nirmalkatariya.com',
	output: 'static',
	integrations: [react(), sitemap()],
	markdown: {
		// Plain code markup inherits the site's audited terminal palette and keeps
		// the long guide substantially smaller than a span-per-token highlighter.
		syntaxHighlight: false,
	},
	prefetch: {
		prefetchAll: false,
		defaultStrategy: 'hover',
	},
	vite: {
		plugins: [tailwindcss()],
		build: {
			rolldownOptions: {
				output: {
					// A shared chunk makes controller caching structural: Astro cannot
					// inline importing entry points, regardless of component filenames.
					codeSplitting: { groups: [{ name: 'docs', test: (id) => id.includes('/src/components/docs/') && id.endsWith('.ts') }] },
				},
			},
		},
		// Discover router dependencies before the first request so late
		// optimization does not invalidate the dev toolbar's module URLs.
		optimizeDeps: {
			include: [
				'astro/virtual-modules/transitions-events.js',
				'astro/virtual-modules/transitions-router.js',
				'astro/virtual-modules/transitions-swap-functions.js',
				'astro/virtual-modules/transitions-types.js',
			],
		},
	},
});
