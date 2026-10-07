# Nirmal's Shell

A searchable Astro reference for the aliases, functions, tips, and workflows in [Nirmal Katariya's Zsh config](https://github.com/Thundernirmal/zsh).

The site is published at [zsh.nirmalkatariya.com](https://zsh.nirmalkatariya.com).

## How the data stays in sync

The extractor reads the local Zsh source directory (`~/.config/zsh` by default), validates every registered command against `GUIDE.md` and its implementation, and writes the committed frontend datasets:

- `src/data/commands.json`, built from `lib/command-registry.zsh`, aliases, globals, and domain function documentation
- `src/data/tips.json`, built from `lib/tips-catalogue.zsh` with inferred categories, sources, and availability
- `src/content/docs/docs/*.md`, partitioned from `GUIDE.md` into a custom guide overview and ten topic pages, with repository-relative links pinned to the source commit
- `src/data/docs-links.json`, mapping legacy guide heading links to their new topic pages
- `src/data/docs-search.json`, the guide text index fetched only when a reader enters a search query
- `src/data/source.json`, recording the clean shell commit, source commit date, and extractor schema version; CI checks out this exact revision

To update the snapshot, commit shell changes, run `npm run sync`, review all generated changes, and commit them together. The sync date is the source commit date so repeated generation is deterministic. The manually dispatched **Update shell snapshot** workflow accepts a shell ref, regenerates data, runs `npm test`, and uploads a `shell-snapshot-patch` artifact. Review the patch, apply it locally with `git apply`, and commit the generated data through the normal review process. The workflow has read-only repository permissions.

Set `ZSH_CONFIG_DIR` when the source config is elsewhere.

```bash
ZSH_CONFIG_DIR=/path/to/zsh npm run sync
```

`npm run sync` is the only project command that rewrites generated data. Astro Content Collections load the committed JSON through Zod schemas, providing build-time validation while keeping local and Cloudflare builds deterministic.

## Local development

Requires Node.js 22.22.3+ within the 22.x line, 24.16.0+ within 24.x, or 26.3.0+, and npm 10.9.2 or newer. `.nvmrc` and `.node-version` pin 22.22.3 for development and CI; `package.json#engines` declares the dependency-compatible supported range. Keep these declarations and this requirements line in sync when bumping.

```bash
npm ci
npm run sync
npm run dev
```

If a hosted shell injects `npm_config_allow_scripts` and npm reports `EALLOWSCRIPTS`, remove that host override for the install. The repository's reviewed esbuild approval remains in `package.json`:

```bash
env -u npm_config_allow_scripts -u NPM_CONFIG_ALLOW_SCRIPTS npm ci
```

Open the URL printed by Astro. To preview a production build:

```bash
npm run build
npm run preview
```

## Quality checks

Run the complete static and browser test suite before committing:

```bash
npm test
```

Install browser binaries once with `npx playwright install chromium firefox webkit` (CI also installs OS dependencies with `--with-deps`).

On other Linux distributions, Playwright may use Ubuntu browser builds. On Fedora, `sudo dnf install x264-libs` supplies the codec validation dependency when the configured repositories provide it. ABI-compatible ICU 74 and JPEG 8 libraries from Ubuntu's official archive can be kept in `~/.cache/ms-playwright/host-dependencies/lib` and linked into WebKit's bundled `sys/lib` folders. Refresh these links when installing a new WebKit build. This keeps compatibility libraries in the browser cache without replacing Fedora system libraries.

The ESLint 10 accessibility rules use an explicit peer override because `eslint-plugin-jsx-a11y` still declares support through ESLint 9. Lint and the browser accessibility suite validate this combination. The site imports `shadcn/tailwind.css` from its development dependency, so shared UI variants follow package updates rather than a manually maintained copy. `components.json` retains the Base UI Nova configuration for the generator.

The current shadcn CLI dependency tree reports seven high-severity audit entries rooted in the unpatched [braces stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). These dependencies belong to the development generator; the website imports its CSS and does not bundle the CLI. Recheck the advisory when updating shadcn; do not force npm's suggested downgrade to shadcn 1.x or describe the dependency audit as clean until a compatible fix is available.

For the faster static validation gate without Playwright:

```bash
npm run verify
```

`npm run verify` verifies that generated data matches the current Zsh sources, runs ESLint and accessibility rules, checks for unused files, dependencies, and exports, runs Astro/TypeScript diagnostics, produces the static site, and enforces route HTML/DOM plus transitive JS/CSS/font budgets. `npm run budget` counts all reachable font subsets conservatively, rather than assuming a particular browser font selection. `npm test` additionally runs shared behavior and accessibility checks plus desktop Chromium/Firefox and mobile Chromium/WebKit Playwright suites. Browser tests include expanded/filter/error states, 320px reflow at 200% text sizing, and a Chromium CPU/network-constrained performance check. Physical-device Safari remains a manual release check.

Individual commands:

| Command | Purpose | Writes tracked files |
| --- | --- | --- |
| `npm run test:extract` | Run parser and semantic regression tests | No |
| `npm run sync` | Regenerate the Zsh reference datasets and guide | Yes |
| `npm run sync:check` | Confirm generated reference and guide match Zsh sources | No |
| `npm run lint` | Lint JavaScript, TypeScript, React, and Astro | No |
| `npm run lint:fix` | Apply safe ESLint fixes | Possibly |
| `npm run dead-code` | Find unused files, dependencies, and exports | No |
| `npm run check` | Run Astro and TypeScript diagnostics | No |
| `npm run build` | Type-check and build `dist/` | No tracked files |
| `npm run verify` | Run every required check and build | No tracked files |
| `npm run test:e2e` | Build and run desktop and mobile Playwright projects | No tracked files |
| `npm test` | Run static verification and the full Playwright matrix | No tracked files |

## Architecture

- Astro static pages with React islands for the route-critical search and filtering interfaces
- Custom Astro documentation under `/docs/`, using the shared site layout, topic cards, responsive navigation, section outlines, previous/next links, and on-demand guide search
- Astro-native, on-demand tip roulette with no React hydration cost
- Zod-validated Astro Content Collections backed by generated JSON
- A branded static `404.html` route for static hosting platforms
- shadcn/ui Base UI primitives with the Nova style
- Tailwind CSS v4 and Catppuccin Mocha semantic tokens
- TypeScript strict mode
- Static `dist/` output for Cloudflare Pages

Cloudflare Pages should use `npm run build` as the build command and `dist` as the output directory. The deployment environment does not need access to the private local Zsh source directory because generated JSON is committed.

Documentation renders through `Layout.astro`, sharing the site's header, footer, font loading, and Catppuccin tokens. `DocsLayout.astro` adds a desktop topic sidebar, a native mobile disclosure, inline search, and the existing Markdown reading styles. `src/lib/guide-topics.mjs` owns topic order and section ownership, shared by extraction and navigation. Unknown or missing source sections fail sync, and obsolete generated topic files are removed during sync. Edit the shell guide and this map rather than the generated Markdown. Old `/docs/#heading` links retain query parameters and map to their topic heading; without JavaScript they reveal a native link to the destination. The overview replaces the former full guide page.

Guide search fetches `/docs-search.json` only after a nonempty query, reuses the loaded index between topics, and works in both development and production. Query URL writes are coalesced to at most one per second while typing and flushed before link navigation or Enter. Every edit is also saved in tab-local session storage under a unique history-entry identity, so separate document loads cannot overwrite each other's query and immediate reload and Back/Forward restore the complete query while browser history throttling cannot stop filtering. New navigations use their explicit URL query. `/` or Ctrl/Cmd+K focuses search; Escape and Clear reset it. Failed index loading stays idle while typing and has an explicit retry that returns focus to the search input. The full JSON index and docs JavaScript are budgeted separately. Guide controllers share one cacheable chunk selected by their module directory, keeping topic HTML small; the desktop navigation and native mobile disclosure have their final states before scripts load. No documentation framework, React island, or search service is required for the guide. Budget checks follow statically named assets, including literal backtick paths; interpolated asset paths fail with an actionable diagnostic.
