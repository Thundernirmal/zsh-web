---
title: "Package workflows"
description: "Check, search, upgrade, and clean with upkg."
---

## Package manager: upkg

`upkg` detects supported managers each time it runs and provides one interface for package inventories, search, upgrades, and manager-owned cleanup. Checks, searches, plans, and cleanup previews do not install or remove packages, but native queries may contact the network, update metadata, or write caches; they are not filesystem-read-only or guaranteed offline.

### Detection

The active order is:

1. one distro backend: `paru`, otherwise `pacman`, otherwise `apt`, otherwise `dnf`;
2. `brew`;
3. `flatpak`;
4. Nix through `npkg`;
5. global `npm`.

All other installed distro backends remain available through `--only <id>`. For example, `--only dnf` works even when APT is also installed. Defaults still run only the first available distro backend; `upkg managers` lists the alternatives.

### Commands

| Command | Behavior |
|---|---|
| `upkg` | Package update inventory |
| `upkg outdated` / `check` / `list` | Same package update inventory |
| `upkg search <query>` | Search selected managers |
| `upkg plan` | Inventory available updates without resolving a transaction |
| `upkg upgrade` / `up` / `update` | Run selected upgrades |
| `upkg clean` | Remove unused packages and manager-owned caches |
| `upkg managers` | Show active managers and alternates |
| `upkg help` | Show command help |

### Flags

| Flag | Behavior |
|---|---|
| `--only <ids>` / `--only=<ids>` | Run only comma-separated manager IDs |
| `--skip <ids>` / `--skip=<ids>` | Exclude comma-separated manager IDs |
| `--sudo` | Authorize privileged distro upgrade or cleanup paths |
| `--dry-run` | Inventory updates for upgrade, or preview cleanup |

Supported IDs are `apt`, `dnf`, `pacman`, `paru`, `brew`, `flatpak`, `nix`, and `npm`. `--only` preserves the order supplied by the user. Empty or whitespace-only values and empty IDs between, before, or after commas in `--only` and `--skip` are rejected before any backend runs; an empty variable never expands the operation to every manager.

`plan` and `upgrade --dry-run` run outdated queries. Their output explicitly identifies an update inventory: dependencies, replacements, removals, and conflicts are resolved later by the native upgrade command. Review the native transaction before confirming, especially APT `full-upgrade`, which may remove packages. Inventory and upgrade can also use different metadata snapshots.

### Check and upgrade backends

| Manager | Outdated check | Upgrade |
|---|---|---|
| `apt` | `apt list --upgradable` | `apt -o APT::Update::Error-Mode=any update`, then `apt full-upgrade` |
| `dnf` | `dnf check-update` | `dnf upgrade --refresh` |
| `pacman` | `checkupdates --nocolor` when available; otherwise cached `pacman -Qu` | `pacman -Syu` |
| `paru` | `paru -Qu` (configured scope) | `paru -Syu` |
| `brew` | `brew outdated` | `brew upgrade` |
| `flatpak` | `flatpak remote-ls --updates --all` | `flatpak update` |
| `nix` | `npkg outdated` | `npkg upgrade` |
| `npm` | `npm outdated -g --depth=0 --json=false --parseable=false --color=false` | `npm update -g` |

DNF `check-update` supports both DNF4 and DNF5 and returns native status `100` for available updates, which the wrapper treats as a successful inventory. It may refresh expired metadata; the upgrade explicitly forces fresh metadata with `--refresh`. Unprivileged checks and privileged upgrades may use different caches.

APT refresh treats every repository error, including transient fetch errors, as a failure and stops before `full-upgrade`; correct the repository/network issue and rerun the command.

`apt`, `dnf`, and `pacman` upgrade paths require root or explicit `--sudo`. Paru also requires the explicit flag, but runs unprefixed so Paru controls privilege escalation. Homebrew and npm always remain unprefixed; an unwritable npm global prefix blocks the upgrade with a user-space setup hint.

npm inventories explicitly select an uncolored table, overriding inherited JSON and parseable output preferences. Registry, authentication, and global-prefix settings remain native npm configuration. Empty successful output means up to date; unrecognized nonempty output fails the inventory. Native diagnostics remain on stderr. npm status 1 with a recognized table and only `npm warn`/`npm WARN` or `npm notice` diagnostics means updates available; error or unrecognized diagnostics keep that result failed.

Flatpak inventories include hidden update refs through `--all`, including installed locale/debug extensions and supported secondary architectures. The native default user/system installation scope is retained; a remote-change inventory does not resolve the eventual update transaction.

The Nix bridge retains partial-check state and keeps evaluation diagnostics on stderr. The Nix outdated and plan paths require `jq`; Nix upgrade does not. Nix cleanup depends on `nix-collect-garbage`, not `jq`.

`upkg` never auto-confirms native prompts. It does not inject `-y`, `--assumeyes`, `--noconfirm`, or `sudo` without the explicit authorization flag.

### Search behavior

Search accepts multiple words and passes them as separate query arguments:

```zsh
upkg search ripgrep
upkg search ripgrep --only=nix
upkg search ripgrep viewer --only=brew,npm
```

Results are normalized into one table with manager, package, available version, and a cheap native description when available. Search parsers use stdout records only; native warnings and errors stay on stderr and never become package rows or descriptions. Flatpak empty tab-separated fields keep their position. npm search recognizes publication dates and versions across layouts with omitted descriptions/authors or empty keywords. Arch search disables color, and npm search explicitly selects uncolored parseable output regardless of inherited JSON settings. DNF search keeps the native no-match diagnostic enabled (no `-q`) and runs in the C locale with color disabled, separates diagnostics from package data, validates `name.arch` rows, and accepts the native DNF4 and DNF5 no-match results. A no-match result is summarized once. Search summaries count attempted managers, including failures and cancellations, and retain earlier results when interrupted. Managers not started after cancellation are not counted. Backend failures name the affected managers, and other managers continue.

Nix search uses native `--quiet` to suppress evaluation progress while preserving warnings and errors. See the [Nix logging options](https://nix.dev/manual/nix/2.34/command-ref/new-cli/nix3-search.html#logging-related-options). Nix search works directly in a fresh shell when `nix` is installed; running `npkg` first is unnecessary.

Homebrew formulae and casks are queried separately; only stdout candidates are sent to metadata lookup, whose diagnostics also stay separate. Broad searches cap follow-up metadata calls at 50 formulae and 50 casks; refine the query when the cap warning appears.

### Cleanup policy

`upkg clean` is mutating. Use `upkg clean --dry-run` first.

| Manager | Unused phase | Cache or store phase |
|---|---|---|
| `apt` | `apt autoremove` | `apt autoclean` |
| `dnf` | `dnf autoremove` | `dnf clean all` |
| `pacman` | remove the non-empty `pacman -Qtdq` orphan array with `pacman -Rs --` | `pacman -Sc` |
| `paru` | `paru -c` | `paru -Sc` |
| `brew` | `brew autoremove` | `brew cleanup` |
| `flatpak` | `flatpak uninstall --unused --user`, then `--system` | handled by the uninstall pruning |
| `nix` | none | `nix-collect-garbage` |
| `npm` | remove explicit keys from `npm cache npx ls` | `npm cache verify` |

DNF `clean all` removes all repository cache data, including metadata and cached RPMs that are still valid. Later commands may need to download that data again; cached RPMs will no longer be available for offline reuse. This is broader than removing stale cache entries.

Pacman orphan-query status 1 counts as empty only with empty stdout and no diagnostics other than native warnings in the C locale. Database errors or unrecognized diagnostics fail that phase; successful cache cleanup still reports a partial result. Cleanup uses manager-owned commands. It does not directly delete cache directories, application data, project files, lockfiles, virtual environments, build output, user configuration, or Nix profile generations. It does not claim a portable reclaimed-byte total.

Dry-run uses native probes where safe. Steps without a safe unprivileged simulation are printed as `would run` and are not invoked. A preview never calls `sudo` or requires `--sudo`.

Nix cleanup removes unreachable store objects without generation-deletion flags, preserving rollback history. Flatpak cleanup does not pass `--delete-data`. npm cleanup never uses the keyless, forced whole-cache removal form; old npm releases without the npx cache subcommands still run `npm cache verify` and report a partial result.

Flatpak updates and system cleanup may request authorization through polkit. User and system cleanup are attempted as separate phases.

### Results and exit status

Cancelled cleanup summaries retain completed and failed phase counts, earlier failure details, and the interrupted phase. The interrupted phase is counted as cancelled rather than failed.

Tab completion describes `--dry-run` as an update inventory or cleanup preview, matching the shared flag reference.

Search progress is cleared when each query finishes, before diagnostics, cancellation returns, or the final summary.

Multi-manager runs continue after an ordinary backend failure. Cancellation stops the remaining managers and cleanup phases, preserving status `130` (INT), `143` (TERM), or `129` (HUP):

| State | Meaning |
|---|---|
| `up to date` | A complete outdated check found no changes |
| `updates available` | A complete check found changes |
| `cleaned` | Every requested cleanup phase succeeded |
| `planned` | A cleanup preview completed successfully |
| `partial` | Some phases succeeded and others failed |
| `cancelled` | A backend was interrupted; subsequent operations were stopped |
| `failed` | Required work or a preview probe failed |
| `blocked` | Authorization or a required capability was missing |
| `skipped` | A filter intentionally omitted the manager |

Query diagnostics stay on stderr and are kept separate from package rows; a warning alone never counts as an available update. Arch status-1 checks with diagnostics remain failures rather than being treated as an empty successful check.

Rich summaries count cancelled backends separately from failed backends and retain the cleanup operation layout.

A partial, failed, or blocked selected backend makes the aggregate command return nonzero.

APT checks use existing local metadata.

Pacman checks prefer optional `checkupdates` from `pacman-contrib`, refreshing a private, per-call database that is removed afterward. Refresh failures remain failures; there is no silent fallback to cached success. Without that helper, the output and summary explicitly identify cached repository data. Paru keeps its native configured query and labels repository versions as cached. For a separate fresh repository inventory, run `checkupdates` directly; never run `pacman -Sy` alone just to preview updates. Repository version queries do not resolve replacements; review the native `-Syu` transaction. Cached `pacman -Qu` and native `paru -Qu` accept status `1` as an empty inventory only when both stdout and stderr are empty; `checkupdates` status `1` remains an error.

Paru queries and upgrades honor its configured package scope (`Mode`, `AurOnly`, `RepoOnly`, and PKGBUILD repositories) and configured pacman command. The wrapper does not force AUR or repo mode. Development-package commit checks follow Paru’s `Devel` setting; enable it in `paru.conf` when wanted.

The native contracts are documented in the [DNF4 command reference](https://dnf.readthedocs.io/en/latest/command_ref.html), [DNF5 manual](https://dnf5.readthedocs.io/en/latest/dnf5.8.html), [Paru manual](https://github.com/Morganamilo/paru/blob/master/man/paru.8), and [checkupdates manual](https://man.archlinux.org/man/checkupdates.8.en).

### Examples

```zsh
upkg
upkg search ripgrep
upkg search ripgrep --only=nix
upkg managers
upkg managers --only=npm,flatpak
upkg plan --only=brew,npm
upkg upgrade --sudo --only=apt
upkg clean --dry-run
upkg clean --only=brew,npm
upkg clean --sudo --only=apt
```
