---
title: "Gotchas and safety"
description: "Gotchas and safety from Nirmal's shared Zsh configuration."
---

## Gotchas and safety boundaries

These are the cross-cutting rules most likely to surprise a new user:

1. **The install path is fixed.** `init.zsh` loads `$HOME/.config/zsh/*.zsh`. A clone elsewhere needs a symlink or a deliberate code change. Run `zdoctor` to confirm the location and catch silently skipped modules.
2. **Source order matters.** Source this layer after frameworks when its aliases should win. `~/.zshrc` itself is not versioned here.
3. **File operations keep native semantics.** `mkdir`, `cp`, `mv`, and `rm` are not redefined. Add flags deliberately and keep real backups; shell prompts are not a backup strategy.
4. **Interactive flags are situational.** If you opt into `-i`, remember that later flags such as `-f` can override it. Review the final command line before destructive operations.
5. **Ordinary globs exclude dotfiles.** Use `*(D)` only when hidden entries are intentional. In contrast, `ff` and `dusage` explicitly include hidden entries by design.
6. **Leading-space history is convenience, not secret storage.** `HIST_IGNORE_SPACE` reduces accidental persistence but does not protect process arguments, logs, terminal capture, or already-shared history.
7. **Global aliases are opt-in and expand anywhere.** They stay undefined unless `ZSH_GLOBAL_ALIASES=1` is exported before startup. Once enabled, unquoted tokens such as `G` or `NUL` can change a command far from its first word. Quote literal occurrences.
8. **An empty PATH component means the current directory.** `path` preserves and exposes it because silently normalizing PATH would change command lookup.
9. **Completion needs compinit.** Without `compdef`, command-specific completion quietly does nothing. Run `zdoctor` to confirm readiness.
10. **fzf is all-or-nothing at 0.68.0+.** An unsupported build blocks fuzzy workflows instead of enabling a reduced theme or partial bindings. Plain `zhelp` remains available.
11. **Theme choice is machine-local.** `ztheme use` changes only the current shell, and `ztheme export` prints settings without editing `.zshrc`. This repository does not theme the prompt, terminal, tmux, editor, `bat`, Git, or `LS_COLORS`.
12. **Ctrl+R does not execute the selection.** It inserts history into the command buffer for review and editing.
13. **`fkill` defaults to SIGTERM.** `fkill 9` is a force-kill and should be the exception.
14. **CGM is startup-optional.** Installing `secret-tool` mid-session does not define `cgm` until the module is sourced again or the shell restarts.
15. **CGM changes only the current shell.** Run `env`, `unset`, and `delete` directly, not through a pipe, command substitution, or subshell. Deletion cannot revoke values inherited by existing processes.
16. **Package previews can write caches.** Default checks, search, plan, and cleanup previews avoid package installation/removal but may use network access or write manager metadata. Upgrade and cleanup mutate package or cache state; preview cleanup with `clean --dry-run`.
17. **`--sudo` authorizes but does not auto-confirm.** Native package-manager and polkit prompts remain authoritative.
18. **Inventories have limits.** APT and Paru repository queries use cached metadata; Pacman refreshes a separate database when `checkupdates` is available, and DNF may refresh expired metadata. Native upgrades resolve transactions. `npkg` reports output identity rather than version ordering.
19. **Partial package results fail.** `upkg` continues other managers but returns nonzero for partial, failed, or blocked selected backends. `npkg` returns nonzero when any row is unknown.
20. **Rich output is presentation.** Use a pipe, redirect, `NO_COLOR`, or an explicit plain option for stable machine-readable text.
21. **The target platform is GNU/Linux.** `ss`, GNU flags, sysfs profile paths, and several `find`/`du` flows are Linux-oriented.
22. **Network helpers contact external services.** `weather` requests `wttr.in`, `myip` requests `ifconfig.me`, and `headers` contacts the URL supplied by the user.
23. **Automation must load the layer explicitly.** Aliases and functions are interactive shell features; scripts should call real binaries or source `init.zsh` inside Zsh.
24. **Helper failures stay on stderr.** Successful data remains pipeable on stdout; usage errors, missing dependencies, and invalid paths do not contaminate command substitutions.
25. **Leading-dash inputs are data.** File helpers normalize archive paths, directory helpers terminate options, and package search backends separate wrapper flags from query terms.
