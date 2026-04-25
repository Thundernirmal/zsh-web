# Nirmal's Shell

A living guide to aliases, functions, tips, and workflows from Nirmal Katariya's shell environment.

Hosted at [zsh.nirmalkatariya.com](https://zsh.nirmalkatariya.com).

## Overview

This project builds a searchable Astro site directly from the portable Zsh config in `~/.config/zsh`. The extractor reads the live shell sources and regenerates the command and tip datasets used by the site, so the docs stay aligned with the actual setup instead of a hand-maintained copy.

The current config covers:

- aliases and global aliases
- navigation helpers such as `zoxide`, `ff`, `mkcd`, and `croot`
- search and process helpers such as `ft`, `fkill`, and `fbr`
- utility functions such as `dusage`, `bigfiles`, and `peek`
- network helpers such as `headers`, plus the `upkg` package update wrapper, the `npkg` Nix wrapper, and dependency-aware tips

## Architecture

- **Framework:** Astro + React islands
- **Styling:** Vanilla CSS + Catppuccin Mocha theme tokens
- **Data Source:** Extracted from `~/.config/zsh/20-aliases.zsh`, `60-functions.zsh`, `70-globals.zsh`, and `80-tips.zsh`
- **Deployment:** Cloudflare Pages (Static Export)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Sync the generated docs data from the live shell config:
   ```bash
   npm run sync
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

`npm run dev` and `npm run build` both run the extractor first, so a normal dev session or production build starts from the latest `~/.config/zsh` contents.

## Deployment

This site is optimized for Cloudflare Pages.

- **Build Command:** `npm run build`
- **Output Directory:** `dist`

If the deployment environment cannot read `~/.config/zsh`, commit the generated `src/data/*.json` files or provide the shell config inside the build environment.
