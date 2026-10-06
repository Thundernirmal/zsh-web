// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import starlight from '@astrojs/starlight';
import { guideTopics } from './scripts/docs-guide.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://zsh.nirmalkatariya.com',
	output: 'static',
	integrations: [react(), sitemap(), starlight({
		title: "Nirmal's Shell",
		description: 'The source-backed guide to Nirmal’s shared Zsh configuration.',
		favicon: '/favicon.svg',
		disable404Route: true,
		expressiveCode: false,
		customCss: ['./src/styles/starlight.css'],
		components: {
			Head: './src/components/docs/Head.astro',
			PageTitle: './src/components/docs/PageTitle.astro',
			ThemeProvider: './src/components/docs/Empty.astro',
			ThemeSelect: './src/components/docs/Empty.astro',
		},
		sidebar: [
			{ label: 'Guide', items: [{ label: 'Overview', link: '/docs/' }, ...guideTopics.map((topic) => ({ label: topic.title, link: `/docs/${topic.slug}/` }))] },
			{ label: 'Reference', items: [
				{ label: 'Commands', link: '/commands/' },
				{ label: 'Tips', link: '/tips/' },
				{ label: 'Get started', link: '/get-started/' },
				{ label: 'Troubleshooting', link: '/troubleshooting/' },
			{ label: 'Home', link: '/' },
			] },
		],
		social: [{ icon: 'github', label: 'Source configuration', href: 'https://github.com/Thundernirmal/zsh' }],
	})],
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
