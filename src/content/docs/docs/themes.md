---
title: "Themes and terminal output"
description: "Themes and terminal output from Nirmal's shared Zsh configuration."
editUrl: false
---

## Terminal output modes

Dashboards use the shared semantic theme renderer only when all of these are true:

- stdout is a terminal
- `TERM` is set and is not `dumb`
- the locale is UTF-8
- the terminal is at least 60 columns wide
- `NO_COLOR` is unset

Pipes, redirects, narrow terminals, non-UTF-8 locales, and dumb terminals receive deterministic plain text.

| Setting | Effect |
|---|---|
| `ZSH_UI_THEME=terminal` | Select the dashboard palette; built-ins are `catppuccin-mocha`, `catppuccin-latte`, `nord`, `gruvbox-dark`, and `terminal` |
| `ZSH_FZF_THEME=` | Inherit `ZSH_UI_THEME`; set a built-in name or `custom` for an fzf-only override |
| `ZSH_FZF_LAYOUT=compact` | Select the `compact`, `roomy`, or `minimal` finder layout |
| `ZSH_FZF_EXTRA_OPTS=` | Append an intentional final user option layer to shared fzf defaults |
| `ZSH_UI_GLYPHS=auto` | Select `auto`, `nerd`, `unicode`, or `ascii` dashboard and finder glyphs independently of color |
| `ZSH_UI_CUSTOM_COLORS` | Provide all semantic roles as a validated associative array for the `custom` theme |
| `NO_COLOR=1` | Force dashboards to plain output and fzf to its no-color presentation |
| `NO_NERD_FONT=1` | Downgrade Nerd Font tiers to ordinary Unicode without touching color |
| `zhelp --plain` | Force the stable plain help view |

Set theme variables before sourcing `init.zsh`. `terminal` is the default. Invalid names and incomplete or malformed custom palettes fall back to it without evaluating input as shell code. The `terminal` palette prefers terminal-default backgrounds and ANSI accents.

`NO_COLOR` does not disable fuzzy interaction. It removes repository-managed fzf colors, prevents color-forced file previews, and remains the final option even when inherited or extra options request colors.

### Built-ins, color depth, and glyphs

| Theme | Background intent | Notes |
|---|---|---|
| `catppuccin-mocha` | dark | Compatibility palette (former default) |
| `catppuccin-latte` | light | Explicit light-background choice; background brightness is never guessed |
| `nord` | dark | Muted cool palette |
| `gruvbox-dark` | dark | Warm, higher-contrast palette |
| `terminal` | terminal-owned | Default; uses default terminal foreground/background and named ANSI accents |

The fixed palette values are adapted from the MIT-licensed [Catppuccin](https://catppuccin.com/palette/), [Nord](https://github.com/nordtheme/nord), and [Gruvbox](https://github.com/morhetz/gruvbox) projects. The resolver emits RGB when `COLORTERM` is `truecolor` or `24bit`, xterm-256 values when `TERM` contains `256color`, and deterministic ANSI colors otherwise. It uses no terminal query or source-time subprocess.

Glyph selection is independent of palette and color depth. Automatic mode preserves the package and status icons shown by Nerd Fonts in UTF-8 locales; machines without a Nerd Font can opt into ordinary Unicode with `NO_NERD_FONT=1` or `ZSH_UI_GLYPHS=unicode`:

| Mode | Behavior |
|---|---|
| `auto` | Nerd Font icons in UTF-8 locales; ordinary Unicode when `NO_NERD_FONT=1`; ASCII outside UTF-8 |
| `nerd` | Private-use Nerd Font icons plus Unicode structure symbols |
| `unicode` | Ordinary Unicode only, with no private-use glyphs |
| `ascii` | ASCII pointers, markers, separators, and status symbols only |

`NO_NERD_FONT=1` records that the terminal lacks private-use glyphs and downgrades even an explicit `nerd` tier to Unicode. Verify the resolved tier and its sample symbols with `ztheme current` before settling on a mode.

Selection, focus, success, warning, and danger retain text, pointer, marker, label, or status-word cues rather than relying only on color. `NO_NERD_FONT` affects symbols, not color; `NO_COLOR` affects repository-managed color, not picker availability. The no-color options explicitly reset the footer to terminal-default foreground to work around fzf 0.68.0’s incomplete no-color theme.

### Custom palette contract

Define a custom palette before sourcing `init.zsh`, then select it for the shared UI and optionally for fzf:

```zsh
typeset -gA ZSH_UI_CUSTOM_COLORS=(
  base 1e1e2e
  surface 313244
  selected 45475a
  border 6c7086
  gutter 1e1e2e
  text cdd6f4
  muted a6adc8
  accent cba6f7
  query a6e3a1
  match f38ba8
  focus f5e0dc
  info 89b4fa
  success a6e3a1
  warning f9e2af
  danger f38ba8
)
typeset -g ZSH_UI_THEME=custom
typeset -g ZSH_FZF_THEME=''
```

All 15 keys are required, extra keys are rejected, and every value must be exactly six hexadecimal digits without `#`. Validation is atomic: a missing, extra, or malformed value makes startup fall back to the terminal theme rather than partially applying the palette. Theme names and values are data only; the configuration does not evaluate them, source a theme directory, scan the filesystem, or download palettes.

### Finder layout and option precedence

| Layout | Requested frame | Preview at 100+ columns | Preview below 100 columns |
|---|---|---|---|
| `compact` | fixed `60%`, one rounded frame, `0,1` padding | right `50%` | down `40%` |
| `roomy` | fixed `80%`, one rounded frame, `1,2` padding | right `55%` | down `45%` |
| `minimal` | fixed `45%`, one rounded frame, `0,1` padding | right `45%` | down `35%` |

Compact and minimal deliberately use a stable percentage frame rather than shrinking to one- or two-item content. This policy applies to exported defaults for widgets and completions too, and avoids adaptive-height allocation losing rows when a responsive preview moves below the list. The percentages are requests, not exact frame sizes: fzf's default `--min-height=10+` can enlarge them to account for frame controls, and terminal height caps the result. Additional headers, margins, and inherited overrides can change that geometry.

With the default shared frame and a one- or two-item list, the native tests measure these frame heights, both with a below-list preview and with preview-free exported defaults:

| Terminal rows | Compact | Minimal | Roomy |
|---|---|---|---|
| 12 | 12 | 12 | 12 |
| 16 | 14 | 14 | 16 |
| 24 | 14 | 14 | 19 |

These cases retain selectable rows, but a short window can be filled by the frame. There is no visibility guarantee below 12 terminal rows or with arbitrary extra controls and overrides. Enlarge the terminal or hide the preview with Ctrl+P when space is limited. Every profile uses a single rounded outer box. The input and footer share the base finder background instead of drawing filled inner boxes. The input and optional header have one lower divider, the footer has one upper divider, and the list does not draw a nested box. The picker label sits in the outer border and `Search` sits in the input divider, avoiding the stacked top rules produced by fzf's `full:line` height-mode preset.

The initial preview appears below the list through 99 columns and to the right from exactly 100 columns in every layout. While a wide picker is open, fzf can move its preview below the list on resize when its preview-column threshold is crossed (approximately this boundary with the default frame and padding). This affects presentation only. Candidate generation, selected values, and actions do not change. Palette, layout, glyphs, and the secure generated-integration cache are separate: changing presentation refreshes exported options without regenerating `fzf --zsh`.

fzf options are composed in this order:

1. repository-managed structure and semantic palette;
2. captured inherited `FZF_DEFAULT_OPTS`;
3. `ZSH_FZF_EXTRA_OPTS` as the intentional final global override;
4. widget, completion, zoxide, or direct-picker arguments for their own workflow;
5. a final `--no-color` whenever `NO_COLOR` is set.

Inherited widget, general/path/directory completion, and `_ZO_FZF_OPTS` values are likewise captured once and appended to their managed presentation. Re-sourcing does not duplicate or recapture composed values. Because inherited and explicit layers are intentionally allowed to override managed fzf options, `ztheme current` reports whether an external option layer exists; it does not attempt to parse arbitrary user option strings.

### Theme discovery and session switching

`ztheme` inspects or switches the shared dashboard and finder palette without invoking an external program:

```zsh
ztheme list                 # list built-ins and mark active/default themes
ztheme current              # show theme, layout, glyph tier with a sample, depth, and option layers
ztheme show nord            # show semantic role values or terminal swatches
ztheme use nord             # switch dashboards and future fzf launches now
ztheme reset                # restore the terminal theme now
ztheme export nord          # print settings to copy into ~/.zshrc
```

`use` and `reset` affect only the current shell session and refresh future fzf and zoxide picker launches; a picker that is already open is unchanged. `use` switches the dashboard palette and preserves an explicit `ZSH_FZF_THEME` fzf-only override, so a deliberate finder choice survives unrelated dashboard switches. `reset` restores the default `terminal` theme and clears any such override so fzf inherits the UI theme again. Inspection with `show` or `export` does not change the active custom palette. Invalid names, invalid custom palettes, and failed finder refreshes return nonzero while preserving the committed palette, selectors, finder exports, and signatures. Edited `ZSH_UI_CUSTOM_COLORS` remain a proposal until a switch succeeds.

To persist a built-in choice, copy the output of `ztheme export <name>` above the `source init.zsh` line in the machine-local `~/.zshrc`. The command prints text only and never edits that file. Exporting a validated `custom` theme also prints its complete role array in stable order.

`dusage`, `bigfiles`, and `path` sanitize filesystem- or environment-controlled labels before rendering. Named controls such as newline, tab, escape, and bell become visible escapes; other C0, DEL, and C1 bytes use forms such as `\x7f`. Sanitization happens before measuring or truncating, keeps each value on one logical line, and preserves printable Unicode.

Rich output is for people, not parsers. Pipe a command or use its explicit plain option when output will be consumed by another program.
