---
title: "Credentials"
description: "Store and load shell credentials with cgm."
---

## Credential manager: cgm

`cgm` is defined only when `secret-tool` is present during startup. It stores single-line credential values in the current user's Linux Secret Service collection and exports them only on request.

### Commands

| Command | Behavior |
|---|---|
| `cgm set <name>` | Prompt invisibly and store or replace one value |
| `cgm list` | List saved names without retrieving values |
| `cgm status` | Show saved names and whether each is exported in this shell |
| `cgm check` | Ping Secret Service explicitly, without retrieving values |
| `cgm env <name ...>` | Load selected values into this shell |
| `cgm env --all` | Load every catalogued value into this shell |
| `cgm unset <name ...>` | Remove variables from this shell only |
| `cgm delete <name ...>` | Delete stored values and unset local copies |
| `cgm help` | Show concise command help |

Names must match `[A-Z_][A-Z0-9_]*`. For credential assignment/export, CGM accepts ordinary scalar parameters, optionally local or exported, and rejects special, read-only, non-scalar, or other attributed parameters (including width, padding, and case conversion), so values such as `PATH` cannot be replaced accidentally. Removal accepts attributed scalars because it does not assign or transform a value; special, read-only, and non-scalar parameters remain protected.

### Storage and secrecy

- Values are sent to `secret-tool` through its hidden input path, never as command arguments.
- No plaintext fallback exists.
- Sourcing the module does not contact Secret Service, unlock a keyring, or read the catalogue.
- `cgm list`, completion, status output, and help never retrieve or display values.
- The name-only catalogue lives under `${XDG_DATA_HOME:-$HOME/.local/share}/cgm/entries/`; directories are created under `umask 077`, remain mode `0700`, and empty markers are `0600`. `XDG_DATA_HOME` is used only when absolute; a relative value falls back to an absolute `$HOME/.local/share`, and the operation fails when neither base is safe.
- Secret loading disables inherited Zsh xtrace locally and restores the caller's state afterward.
- `cgm env --all` retrieves and validates every value before exporting any, so one failure leaves the environment unchanged.

“Saved” means a name-only marker exists; it does not prove the backend item still exists. `cgm status` inspects parameter metadata only: “loaded” means an exported scalar is present, including a value set outside CGM; it does not compare that value with storage. `cgm check` uses a bounded D-Bus peer ping through `gdbus`. A successful ping confirms the service is reachable, not that a collection is unlocked or each saved credential exists. Neither command retrieves values.

### Shell scope

Loaded variables affect the current shell and processes started from it afterward. They cannot change another terminal, an already-running process, or a parent shell. For that reason, `cgm env`, `cgm unset`, and `cgm delete` reject pipelines, command substitutions, and subshells.

Deleting a credential cannot recall copies already inherited by child processes. If a stored item is deleted but its current-shell variable has become unsafe to unset, `cgm delete` reports the retained variable and returns nonzero.
