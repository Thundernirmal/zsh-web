---
title: "Maintenance and verification"
description: "Maintenance and verification from Nirmal's shared Zsh configuration."
editUrl: false
---

## Module layout

`init.zsh` sets the shared options, then sources modules in this order:

| Module | Responsibility |
|---|---|
| `10-history.zsh` | Shared 100,000-entry history |
| `20-aliases.zsh` | Navigation, file, and Git aliases |
| `25-theme.zsh` | Semantic palette registry, validation, color depth, glyphs, and reusable fzf presentation fragments |
| `30-zoxide.zsh` | Guarded zoxide initialization and `zi` fzf gate |
| `40-fzf.zsh` | fzf validation, secure integration cache, structured presentation, previews, and bindings |
| `50-completion.zsh` | Lightweight global completion styles |
| `55-ui-helpers.zsh` | Rich terminal rendering and plain fallbacks |
| `60-functions.zsh` | Fixed lazy registrations for general helpers, session-only `ztheme`, `upkg`, optional `npkg`, and `zdoctor` |
| `62-cgm.zsh` | Optional Secret Service credential manager |
| `65-help.zsh` | Fixed lazy-loader registration for `zhelp` |
| `66-compdefs.zsh` | Command-aware completion definitions |
| `70-globals.zsh` | Global pipe and redirection aliases |
| `80-tips.zsh` | Fixed lazy-loader registration for hook-free, on-demand tips |

The numbered filenames define load order. `50-completion.zsh` assumes an earlier layer already ran `compinit`; `66-compdefs.zsh` becomes a silent no-op when `compdef` is unavailable.

The repo-local `functions/ztheme`, `functions/_fbr_format_entry`, `lib/functions-*.zsh`, `lib/command-registry.zsh`, `lib/ui-width-data.zsh`, `lib/theme-*.zsh`, `lib/help-catalogue.zsh`, and `lib/tips-catalogue.zsh` files are lazy implementation helpers rather than startup modules. The fbr row formatter requires an explicit canonical branch reference and rejects malformed identities. Their numbered modules register fixed loaders, while general command implementations, package workflows, command-only swatch/export logic, catalogues, fbr row formatting, palette data, validation, and color conversion code are parsed on first use. `lib/upkg-registry.zsh` is instead a lightweight registry sourced during startup by `60-functions.zsh` and reused by `66-compdefs.zsh` when `compdef` is available. A configured custom or colored non-default startup loads the theme pieces it needs before composing finder options.

Captured package queries execute the fixed trusted `lib/query-supervisor.zsh` entrypoint; its allowed callbacks and helper sources stay inside the repository.

General helpers load their fixed domain on first use: files/search, system diagnostics/network, Git, package orchestration/backend adapters, or Nix. Shared presentation fallbacks load once. Calling `mkcd` or `path` leaves package implementations unloaded; later calls use installed implementations directly. All paths remain fixed beneath the repository. Disk scanners collect records plus explicit state, diagnostics, and exit status before choosing a rich or plain renderer; both preserve partial-scan failures. `lib/command-registry.zsh` is data-only and shared by help and command-name completion; it records canonical names and descriptive mutation categories without authorizing any operation.

## Maintenance and verification

### Documentation ownership

Keep each surface at one level:

| Surface | Owns |
|---|---|
| `README.md` | Purpose, five-minute setup, requirements summary, and links |
| `GUIDE.md` | Full behavior, examples, dependencies, safety boundaries, and gotchas |
| `lib/help-catalogue.zsh` | One-line command discovery, usage, example, and availability |
| `lib/tips-catalogue.zsh` | Short, actionable reminders for user-facing actions only |

Completed design plans and audits are retained in Git history; use this guide for current behavior.

When user-facing behavior changes, update every affected surface without copying long explanations between them.

### Editing rules

- Startup-time dependency guards use `(( $+commands[tool] ))`.
- Guards inside functions use `command -v ... >/dev/null 2>&1` so PATH changes and test stubs are visible.
- Keep external integrations guarded and preserve fallbacks.
- Keep `50-completion.zsh` lightweight and `80-tips.zsh` hook-free.
- Never add a plaintext CGM fallback, value-retrieving completion, or `eval`-based secret export.
- Treat aliases in `20-aliases.zsh` as high-impact changes.

Nix attribute completion reuses parsed names in the current session while each cache file’s device, inode, size, and modification time match. Replacing, adding, or removing cache files is reflected on the next completion. It never refreshes the index over the network.

### Required checks

Run the repository-owned ordered sequence:

```sh
zsh scripts/run-tests.zsh
```

The runner owns the syntax checks, regression suites, and fixed-install-path smoke test used by CI. Maintainers can regenerate width intervals with `python3 scripts/generate-width-data.py`; review the recorded Unicode version when doing so. A separate CI job runs `python3 scripts/test-fzf-pty.py` against real fzf 0.68.0 and 0.74.3. It covers shared picker arguments and actual `fbr` with one/two branches across all three layouts at 50/80/99/100/101/110/120 columns, including initial row visibility, filtering, preview toggles, and live resizing. Normal selection changes detached HEAD to the chosen branch; worktree selection changes directory; cancellation preserves the starting state. Unicode/ASCII, `NO_COLOR`, multi-selection, and measured frame sizing at 12/16/24 terminal rows are also checked. Preview-free widget/completion frame sizing is exercised through exported defaults; host keybinding and completion wiring remains part of manual QA. Run that command locally with Python 3 and supported fzf installed; set `FZF_BIN` to test another binary. Each PTY case isolates HOME, cache storage, and host finder options, including `FZF_DEFAULT_OPTS_FILE`; a hostile-options self-check covers both harnesses. These checks use fixture rows and perform no package mutations. `skills-lock.json` records maintainer skill provenance and is not a runtime dependency or package-manager lockfile.

The environment check is optional because it reflects the current machine rather than repository correctness:

```sh
$HOME/.config/zsh/scripts/check-deps.sh
```

For a full stable-release manual pass, use the ignored `qa-features.csv` checklist described in [`AGENTS.md`](https://github.com/Thundernirmal/zsh/blob/1133c8493dfa67427e4684231a84e534f599198f/AGENTS.md).
