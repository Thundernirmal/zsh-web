# Nirmal's Shell

A living guide to aliases, functions, tips, and workflows from Nirmal Katariya's shell environment. 

Hosted at [zsh.nirmalkatariya.com](https://zsh.nirmalkatariya.com).

## Overview

This project automatically generates a searchable, web-accessible documentation site directly from a set of structured Zsh configuration files. It uses a custom Node.js extractor to parse shell scripts and feeds them into a fast, statically-built Astro application styled with the Catppuccin Mocha dark theme.

## Architecture

- **Framework:** Astro + React islands
- **Styling:** Vanilla CSS + Catppuccin Mocha theme tokens
- **Data Source:** Extracted at build-time from `~/.config/zsh/*.zsh`
- **Deployment:** Cloudflare Pages (Static Export)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Extract latest shell data (requires `~/.config/zsh/` to exist locally):
   ```bash
   node scripts/extract.mjs
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

This site is optimized for Cloudflare Pages. 

- **Build Command:** `npm run build` (Ensure `scripts/extract.mjs` runs before or as part of the build if dynamic extraction is needed in CI)
- **Output Directory:** `dist`

*Note: In a CI/CD environment, you may need to commit `src/data/*.json` if the raw `~/.config/zsh/` files are not available in the build container.*
