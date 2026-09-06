# Nirmal's Shell

A searchable Astro reference for the aliases, functions, tips, and workflows in [Nirmal Katariya's Zsh config](https://github.com/Thundernirmal/zsh).

The site is published at [zsh.nirmalkatariya.com](https://zsh.nirmalkatariya.com).

## How the data stays in sync

The extractor reads the local Zsh source directory (`~/.config/zsh` by default), validates every registered command against `GUIDE.md` and its implementation, and writes the committed frontend datasets:

- `src/data/commands.json`, built from `lib/command-registry.zsh`, aliases, globals, and domain function documentation
- `src/data/tips.json`, built from `lib/tips-catalogue.zsh` with inferred categories, sources, and availability

- `src/data/source.json`, recording the clean shell commit, source commit date, and extractor schema version; CI checks out this exact revision

To update the snapshot, commit shell changes, run `npm run sync`, review all generated changes, and commit them together. The sync date is the source commit date so repeated generation is deterministic. The manually dispatched **Update shell snapshot** workflow accepts a shell ref, regenerates data, runs `npm test`, and uploads a `shell-snapshot-patch` artifact. Review the patch, apply it locally with `git apply`, and commit the generated data through the normal review process. The workflow has read-only repository permissions.

Set `ZSH_CONFIG_DIR` when the source config is elsewhere.

```bash
ZSH_CONFIG_DIR=/path/to/zsh npm run sync
```

`npm run sync` is the only project command that rewrites generated data. Astro Content Collections load the committed JSON through Zod schemas, providing build-time validation while keeping local and Cloudflare builds deterministic.

## Local development

Requires Node.js 22.14.0 or newer and npm 10.9.2 or newer. The exact versions are pinned in `.nvmrc`, `.node-version`, and `package.json#engines` — keep all four in sync when bumping.

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

For the faster static validation gate without Playwright:

```bash
npm run verify
```

`npm run verify` verifies that generated data matches the current Zsh sources, runs ESLint and accessibility rules, checks for unused files, dependencies, and exports, runs Astro/TypeScript diagnostics, produces the static site, and enforces route HTML/DOM plus transitive JS/CSS/font budgets. `npm run budget` counts all reachable font subsets conservatively, rather than assuming a particular browser font selection. `npm test` additionally runs shared behavior and accessibility checks plus desktop Chromium/Firefox and mobile Chromium/WebKit Playwright suites. Browser tests include expanded/filter/error states, 320px reflow at 200% text sizing, and a Chromium CPU/network-constrained performance check. Physical-device Safari remains a manual release check.

Individual commands:

| Command | Purpose | Writes tracked files |
| --- | --- | --- |
| `npm run test:extract` | Run parser and semantic regression tests | No |
| `npm run sync` | Validate the Zsh catalogue and regenerate JSON | Yes |
| `npm run sync:check` | Confirm committed JSON matches the Zsh sources | No |
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
- Astro-native, on-demand tip roulette with no React hydration cost
- Zod-validated Astro Content Collections backed by generated JSON
- A branded static `404.html` route for static hosting platforms
- shadcn/ui Base UI primitives with the Nova style
- Tailwind CSS v4 and Catppuccin Mocha semantic tokens
- TypeScript strict mode
- Static `dist/` output for Cloudflare Pages

Cloudflare Pages should use `npm run build` as the build command and `dist` as the output directory. The deployment environment does not need access to the private local Zsh source directory because generated JSON is committed.
