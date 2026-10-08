---
title: "Shell basics"
description: "History, completion, aliases, and everyday shortcuts."
---

## Shell options and history

### Options set by init.zsh

| Option | State | Behavior |
|---|---|---|
| `AUTO_PUSHD` | on | Every directory change pushes the previous directory |
| `PUSHD_IGNORE_DUPS` | on | The directory stack omits duplicates |
| `PUSHD_SILENT` | on | Stack changes do not print automatically |
| `EXTENDED_GLOB` | on | Enables Zsh glob qualifiers and exclusions |
| `GLOB_DOTS` | off | Ordinary globs exclude leading-dot entries |
| `NUMERIC_GLOB_SORT` | on | `file2` sorts before `file10` |
| `CORRECT` | off | Command spell-correction prompts are disabled |
| `NO_BEEP` | on | The terminal bell is suppressed |
| `INTERACTIVE_COMMENTS` | on | `#` starts a comment on an interactive command line |

Hidden files require an explicit opt-in:

```zsh
print -rl -- *        # visible entries
print -rl -- *(D)     # visible and hidden entries
print -rl -- **/*(D)  # recursive, including hidden entries
```

Useful extended-glob examples:

```zsh
print -rl -- **/*.js
print -rl -- *(.m-1)
print -rl -- *(Lk+100)
```

### Directory stack

```zsh
cd /etc
cd /var/log
dirs -v
cd ~1
popd
```

Because `AUTO_PUSHD` is active, ordinary `cd` participates in this stack.

### History

| Setting | Value or state |
|---|---|
| `HISTFILE` | `~/.zsh_history` |
| `HISTSIZE` / `SAVEHIST` | `100000` |
| `APPEND_HISTORY` | on |
| `SHARE_HISTORY` | on |
| `HIST_IGNORE_ALL_DUPS` | on |
| `HIST_FIND_NO_DUPS` | on |
| `HIST_IGNORE_SPACE` | on |
| `HIST_REDUCE_BLANKS` | on |

History is shared across open shells. Commands beginning with a space are omitted, duplicate search results are suppressed, and redundant spaces are reduced before saving.

## Completion

The global layer is intentionally small:

- case-insensitive filename and command matching
- repeated slash cleanup
- process details for `kill <Tab>`

Command-specific completion covers the complete public command set:

```zsh
upkg      npkg       cgm        ztheme     zhelp      tips
extract   peek       mkcd       ff         ft         headers
dusage    bigfiles   fkill      fbr        croot      path
ports     myip       gitcount   fanprofile
```

`npkg` and `cgm` are registered only when their optional commands are available. The definitions understand subcommands, aliases, manager lists, archive suffixes, directories, counts, URLs, and signals. `npkg` completion may read an existing attribute cache, and `cgm` completion reads the name-only catalogue. Pressing Tab never runs Nix, refreshes a cache, contacts Secret Service, or retrieves a credential value.

If the parent `~/.zshrc` has not run `compinit`, command-specific completion is not registered. Heavy menu selection, grouped listings, and global coloured completion lists are intentionally omitted because they made completion noticeably slower.

## Aliases

### Navigation

| Alias | Expansion |
|---|---|
| `..` | `cd ..` |
| `...` | `cd ../..` |
| `....` | `cd ../../..` |
| `-` | `cd -` |

### File operations and viewing

| Alias | Behavior |
|---|---|
| `ls` | `lsd`, otherwise a guarded `ls` colour form |
| `ll` | Long listing including hidden entries and readable sizes |
| `la` | Listing including hidden entries |
| `lt` | Tree to depth 3; defined only with `lsd` or `tree` |
| `cat` | `bat --style=numbers --paging=never` when `bat` is present |
| `grep` | Adds `--color=auto` on Linux |
| `diff` | Adds `--color=auto` on Linux |

Under the zero-probe startup policy, the built-in `ls`, `ll`, and `la` fallbacks and the `grep` and `diff` aliases add automatic color only on Linux. On macOS and BSD they keep the corresponding plain command behavior rather than running capability probes while the shell starts. `lsd`, when installed, remains the preferred listing backend on every platform where it is available.

### Git extras

| Alias | Expansion |
|---|---|
| `glog` | `git log --oneline --graph --decorate -20` |
| `gpr` | `git pull --rebase` |
| `gun` | `git reset HEAD~1 --soft` |
| `gcount` | `gitcount` |

`gcount` deliberately replaces the conflicting Oh My Zsh alias when this layer is sourced afterward.

### Weather

`weather` runs a concise forecast request over HTTPS:

```zsh
weather
```

It is a lazy function using curl over HTTP/1.1 and does not implement a location argument. `weather --help` prints usage without making a request.

### Global aliases

Global aliases are opt-in because unquoted tokens such as `H`, `T`, `G`, and `L` expand anywhere in a command line. For example, with aliases enabled, an interactively parsed `echo H` behaves as `echo | head`; a filename or search term can become shell syntax. They stay undefined by default. Personal users who want the previous behavior preserve it with one setting before startup:

```zsh
export ZSH_GLOBAL_ALIASES=1  # in ~/.zshrc, before sourcing init.zsh
```

Quote a token to keep it literal (`echo 'H'` prints `H`). When disabled, `zhelp` lists these entries as unavailable rather than offering them:

| Alias | Expansion | Example |
|---|---|---|
| `G` | `\| grep` | `git log G fix` |
| `L` | `\| less` | `git diff L` |
| `W` | `\| wc -l` | `ps aux W` |
| `H` | `\| head` | `dmesg H` |
| `T` | `\| tail` | `cat app.log T` |
| `NE` | `2>/dev/null` | `optional-command NE` |
| `NUL` | `>/dev/null 2>&1` | `noisy-command NUL` |
