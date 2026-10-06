---
title: "Nix profiles and pickers"
description: "Nix profiles and pickers from Nirmal's shared Zsh configuration."
editUrl: false
---

## Nix profile manager: npkg

`npkg` is defined only when `nix` is available. It requires the modern experimental CLI with `nix profile add` and `nix profile upgrade --all`; older CLIs using only `profile install` or wildcard upgrade selectors are unsupported. Check those subcommands with `--help` when installing Nix. It wraps the current `nix profile` with shorter commands and optional pickers while enabling the required `nix-command flakes` features.

### Commands

| Command | Behavior |
|---|---|
| `npkg add <pkg ...>` / `install` / `i` | Add packages |
| `npkg add` | Open the install picker |
| `npkg find [--] [query ...]` / `pick` / `fzf` | Open a seeded install picker |
| `npkg search <query>` / `s` | Plain nixpkgs search |
| `npkg list` / `ls` | List the current profile |
| `npkg remove <pkg ...>` / `rm` / `uninstall` / `delete` | Remove profile elements |
| `npkg remove` | Open the removal picker |
| `npkg outdated` / `check` / `diff` | Compare installed and evaluated outputs |
| `npkg refresh` | Rebuild the attribute-name cache |
| `npkg upgrade [pkg ...]` / `up` / `update` | Upgrade all or selected elements |
| `npkg help` | Show help |

Bare install names become `nixpkgs#<name>`. Flake references, paths, and arguments beginning with `-` pass through without that expansion. Use `nix` directly for advanced flags not represented by the wrapper.

`refresh`, `outdated`/`check`/`diff`, and `find`/`pick`/`fzf` handle `-h` or `--help` before any Nix query, cache access, or picker launch. Help returns zero. Refresh and outdated aliases accept no operands or profile flags; unsupported arguments fail before work. Picker aliases preserve query words, including leading dashes; `--` ends help recognition and is removed from the query, so `npkg find -- --help` searches for the literal word `--help`. A help word before `--` shows usage, even after other query words.

Native `add`/`install`/`i`, `remove` aliases, `list`/`ls`, `search`/`s`, and `upgrade` aliases retain their argument forwarding. Their help flags go to native Nix and can have its normal initialization behavior.

### Picker cache and dependencies

`npkg refresh` and `npkg outdated` require `jq`. Interactive add, find, and remove also require a real terminal and supported fzf.

The attribute cache lives under `${XDG_CACHE_HOME:-$HOME/.cache}/npkg/` and refreshes on install or find picker use after 24 hours. `XDG_CACHE_HOME` is used only when absolute; a relative value falls back to an absolute `$HOME/.cache`. Refreshes build per-call temporary files in the cache directory and publish a complete index atomically, so concurrent or interrupted refreshes do not expose partial data. Building the cache evaluates nixpkgs and can take time or require network access. Tab completion may read an existing cache but never creates or refreshes it. Picker previews evaluate package metadata to show description, version, and homepage; they move below the list when the terminal is narrower than 100 columns. Tab marks multiple packages, and the footer updates the selected count before Enter confirms the add or remove operation.

### Outdated semantics

Explicitly inactive profile elements are excluded from outdated checks and the removal picker; a missing or null activity field retains the default active behavior.

`npkg outdated` compares the complete installed store-path set for each active profile element, including flakes outside nixpkgs with the output set selected by the currently evaluated installable:

| State | Meaning |
|---|---|
| `current` | Installed and evaluated output sets match |
| `change available` | The sets differ |
| `unknown` | Profile data or evaluation is incomplete |

A change is not necessarily an upgrade. It can be a downgrade, rebuild, changed input, output-selection change, or packaging change. Display versions are informational and never determine state.

A complete report containing current or changed rows returns zero. Any unknown row produces a partial summary and nonzero status; only a complete all-current report may say `Everything is up to date.` A profile with no active elements is a complete zero-count result. Active store-path-only entries or entries without an evaluable flake source/attribute are reported as unknown instead of being silently excluded. Pinned flake references remain pinned: `npkg upgrade` cannot advance their revision, and their evaluated identity can correctly remain current. Reinstall from an unlocked reference only when changing that pin is intentional.

For `npkg outdated`, INT, TERM, and HUP stop owned evaluation workers and their descendants, remove temporary files, preserve unrelated background jobs, and return `130`, `143`, and `129` respectively. Captured package queries run in private sessions using `setsid` (util-linux). A trusted supervisor remains alive through group termination and escalation, including children forked during shutdown. It monitors its owner and the original Nix inventory process while queries run and after they finish. Abnormal owner death stops the private group and removes its verified private capture directories; loss of only one Nix worker retains shared batch storage. A missing startup identity fails with status `1` after an approximately three-second handshake budget and shuts down the verified launcher/session. Linux `/proc` verifies the supervisor identity. Failed-startup cleanup uses per-task child lists when readable and falls back to process-stat parent discovery when those optional files are absent, unreadable, empty, malformed, or contain stale identities. Process records and child lists use fixed whitespace independent of the caller’s `IFS`; each child is attributed by parent and start time before cleanup, and subsequent signals require its recorded start identity. Cleanup freezes only the launcher, retaining a proc descriptor for the original task through its identity-checked final termination. Children are never frozen; a child that establishes a private session during shutdown is handled as a group. If access to a child identity is lost, further signals to that child are skipped. Signals sent only to the wrapper are forwarded to its owned session. Shared Nix daemon processes and children that deliberately detach into another session or process group are outside this ownership boundary. The `upkg` Nix bridge consumes the stable internal `current`, `changed`, or `partial` state rather than matching display text.
