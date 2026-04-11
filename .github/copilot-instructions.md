# Copilot Instructions

## Commands

- Use **Node >= 22.12.0** (`package.json` engines)
- Install dependencies: `npm install`
- Start local dev server: `npm run dev`
- Build static site: `npm run build`
- Preview the built site: `npm run preview`
- Run Astro/TypeScript diagnostics: `npm run astro -- check`
- Regenerate shell data manually: `node scripts/extract.mjs`
- There is currently **no dedicated test runner or lint script** in `package.json`, so there is no single-test command yet

## High-level architecture

- This repo is a **static Astro site with React islands**. `src/layouts/Layout.astro` provides the shared page shell (global CSS import, nav, footer, skip link, and the only page `<main>`).
- The route files in `src/pages/*.astro` are intentionally thin. They load JSON data and mount the interactive parts with `client:load`.
  - `src/pages/index.astro` renders the home page and mounts `TipRoulette.tsx`
  - `src/pages/commands.astro` mounts `SearchCommands.tsx`
  - `src/pages/tips.astro` mounts `TipsExplorer.tsx`
- Interactive filtering/search lives in the React islands, not in Astro:
  - `SearchCommands.tsx` handles command search, type filters, highlighting, and URL sync
  - `TipsExplorer.tsx` handles tip search, category filters, progressive reveal, and URL sync
  - `TipRoulette.tsx` is the only Framer Motion-driven interaction
- The app is driven by **committed JSON data in `src/data/`**. The site does not regenerate data during `npm run build`; builds use whatever is already in `src/data/commands.json` and `src/data/tips.json`.
- `scripts/extract.mjs` is the bridge from local Zsh config (`~/.config/zsh/*.zsh`) into `src/data/*.json`. Deployment is static (`dist` output, intended for Cloudflare Pages), so CI may need committed JSON when those local Zsh files are unavailable.

## Key conventions

- **Treat `src/data/*.json` as the frontend contract.**
  - `src/data/commands.json` currently contains rich command objects (`name`, `type`, and optional `command`, `description`, `category`, `source`)
  - `src/data/tips.json` currently contains objects shaped like `{ "text": string, "category": string }`
- **Do not trust `scripts/extract.mjs` to match the current UI schema without checking.** The current extractor is simpler than the committed data shape, so extractor changes and UI/data-shape changes need to be updated together.
- Reuse the shared CSS system in `src/styles/global.css` instead of adding new page-specific one-offs:
  - page shell: `page-header`, `page-title`, `page-subtitle`
  - surfaces: `panel*`, `surface-list*`
  - search: `search-field*`, `search-wrapper`, `search-count`
  - motion: `animate-in*`
- Prefer **Astro for static structure** and **React islands only for stateful UI**. If a feature is just presentation, keep it in `.astro`; if it needs client-side filtering/search/animation, it belongs in a component island.
- Preserve the existing **URL-synced filters**:
  - commands page uses `q` and `type`
  - tips page uses `q` and `cat`
  Both islands update the URL with `window.history.replaceState`, so new filters should follow that pattern.
- Do not introduce nested page landmarks. `Layout.astro` already owns the page `<main>` and skip-link target.
- Motion should stay lightweight and accessible. Most entrance animation is CSS-based via `animate-in*`; `TipRoulette.tsx` is the only Framer Motion component and already handles reduced-motion behavior.
