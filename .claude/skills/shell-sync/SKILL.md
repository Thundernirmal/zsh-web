---
name: shell-sync
description: Sync the site's reference data to a newer commit of the companion Zsh repository, then prove the result end to end — regenerate with `npm run sync`, review every generated change, run all static and browser checks, manually review the UI at desktop and mobile widths, and fix what the review finds, all as small local commits. Ends by asking the user before anything is pushed or a pull request is opened. Use when asked to sync, update, or bump the shell snapshot, or to document a new Thundernirmal/zsh commit.
---

# Shell snapshot sync

Bring `src/data/` and `src/content/docs/docs/` up to date with a newer Thundernirmal/zsh commit, prove the site still works and looks right, and hand the user a reviewed, commit-by-commit branch.

Read `AGENTS.md` and `README.md` first: their rules on generated files, one concern per commit, budgets, hydration, and guide snapshots all apply here. This skill adds the order of work.

## Hard rules

- **Local only until the user says yes.** Do not `git push`, open a PR, comment on GitHub, or trigger workflows until the user explicitly approves in step 9. Approval covers this branch once; a later change needs a new approval.
- **Never edit generated files by hand.** Fix the shell source, `src/lib/guide-topics.mjs`, or the extractor, then re-run `npm run sync`. Never change only the SHA in `source.json`.
- **Never modify the shell repository.** If its `GUIDE.md`, registry, or tips are wrong, stop and tell the user; the fix belongs in a shell commit, after which you sync to that commit.
- **Never weaken a gate to get green.** No skipped tests, `--no-verify`, loosened assertions, or silent budget raises. A budget raise is allowed only as its own `perf(budget)` commit with measured numbers, and it must be called out to the user in step 9.
- **One concern per commit**, each message describing every behavior change in it. Never one large commit.
- Every finding is either fixed in a commit or reported to the user in step 9. Nothing gets silently dropped.

## 1. Check the shell source

The source is always `~/.config/zsh` at its current `HEAD` (`$SRC` below). Do not check out, commit, or create worktrees there. If the user wants a different shell commit, ask them to check it out in `~/.config/zsh` first.

```bash
SRC=~/.config/zsh
git -C "$SRC" fetch origin
git -C "$SRC" status --short --untracked-files=no   # must print nothing
git -C "$SRC" branch -r --contains HEAD             # must print a remote branch
git -C "$SRC" rev-parse --short HEAD                # the <short-sha> used below
```

Stop and ask the user if the source has uncommitted tracked changes (sync refuses them), or if its `HEAD` is not on the remote (CI checks out the pinned SHA and fails if it was never pushed). If `HEAD` equals the `commit` in `src/data/source.json`, there is nothing to sync: say so and stop.

## 2. Branch from remote main

Work in this checkout on a new branch. Do not create a worktree.

```bash
git status --short          # must print nothing; otherwise stop and ask
git fetch origin
git switch --no-track -c sync/shell-<short-sha> origin/main
npm ci                      # if npm reports EALLOWSCRIPTS: env -u npm_config_allow_scripts -u NPM_CONFIG_ALLOW_SCRIPTS npm ci
npx playwright install chromium firefox webkit
```

`--no-track` matters: a branch that tracks `origin/main` turns a bare `git push` into a push to `main`. If the branch name already exists, stop and ask; do not delete or reuse it. `npm ci` enforces `package.json#engines`, so a Node version that installs cleanly is supported even when it differs from `.nvmrc`; if the engines check fails, stop and ask instead of changing versions.

## 3. Understand the upstream change before generating

```bash
git -C "$SRC" log --oneline <old-sha>..<new-sha>
git -C "$SRC" diff --stat <old-sha>..<new-sha>
git -C "$SRC" diff <old-sha>..<new-sha> -- GUIDE.md lib/command-registry.zsh lib/tips-catalogue.zsh
```

Note what should change on the site: added, renamed, moved, or removed `##`/`###` guide sections; new or changed commands and their dependencies; new tips; moved files that guide links point at. Write this down as the expectation the generated diff is checked against.

## 4. Prep commits, then the snapshot commit

Run `npm run sync`. If it fails or the output needs a non-generated fix, discard the generated output (`git restore --staged --worktree src/data src/content/docs/docs`, then `git clean -fd src/content/docs/docs`), make the fix as its own commit, and re-run sync. Typical prep commits, each with tests:

- `feat(docs)`/`fix(docs)`: `src/lib/guide-topics.mjs` assignments for added, renamed, or removed `##` sections.
- `fix(sync)`: extractor corrections, with regression tests in `scripts/*.test.mjs`, for anything the shell change exposes (new syntax, availability checks, tip formats, categories).
- `perf(budget)`: only when step 6 proves a budget is exceeded by legitimate content, with before/after measurements and the reason in the message.

Then commit **only** regenerated files as `chore(sync): update shell snapshot to <short-sha>`. Its body summarizes the upstream changes by guide topic, lists new tips, new heading mappings, and changed dependency lists.

Commits that precede the snapshot can fail `sync:check` because the generated data still describes the old source. That is expected; each one must still pass `npm run test:extract`, `npm run lint`, and `npm run check`. The branch tip must pass everything.

## 5. Review the generated diff

Read the whole diff of the snapshot commit against the expectation from step 3:

- `source.json`: correct repository, full SHA, and source date.
- `commands.json`: compare each changed command's `requires`/`optional` dependencies with the shell code. A probe that only reports and continues is optional, not required; a first-available loop lists every alternative. Check categories, availability, and notes. Confirm commands you did not expect to change did not change.
- `tips.json`: new tips have sensible categories and command links, and no tip got duplicated or dropped.
- `src/content/docs/docs/*.md`: new sections are on the right topic page; repository links are pinned to the new SHA; cross-topic anchors, repository file paths, and images resolve (sync does not validate every link).
- `docs-links.json`: every new heading maps to its topic. A renamed heading or reordered duplicate heading breaks old public `/docs/#heading` links; tell the user in step 9 if compatibility handling is needed.
- `docs-search.json`: contains the new text.

Anything wrong goes back to step 4 as a fix to the source map or extractor, never as a hand edit.

## 6. Automated checks

```bash
npm run verify     # extract tests, sync:check, lint, knip, astro check, build, budgets
npm run test:e2e   # rebuild plus the full Playwright matrix
```

Both must pass at the branch tip. Record exact totals (passed, skipped and why) for the PR body. When a check fails, find the cause; fix it in a commit or report it, without retrying it into passing.

If e2e tests fail, re-run only those tests a few times to tell real failures from flaky ones:

```bash
npx playwright test <spec> -g "<test title>" --project=<project> --repeat-each 5
```

- Fails every time: a real failure. Find the cause and fix it in a commit.
- Fails only sometimes, and the test does not cover anything this sync changed: a flaky test. Do not fix it on this branch, change retries, or build a separate baseline checkout. Report it in step 9 with the test name, browser, and failure rate.

## 7. Manual UI review

Tests don't catch everything, so look at the site the way a reader would. Serve the production build:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4321   # run in the background
```

Drive it with the Playwright MCP tools (`browser_navigate`, `browser_resize`, `browser_snapshot`, `browser_take_screenshot`, `browser_evaluate`, `browser_press_key`, `browser_console_messages`). Keep screenshots under `.playwright-mcp/`, which is gitignored. If the Playwright MCP tools are unavailable, skip this step and tell the user in step 9 that the manual review did not run. For a baseline, compare against the live site, https://zsh.nirmalkatariya.com, which serves `main`.

**Routes**: `/`, `/get-started/`, `/commands/`, the detail page of every changed command, `/tips/`, `/docs/`, every guide topic page, `/troubleshooting/`, and `/404.html`.

**At 1280px and 375px on each route** (and 320px on pages with new code blocks or tables), run this audit and look at a screenshot:

```js
() => ({
  overflow: document.documentElement.scrollWidth > window.innerWidth,
  h1: document.querySelectorAll('h1').length,
  headingSkips: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .map((h) => +h.tagName[1])
    .filter((level, i, all) => i > 0 && level > all[i - 1] + 1).length,
  internalLinks: [...new Set([...document.querySelectorAll('a[href^="/"]')].map((a) => a.pathname))],
})
```

Expect no overflow, exactly one `h1`, no heading skips, and no console errors. Collect internal links across all routes and confirm each returns 200 from the preview server.

**Change-specific checks**:

- New guide sections read correctly on mobile: code blocks scroll inside their container and tables don't widen the page.
- Guide search finds new text; arrow keys and Enter navigate results; `/` focuses search and Ctrl+K selects the query; Escape clears it.
- `/docs/#<new-or-moved-heading>` redirects to the right topic and heading.
- Changed commands show correct dependency badges, descriptions, and examples on `/commands/` and their detail pages; filters and search find them.
- New tips appear in the roulette and on `/tips/`; copy works and is announced.
- The skip link works and focus stays visible while tabbing through changed areas.

Every visual defect becomes its own `fix(...)` commit with an e2e test that asserts the real DOM or focus outcome (the Playwright specs poll for hydration with `expect.poll`; follow that pattern). Then re-run steps 6 and 7 for the affected areas.

## 8. Final audit

- `npm test` passes at the branch tip.
- `git status` is clean, with no stray screenshots, reports, or temp files tracked.
- `git log --oneline origin/main..HEAD` reads as a series of single concerns. For each commit, `git show --stat <sha>` matches its message, with no unexplained files and no accidental reversion of older work.

Draft the PR in the format of earlier sync PRs (for example #21), in a file outside the repository such as `/tmp/sync-<short-sha>-pr.md`:

- An opening line linking `Thundernirmal/zsh@<short-sha>` with its date.
- **User-facing changes**: one bullet per visible change, each tagged with the commit type that ships it, so every bullet maps to commits and back.
- **Non-visible changes**: budgets (with numbers), extractor and test changes.
- **Verification**: `npm test` totals with the reason for each skip, any flaky tests from step 6, plus the manual review: widths, routes, and what was checked.

## 9. Ask before publishing

Stop and present to the user:

1. The commit list (`git log --oneline origin/main..HEAD`) with one line on each.
2. Check results: `verify` and e2e totals, plus a manual-review summary with key screenshots.
3. Anything needing a decision: budget raises, broken legacy links, flaky tests, shell-side issues you did not fix, and remaining doubts.
4. The draft PR title and body.

Then ask: **"Push `sync/shell-<short-sha>` and open the PR against `main`?"** Use the AskUserQuestion tool where available, otherwise ask in plain text, and end your turn. Do not push in the same turn as the question.

Only after an explicit yes:

```bash
git push -u origin sync/shell-<short-sha>
gh pr create --base main --head sync/shell-<short-sha> --title "Sync shell snapshot to <short-sha>" --body-file /tmp/sync-<short-sha>-pr.md
```

If the harness offers a pull-request linking tool, register the PR URL. Report the PR URL. Never merge, force-push, or delete the branch unless asked. If the user asks for changes instead, make them as new commits, re-run the affected checks, and ask again.
