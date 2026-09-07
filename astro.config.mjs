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
	},
});
