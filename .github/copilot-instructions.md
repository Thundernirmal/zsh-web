# Repository Instructions

## Required workflow

- Use Node.js 22.12 or newer and npm 9.6.5 or newer.
- Install the lockfile exactly with `npm ci`.
- If the host injects `npm_config_allow_scripts`, unset it and `NPM_CONFIG_ALLOW_SCRIPTS` for project-scoped install or audit commands; `package.json` owns the reviewed install-script policy.
- Run the complete gate with `npm run verify` before handing off changes.
- Use `npm run sync` only when the Zsh source or extractor contract changes; it is the only project command expected to rewrite `src/data/*.json`.
- `npm run dev`, `npm run check`, and `npm run build` consume committed data and must not modify tracked files.

## Architecture

- This is a static Astro site with React islands. `src/layouts/Layout.astro` owns the shared navigation, footer, skip link, and only page-level `<main>` landmark.
- Route files in `src/pages/` own data imports and pass serializable records to interactive islands:
  - `SearchCommands.tsx` handles command search, type filtering, detail expansion, highlighting, and URL state.
  - `TipsExplorer.tsx` handles tip search, category filtering, progressive reveal, highlighting, and URL state.
  - `TipRoulette.tsx` owns the Framer Motion random-tip interaction.
- Shared extractor-facing types and label formatting live in `src/lib/shell-docs.ts`. Keep this contract aligned with `scripts/extract.mjs` and both JSON datasets.
- Prefer Astro for static structure. Add React only when client-side state or interaction is required.

## Extractor contract

- `scripts/extract.mjs` reads `~/.config/zsh` or `ZSH_CONFIG_DIR`.
- It builds command records from `65-help.zsh`, validates catalogue entries against `GUIDE.md`, checks each entry against an implementation, and extracts tips from `80-tips.zsh`.
- `npm run sync:check` performs the same extraction in memory and fails if either committed dataset differs.
- Missing source files are an error for both sync modes; static builds do not invoke the extractor.

## UI conventions

- Reuse the checked-in shadcn components and semantic tokens in `src/styles/global.css`.
- Preserve URL parameters: commands use `q`, `type`, and `command`; tips use `q` and `cat`.
- Do not nest page landmarks inside the layout's `<main>`.
- Keep keyboard focus visible, controls labeled, counts tabular and baseline-aligned, identifiers marked `translate="no"`, and reduced-motion behavior intact.
- Keep examples attached to the feature they demonstrate and suppress examples that merely repeat a command or usage line.
