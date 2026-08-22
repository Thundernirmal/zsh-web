# AGENTS.md

Conventions for AI agents working here that the code alone doesn't reveal. `README.md` owns architecture, commands, and quality checks — read it first.

## Toolchain versions move as one unit

Node/npm versions live in four places: `.nvmrc`, `.node-version`, `package.json#engines`, and the requirements line in `README.md`. Bump all four in the same commit. CI installs Node from `.nvmrc`, and `.npmrc` sets `engine-strict=true`, so an out-of-sync engines field breaks installs for everyone downstream of you.

## One commit, one concern

A commit message describes every behavior change the commit makes — reversions included. Before committing, diff the staged work against your intent so a fix doesn't silently restore older values (an icon-swap commit once reverted a hydration directive and URL-param validation without a word in its message).

## Hydration strategy is load-bearing

`SearchCommands` and `TipsExplorer` hydrate with `client:visible` by design (defers JS until the island enters the viewport). Treat any hydration-directive change as a standalone perf decision: own commit, stated rationale, e2e confirmed green — the Playwright specs poll for hydration with `expect.poll` before interacting, so keep that pattern when touching them.

## Budgets and coverage for interactive changes

`npm run budget` gates payload and DOM size in `npm run verify`; CI enforces it too. Raising a limit in `scripts/check-budget.mjs` is a deliberate perf decision: own commit, stated rationale. New interactive behaviors ship with e2e tests that exercise them for real — a selector that matches nothing passes typecheck, so assert on actual focus/DOM outcomes.

## Category taxonomy has one source

`src/lib/categories.ts` owns category order, labels, styles, icons, and CSS tokens; `categoryTokens` derives alias→token mappings from the styles themselves, so aliases stay in lockstep automatically. Consume these exports everywhere UI renders categories; register new categories there only.

Astro client scripts reach the taxonomy through serialized data attributes (see `TipRoulette.astro`) because importing `categories.ts` into a script bundle would pull lucide-react into a non-React page. `src/lib/shell-docs.ts` is type-only plus pure functions and is safe to import client-side.

## Fonts

Fontsource variable-font CSS (`wght.css`) already ships `font-display: swap`; preload fonts through the imports in `Layout.astro`. Skip hand-written `@font-face` duplicates.

## Pull requests

The PR body lists every user-facing change the diff ships, so a reviewer can map each body line to commits and back. Features beyond the stated goal get their own bullet or their own PR.

## Before pushing

Run `npm run verify` for static checks and `npm run test:e2e` for UI changes.
