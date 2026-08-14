// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://zsh.nirmalkatariya.com',
	integrations: [react()],
	prefetch: true,
	vite: {
		plugins: [tailwindcss()],
	},
});
