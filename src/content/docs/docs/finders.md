---
title: "Navigation and finders"
description: "Navigation and finders from Nirmal's shared Zsh configuration."
editUrl: false
---

## Zoxide and fzf

### Zoxide

When `zoxide` is available at startup, its generated Zsh integration defines `z` and `zi`:

```zsh
z projects
z myapp src
z -l
zi projects
```

`z` performs ranked directory jumps. `zi` uses zoxide's interactive picker but is wrapped by the shared fzf version gate.

Zoxide initialization supports `NO_UNSET` even before `precmd_functions` or `chpwd_functions` exist. If integration loading fails, existing hooks are restored and previously absent hook arrays remain unset. Startup leaves the caller's `NO_UNSET` setting unchanged.

The shared directory theme is exported through zoxide's `_ZO_FZF_OPTS` interface before `zoxide init`, so `zi` and zoxide interactive completion match the generated fzf widgets without replacing zoxide's scoring or candidate generation.

Zoxide's generated shell integration is never evaluated directly. For a new zoxide executable, the configuration writes the output to a private temporary file, validates it with `zsh -fn`, and only then sources it. A validated, owner-only cache under `${XDG_CACHE_HOME:-$HOME/.cache}/zsh/zoxide/` is keyed by the zoxide executable metadata and Zsh version, so warm shells avoid rerunning both generation and validation. If no absolute cache home is available or the cache cannot be created safely, startup uses a temporary validated file instead. A rejected cache directory is never used for publication or failure cleanup; private fallback files are removed after activation.

### fzf requirement and startup

Every fuzzy workflow requires stable `fzf` 0.68.0 or newer. At the first normal prompt for a new fzf executable, the configuration:

1. validates the version;
2. captures non-empty `fzf --zsh` output;
3. syntax-checks the generated Zsh;
4. writes a private integration cache when possible;
5. loads the validated integration and shared theme.

The cache is stored below `${XDG_CACHE_HOME:-$HOME/.cache}/zsh/fzf/` and is keyed by the fzf file identity, Zsh version, and cache schema. A matching cache is reused without launching fzf or a validation shell. Cache files and their directory must be regular, user-owned, non-symlink paths that are not group- or world-writable. A changed executable or PATH selection is validated before use. Removing the `zsh/fzf` directory below the active cache home forces a rebuild.

Failed integration activation restores prior fzf functions, widgets, keymaps, aliases, and finder options, leaving no partial entry points. Restart the shell after fixing a blocked build. Missing, old, prerelease, malformed, or broken builds block only fuzzy workflows and print an actionable diagnostic. Non-interactive sourcing and `zsh -i -c ...` remain silent and do not initialize ZLE bindings.

Finder presentation is compiled separately from the trusted integration cache. Changing theme, layout, glyph mode, terminal width class, or `NO_COLOR` refreshes future launches without rerunning `fzf --version` or regenerating `fzf --zsh`. Existing `FZF_DEFAULT_OPTS`, widget options, completion options, and `_ZO_FZF_OPTS` are captured once and appended after managed presentation. `ZSH_FZF_EXTRA_OPTS` follows the inherited global layer; `--no-color` is always final when requested.

### Keybindings

| Binding | Action |
|---|---|
| Ctrl+T | Select a file or directory and insert its path at the cursor |
| Ctrl+R | Select a history entry and insert it for editing |
| Alt+C | Select a directory and change to it |

Ctrl+T previews directories with `lsd`, `tree`, or `ls`, and files with `bat` or the first 200 lines from `sed`. Ctrl+R previews the full command for the focused row. Every preview picker uses the same Ctrl+P toggle and Ctrl+/ wrap binding, so printable characters such as `?` stay available for searching.

Generated `**<Tab>` completion uses separate general, path, and directory labels through `FZF_COMPLETION_OPTS`, `FZF_COMPLETION_PATH_OPTS`, and `FZF_COMPLETION_DIR_OPTS`. The shared layer does not add a command-agnostic preview or change completion insertion semantics.

Stale fzf widget-name bindings do not block activation; failed activation restores the original bindings.

The shared gate also covers `fkill`, `fbr`, `zi`, the `zhelp` palette, and interactive `npkg` install, find, and remove paths. Every picker uses the same list/search/footer hierarchy and contextual ghost hint. At 100 columns and wider, textual previews sit beside the list; below 100 columns they move underneath. `fkill` and the Nix multi-select pickers show a live selected-item count in the footer. Git and Nix table pickers keep the visible identity column frozen, while `--accept-nth` returns undecorated branch, PID, example, or profile-target fields to the calling workflow; `fbr` returns and previews the canonical full Git ref, separate from its shortened display label and optional `[WT]` badge.

Picker-specific actions are unchanged: Escape and interruption remain non-destructive, `zhelp` only queues text, `fkill` confirms SIGKILL and multi-selections naming targets and signal before sending, `fbr` enters an existing worktree or checks out the branch, and Nix mutations run only after their picker returns selected targets. Under `NO_COLOR`, repository previews avoid forced colour while retaining labels, glyph-independent cues, and interaction.
