---
title: "Installation and requirements"
description: "Set up your shell and check the tools it needs."
---

## Setup and scope

The repository is expected at `~/.config/zsh` because `init.zsh` loads modules from that fixed location. Clone it into an empty target directory:

```sh
git clone https://github.com/Thundernirmal/zsh.git "$HOME/.config/zsh"
```

Add this near the end of `~/.zshrc`:

```zsh
if [ -r "$HOME/.config/zsh/init.zsh" ]; then
  source "$HOME/.config/zsh/init.zsh"
fi
```

Source it after Oh My Zsh when these aliases and functions should override framework defaults. Without a framework, run `compinit` before the snippet so Tab completion registers:

```zsh
autoload -Uz compinit && compinit -i
```

Reload and verify with:

```zsh
exec zsh
$HOME/.config/zsh/scripts/check-deps.sh
zdoctor
```

The shared layer manages:

- Zsh options and history defaults
- aliases, global aliases, and shell functions
- guarded zoxide, fzf, Nix, and Secret Service integrations
- lightweight completion styles and command-specific completions
- terminal UI helpers, `zhelp`, and `tips`

It does not manage:

- framework or plugin installation
- prompt configuration
- machine-local PATH entries
- `compinit` startup
- non-Zsh shells

Unreadable module files are skipped. The optional credential module is skipped entirely when `secret-tool` is absent at startup. Either silence means a degraded shell without an error, so run `zdoctor` when a feature is missing: it reports install location, unreadable modules, completion readiness, tool availability, glyph settings, and integration status, and returns nonzero while a real failure is present.

## Dependencies

Run the checker after installing or changing tools:

```sh
$HOME/.config/zsh/scripts/check-deps.sh
```

### Required for the intended setup

| Command | Used for |
|---|---|
| `zsh` | Shell and module syntax |
| `git` | Git helpers and `fbr` |
| `curl` | `weather`, `headers`, and `myip` |
| `ss` | `ports` |
| `lsd` | Preferred file listing |
| `zoxide` | `z` and `zi` navigation |
| `fzf` 0.68.0+ | Keybindings and every fuzzy picker |

`fzf` must report a stable numeric version. Missing, malformed, prerelease, and older builds fail the dependency check and hard-block fuzzy workflows.

If the distribution package is older than 0.68.0, upgrade through a current package source or use the [official fzf installation instructions](https://github.com/junegunn/fzf#installation), then restart the shell and rerun `scripts/check-deps.sh`. There is no reduced UI for 0.60–0.67.

### Optional integrations and fallbacks

| Command | Effect when present | Fallback or absence behavior |
|---|---|---|
| `bat` | Highlighted `cat` alias, `peek`, and file previews | `peek` uses `cat`; fzf previews use `sed` |
| `tree` | `lt` and directory previews when `lsd` is absent | Preview uses `ls`; `lt` is unavailable without `lsd` or `tree` |
| `fd` / `fdfind` | Faster `ff` search | GNU `find` |
| `rg` | Faster `ft` content search | Recursive `grep` |
| `checkupdates` (pacman-contrib) and `fakeroot` | Fresh Pacman inventory in a private database | Absent helper uses labelled cached `pacman -Qu`; a present helper that cannot refresh fails with its native diagnostic |
| `setsid` (util-linux) | Isolated captured package queries | Queries report a missing prerequisite; other commands remain available |
| `jq` | `npkg refresh`, `npkg outdated`, and Nix pickers | Those workflows are unavailable; basic Nix commands still work |
| `secret-tool` | Defines `cgm` | The entire module is skipped |
| `gdbus` | Explicit `cgm check` backend health probe | Health check explains the missing GLib tool; storage and loading still work |
| `nix` | Defines `npkg` and the `upkg` Nix backend | Nix commands are absent |
| `nix-collect-garbage` | `upkg clean --only nix` | Nix cleanup reports a failure |
| `unzip`, `unrar`, `7z`, and related tools | Format-specific extraction | `extract` reports the missing tool when used |

`checkupdates` requires `fakeroot`; on Arch, install both with `sudo pacman -S pacman-contrib fakeroot`. The dependency checker reports missing `fakeroot` when Pacman and checkupdates are present. A failed fresh query remains a failure rather than silently switching to cached data.

Package managers are detected at runtime; they are not setup dependencies. The checker reports the primary optional integrations, while format-specific unpackers and ordinary GNU userland tools are checked only by the workflows that need them.

On Debian and Ubuntu, the distribution may expose `bat` as `batcat`. This repository looks specifically for `bat`, so install a package that provides that command or add a deliberate local wrapper.
