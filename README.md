# Nirmal's Shell

A searchable Astro reference for the aliases, functions, tips, and workflows in [Nirmal Katariya's Zsh config](https://github.com/Thundernirmal/zsh).

The site is published at [zsh.nirmalkatariya.com](https://zsh.nirmalkatariya.com).

## How the data stays in sync

The extractor reads the local Zsh source directory (`~/.config/zsh` by default), validates every registered command against `GUIDE.md` and its implementation, and writes the two committed frontend datasets:

- `src/data/commands.json`, built from `65-help.zsh`, aliases, globals, and function documentation
- `src/data/tips.json`, built from `80-tips.zsh` with inferred categories, sources, and availability

Set `ZSH_CONFIG_DIR` when the source config is elsewhere.

```bash
ZSH_CONFIG_DIR=/path/to/zsh npm run sync
```

`npm run sync` is the only project command that rewrites generated data. Development and production builds consume the committed JSON, which keeps local and Cloudflare builds deterministic.

## Local development

Requires Node.js 22.12 or newer and npm 9.6.5 or newer.

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

Run the complete read-only gate before committing:

```bash
npm run verify
```

It verifies that generated data matches the current Zsh sources, runs ESLint and accessibility rules, checks for unused files, dependencies, and exports, runs Astro/TypeScript diagnostics, and produces the static site.

Individual commands:

| Command | Purpose | Writes tracked files |
| --- | --- | --- |
| `npm run sync` | Validate the Zsh catalogue and regenerate JSON | Yes |
| `npm run sync:check` | Confirm committed JSON matches the Zsh sources | No |
| `npm run lint` | Lint JavaScript, TypeScript, React, and Astro | No |
| `npm run lint:fix` | Apply safe ESLint fixes | Possibly |
| `npm run dead-code` | Find unused files, dependencies, and exports | No |
| `npm run check` | Run Astro and TypeScript diagnostics | No |
| `npm run build` | Type-check and build `dist/` | No tracked files |
| `npm run verify` | Run every required check and build | No tracked files |

## Architecture

- Astro static pages with React islands for search, filtering, and the tip roulette
- shadcn/ui Base UI primitives with the Nova style
- Tailwind CSS v4 and Catppuccin Mocha semantic tokens
- TypeScript strict mode
- Static `dist/` output for Cloudflare Pages

Cloudflare Pages should use `npm run build` as the build command and `dist` as the output directory. The deployment environment does not need access to the private local Zsh source directory because generated JSON is committed.
