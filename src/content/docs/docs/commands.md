---
title: "Command discovery and helpers"
description: "Command discovery and helpers from Nirmal's shared Zsh configuration."
---

## Command discovery

### zhelp

`zhelp` searches the repository's public functions and important aliases:

```zsh
zhelp                  # interactive palette, or a plain list
zhelp package          # search all catalogue fields
zhelp upkg             # exact command record
zhelp --all npkg       # include unavailable commands
zhelp --plain file     # stable text for a pipe or log
zhelp --help
```

The default result set hides commands that cannot run in the current shell. `--all` includes them and shows the missing requirement. A plain listing that hides entries says how many are unavailable and points at `zhelp --all`. Exact names show usage, an example, and live availability.

The catalogue also carries action entries for multi-step workflows: `upkg-plan` (inventory updates), `npkg-remove` (remove a Nix package), and `cgm-env` (load credentials) resolve through their parent command, so they disappear together when the parent is unavailable.

In the palette, Enter places the selected example in the editable command buffer. It does not evaluate or execute the text. A CLI query only seeds the picker's search text; the whole eligible catalogue stays browsable, so clearing the query broadens results instead of trapping the selection in the pre-filtered rows. Piped or redirected search keeps the deterministic substring filter. Ctrl+P toggles the responsive usage preview, Ctrl+/ toggles preview word wrapping, and Escape closes the palette without changing the buffer. When fzf or a suitable terminal is unavailable, `zhelp` uses plain output and does not invoke a blocked fzf binary.

Sourcing `65-help.zsh` registers only a fixed repository-local loader. The catalogue, availability checks, and any subprocesses are deferred until `zhelp` is called; command completion loads catalogue data only when zhelp completion is invoked.

### tips

`tips` prints one short hint:

```text
tip: Run mkcd <dir> to create and enter a directory
```

It is on demand and installs no prompt or command-cycle hook. Its fixed repository-local catalogue is loaded on first use, so environment-dependent tips reflect the shell state at that first call. Manager-specific reminders require that manager; the checkupdates reminder also requires Pacman and fakeroot. Credential reminders require the optional `cgm` function. Run it again for another hint.

### zdoctor

`zdoctor` checks the setup and reports problems without changing anything:

```zsh
zdoctor              # local checks only
zdoctor --network    # also probe the myip and weather endpoints
zdoctor --secrets    # also check secret-tool (values are never retrieved)
zdoctor --help
```

It covers the fixed install location, unreadable modules, `compinit` readiness, required and optional tool availability and the fzf version (minimum 0.68.0), glyph resolution, and integration state for fzf, zoxide, `cgm`, `npkg`, and global aliases. Network endpoints and Secret Service stay untouched unless the matching flag is passed. The exit status is nonzero while any failure is present; warnings alone keep it zero.

A recorded blocked fzf integration is a failure even when its binary version is supported; the diagnostic preserves the block reason. Repair that problem and restart the shell. Ready integration passes. An unchecked integration is reported as a note: command-mode shells intentionally skip prompt integration, so run `zdoctor` in a normal interactive shell to check it. Diagnosis never initializes fzf, regenerates integration, edits its cache, or changes widgets.

## Function reference

### General helpers

| Command | Purpose |
|---|---|
| `extract [--keep] [--destination <dir>] <archive>` | Unpack a supported archive |
| `mkcd <dir>` | Create a directory and enter it |
| `ff [options] <pattern> [path]` | Find names case-insensitively |
| `ft [options] <pattern> [path]` | Search file contents |
| `peek <file>` | Preview with `bat` or `cat` |
| `headers <url>` | Follow redirects and print HTTP headers |
| `fanprofile` | Show the current Linux platform or ASUS fan profile |
| `dusage [path] [count]` | Rank immediate entries by disk usage |
| `bigfiles [path] [count]` | Rank files recursively |
| `ports` | Show listening sockets and owning processes |
| `myip` | Show the public IP over HTTPS |
| `path` | Print PATH entries |
| `croot` | Change to the current Git repository root |
| `gitcount` | Show non-merge commit counts by contributor |
| `fkill [--all] [signal]` | Select processes and send a signal |
| `fbr` | Select a branch; enter its worktree or check it out |
| `zdoctor [--network] [--secrets]` | Diagnose setup and integration status |

#### extract

Supported suffixes are `.tar.gz`, `.tar.bz2`, `.tar.xz`, `.tar.zst`, `.zip`, `.rar`, `.7z`, `.gz`, `.bz2`, `.Z`, `.tar`, `.tbz2`, `.tgz`, and `.tzst`. Format-specific commands are checked when invoked, so a missing unpacker produces a direct error. Bare `.gz`, `.bz2`, and `.Z` files retain native in-place behavior by default, which usually removes the compressed input after success. Use `extract --keep file.gz` to preserve it, or `extract --destination existing-dir archive.tar.gz` to choose an existing destination. Empty or missing destination values are rejected before extraction. A destination implies keep-input for bare compressed files; those outputs are published only after successful decompression and refuse existing paths. Multi-file archives retain the unpacker's native overwrite and archive-path policies. Input symlinks are passed to the native unpacker without resolving their targets; gzip refuses them for default in-place or `--keep` extraction. Destination streaming can read a compressed input link, retains its target, and names the output from the supplied link filename. Use `--` before a leading-dash filename.

#### ff and ft

`ff` prefers `fd`, then `fdfind`, then `find`. It matches a case-insensitive substring glob, includes hidden entries, and follows symlinks by default on every backend. `--no-hidden` and `--no-follow` disable those behaviors; `--hidden` and `--follow` make the defaults explicit. `--no-ignore` includes fd-ignored files. The find fallback has no ignore-file filtering and explains that difference when `--no-ignore` is requested.

`ft` prefers `rg`, whose defaults exclude hidden and ignored files and do not follow symlinks. Use `--hidden`, `--no-ignore`, `--follow`, and `--fixed-strings` (`-F`) explicitly. The recursive grep fallback skips binary files, already searches hidden/ignored files, maps `--follow` to `grep -R`, and supports fixed strings. It explains redundant hidden/ignore flags. Backend defaults differ; use explicit flags for broad searches. Both helpers preserve backend error messages on stderr and the native exit status, so inaccessible paths or invalid patterns cannot silently look like an empty result.

```zsh
ff --no-ignore config .
ft --hidden --no-ignore --fixed-strings 'a.b' src
extract --keep -- file.gz
```

Text search uses automatic color for clean redirected output. General helpers accept `-h`/`--help` before work; usage errors return 1. Use `--` to end option parsing in `extract`, `ff`, and `ft`.

`headers`, `myip`, and `weather` use 5-second connection and 15-second overall timeout budgets. Override them with positive integer `ZSH_HTTP_CONNECT_TIMEOUT` and `ZSH_HTTP_MAX_TIME` settings. Zero is rejected. Curl failures preserve the exit status and add a command-specific diagnostic.

#### fanprofile

`fanprofile` reads the standard Linux `/sys/firmware/acpi/platform_profile` interface when available. On older ASUS/TUF systems it falls back to `fan_boost_mode`:

| Raw value | Profile |
|---|---|
| `0` | `normal` |
| `1` | `overboost` |
| `2` | `silent` |

The command reports state only; it does not change the profile.

#### dusage, bigfiles, and path

`dusage` includes hidden immediate children and defaults to 20 rows. `bigfiles` searches recursively and also defaults to 20. Both preserve readable results when another entry or subtree cannot be measured, but they report `Incomplete scan (<tool> exit <code>); results are partial` on stderr, mark the rich dashboard with a warning and `(incomplete scan)` footer, and return nonzero. A clean scan still returns 0.

`path` preserves empty PATH components. In command lookup, an empty component means the current directory; rich output labels it `.`, while plain output preserves an empty line.

All three commands apply the safe-text contract described in [Terminal output modes](/docs/themes/#terminal-output-modes).

#### ports and myip

`ports` uses `ss -tulnp`. Process details can be limited by system permissions. `myip` queries `https://ifconfig.me/ip`. Both use rich dashboards only in capable terminals.

#### fkill and fbr

`fkill` requires a terminal and defaults to `SIGTERM` (`15`), allowing graceful shutdown. Numeric and named forms are normalized, so `15`, `-15`, `TERM`, and `SIGTERM` all select the same signal. Invalid signals fail before the picker opens. The list shows PID, owner, elapsed time, and command with a preview of full details and working directory; it covers the current user's processes unless `--all` is given. A single SIGTERM sends immediately, while SIGKILL or a multi-selection names the targets and signal for confirmation first. Each kill reports its own outcome, and no privilege escalation is attempted. Pass `9` only when force is necessary:

```zsh
fkill
fkill SIGTERM
fkill 9
fkill --all 15
```

`fbr` lists local and remote branches by recent commit and previews the log. Its branch and relative-date display columns use fixed terminal-cell widths, so subjects begin in one stable column even when branch names differ; wide CJK characters count as two cells and Unicode nonspacing and format marks as zero. Committed Unicode 16.0 intervals load on first non-ASCII measurement and use pure-Zsh binary search. Emoji grapheme shaping and ambiguous-width characters remain terminal-dependent. Long values are visibly truncated without changing the hidden canonical ref returned by Enter. Branch/tag name collisions and local/remote namespace collisions do not affect selection, preview, upstream comparison, or worktree lookup. Symbolic remote HEAD aliases are omitted; actual branches ending in `/HEAD` remain selectable. A local branch registered to another Git worktree has a prominent `[WT]` badge immediately before its branch name and includes the worktree path later in the row; the current checkout is intentionally unmarked. The badge is coloured in capable terminals and remains plain text otherwise. Selecting a marked branch changes the current shell to its worktree path. A remote selection enters that worktree only when the local branch tracks the selected remote. Other selections keep the checkout behavior: a remote branch creates a tracking branch when no local branch with the same short name exists. When a same-named local branch exists but does not track the selected remote, `fbr` refuses to switch and explains the three safe moves: enter the local branch, track the remote under a new name, or inspect the remote detached. The picker footer reads `Enter worktree/checkout` to reflect both outcomes.
