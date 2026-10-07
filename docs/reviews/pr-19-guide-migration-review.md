# PR #19 “Sync shell reference and add docs matching the website”: full review

**Completed:** 7 October 2026.

**Pull request:** https://github.com/Thundernirmal/zsh-web/pull/19

**Commit reviewed:** `46e4369d75bea3cdf715824e26f45907b5be6ab6` — 16 commits, 48 files, +3,124 −2,214 against `main`.

**Base:** `main` at `c6d3cde`.

**Shell source pinned by the branch:** `Thundernirmal/zsh` at `9334c4090dbc0490b5682ce03cff2c2e29e0ffbd`.

**CI at time of review:** `verify` **failed** (run `37573837801`); `e2e` was **skipped** because it depends on `verify`. The preceding run (`37571833320`, commit `164ff01`) was green.

## Verdict

The substance of this PR holds up and should be merged once the CI blocker is cleared. Generated content is reproducible byte-for-byte from the pinned upstream revision, the shadcn dependency restoration loses nothing relative to the vendored CSS it replaced, all 61 legacy guide anchors resolve, and the full browser suite passes when run.

The defects are concentrated in the three most recent commits — the search URL-state feature (`46e4369`, `bc80481`) and the sticky sidebar (`527100f`). Two are release-blocking in practice: CI is red, and the docs search freezes on WebKit/Safari.

Nothing in this review certifies security, accessibility conformance, or performance scores. The shell-reference data changes (53 commands, 82 tips) were validated for reproducibility and internal consistency, not for shell-behaviour correctness.

## Scope and evidence

### Completed

- Reviewed the full `main...HEAD` diff across UI, scripts, configuration, tests, workflow and generated data.
- Built the branch, served `dist/`, and inspected rendered pages at 320, 360, 390, 430, 667, 1000, 1024, 1280 and 1440 px, including the desktop sidebar, mobile disclosure, search results, section outline, tables, code blocks and pagination.
- Measured layout shift with `PerformanceObserver` under simulated slow networks (JS delayed 400 ms and 800 ms), and with JavaScript disabled to capture the exact pre-hydration paint.
- Measured the docs search live region with a `MutationObserver` and instrumented `history.replaceState` to count and capture throttling in WebKit.
- Ran the browser suite on the reviewed head for two projects: **desktop-chrome 53/53 passed**, **mobile-webkit 52/52 passed with 1 skipped** (the known non-Chromium clipboard-permission case).
- Ran `npm run build`, `npm run budget`, `npm run lint`, `npm run test:extract` and, on a reviewer's behalf, the full `npm run verify`.
- Diffed the deleted vendored stylesheet against the upstream package sheet block-by-block, and compared the compiled CSS against its budget.
- Compared `gzipSync` output for identical files under Node 26/zlib 1.3.2 and Node 22/zlib 1.3.1.
- Regenerated the guide from upstream `GUIDE.md` at the pinned revision and compared the result byte-for-byte against the committed generated files.
- Independently reproduced the workflow's patch export against a clean clone, including additions, modifications and deletions.
- Re-ran the extractor in `--check` mode against a fresh clone of the shell repository at the pinned commit.

### Limits

- The GitHub workflow itself was not executed; its correctness is established by local reproduction of its exact run commands plus YAML parsing.
- Firefox and mobile-chrome e2e projects were not run here. CI runs all four; only desktop-chrome and mobile-webkit were re-run independently.
- The gzip discrepancy was reproduced with Node 22.23.3, not CI's exact 22.22.3. The 1-byte difference against CI's logged value is consistent with the same zlib 1.3.1 family, but the exact CI toolchain was not installed.
- Physical-device Safari was not tested; WebKit findings come from the Playwright WebKit build.
- Repeated runs of the layout-shift measurement are not included; the reported CLS is a single deterministic value across two delay settings.
- No Lighthouse run, penetration test, or assistive-technology (screen reader) session was performed. Accessibility findings are code- and DOM-derived plus axe.

## Why CI is red

This is the most important finding, and it is not what the failing check's message suggests.

`scripts/check-budget.mjs:14` sets `docs/index.html` to `gzipBytes: 8_000`. The CI log reports:

```
✗ docs/index.html gzipBytes: 8,013 exceeds budget 8,000
docs/index.html: {"rawBytes":33142,"gzipBytes":8013,"elements":251,...}
```

Running the identical commit locally reports **7,985** and passes. The cause is that the gate measures `gzipSync` output from `node:zlib`, and zlib output differs between Node releases:

| file | Node 26.10.0 (zlib 1.3.2, local dev) | Node 22.23.3 (zlib 1.3.1, CI from `.nvmrc`) | budget |
|---|---:|---:|---:|
| `dist/docs/index.html` | **7,985** (pass) | **8,014** (fail) | 8,000 |
| `dist/docs/maintenance/index.html` | 9,403 | 9,424 | 9,800 |
| `dist/docs/packages/index.html` | 11,610 | 11,636 | 12,500 |
| `dist/docs-search.json` | 24,727 | 24,671 | 30,000 |

Same bytes, same files. The variance is ~29 B in both directions, and the docs overview sits inside that band. The difference is not monotonic across files, which rules out a header or framing constant and points at a genuine deflate-implementation change.

Two consequences:

1. The page has **15 bytes of headroom locally** — 0.19%, against the ~15% headroom the script's own header comment (lines 7–8) states as its convention. Any content change to `/docs/` can flip CI.
2. The overview renders the sidebar, which contains one link per guide topic. Adding an eleventh topic adds roughly 130 B raw and breaks the gate outright.

`main` allowed 105,000 raw / 31,000 gzip / 2,220 elements for this route. Tightening it to 35,000 / 8,000 / 320 is a legitimate and creditable outcome of replacing a monolithic guide page — but the last three commits consumed the margin, and the budget now encodes less robustness than it appears to.

**Recommended fix.** Reclaim payload rather than raise the limit, so the tightening the PR argues for survives. `src/layouts/DocsLayout.astro:82` inlines the entire legacy-anchor map into the overview HTML:

```
<div hidden data-guide-links={JSON.stringify(legacyLinks)}></div>
```

That is 61 entries, 3,407 bytes of JSON (950 B gzipped); in place it is a 4,665-byte attribute. The consuming script already bails out unless a hash is present:

```js
const legacy = document.querySelector<HTMLElement>('[data-guide-links]');
if (!legacy || !location.hash) return;
```

Moving the map to the static-JSON pattern this PR already established for the search index — fetched only when `location.hash` is non-empty — removes the attribute entirely and drops the page from 7,985 to **7,065** gzip. That is a ~920-byte saving against a 13-byte overage, needs no limit change, and removes 4.6 KB of JSON-as-DOM-attribute as a side effect.

If the limit is raised anyway, AGENTS.md requires that to be its own commit with a stated rationale.

Independently, the gate itself deserves hardening: a byte-exact threshold on a metric that moves ~29 bytes between zlib releases will keep producing environment-specific red builds. Acceptable options are a small tolerance band, or pinning the measurement to a fixed Node version in CI.

## Findings

Severity reflects user impact, not fix difficulty. Everything below was reproduced unless marked otherwise.

### B1 — CI `verify` fails: the docs overview exceeds its own gzip budget in CI only

`scripts/check-budget.mjs:14`, `src/layouts/DocsLayout.astro:82`.

See “Why CI is red” above for the full analysis and the recommended fix. Summary: 8,013 bytes measured in CI against an 8,000-byte limit on a 15-byte local margin, because the metric is zlib-version-dependent.

**Impact:** the PR cannot merge. `e2e` never runs, so the ten new browser tests are unverified by CI — they did pass when run manually (see *Verified correct*).

### H1 — The docs search freezes on Safari

`src/components/docs/DocsSearch.astro:50`, `:81`.

`search()` writes the current query into the URL:

```js
const url = new URL(location.href);
if (input.value.trim()) url.searchParams.set('q', input.value);
else url.searchParams.delete('q');
if (url.href !== location.href) history.replaceState(history.state, '', url);
```

It is invoked once per `input` event (`:81`), and this block sits **outside** the surrounding `try` — it precedes `clear.hidden`, `error.hidden`, `results.replaceChildren()`, `panel.hidden` and the filtering itself.

WebKit caps `history.replaceState` at 100 calls per 10 seconds and then throws. Measured, with `history.replaceState` instrumented before page scripts ran:

```
WEBKIT sustained typing (140 chars at 15ms):
  inputValueChars: 140
  urlQChars: 99
  urlMatchesInput: false
  replaceState: { attempts: 141, thrown: 41,
                  lastError: "SecurityError: Attempt to use history.replaceState() more than 100 times per 10 seconds" }
  unhandledRejections: ["SecurityError: ...", "SecurityError: ..."]
```

After the throttle tripped, `fill("zzz")` produced exactly one further attempt and one further throw, the URL's `q` stayed frozen at the old 99-character value, and the status text never changed. Because the URL is never updated, `url.href !== location.href` stays permanently true, so **every subsequent keystroke throws before doing any work**. The search is dead for as long as the user keeps interacting with it, and revives only after ~10 seconds of inactivity.

**Reachability:** any 100 keystroke events inside a 10-second window. Sustained fast typing reaches this, and OS key-repeat — holding a letter or backspace on a long query — generates input events at roughly 25–30/sec, tripping the cap in about four seconds.

**Why tests miss it:** every search test types short queries (`fakeroot`), and `page.fill()` sets the value in a single input event. The `mobile-webkit` project runs the full suite and passes.

**Recommended fix:** debounce the URL write (≈200 ms) and wrap it in `try`/`catch`. The search itself should stay synchronous per keystroke; only the history write needs throttling. This preserves the feature — deep-linkable queries, restore on reload and Back/Forward, all of which are verified working — while dropping the write rate far below WebKit's cap.

### M1 — Mobile layout shift of 0.3141 on every docs route

`src/layouts/DocsLayout.astro:40`, script at `:86–91`.

The topic menu is server-rendered as `<details class="docs-menu" open data-docs-menu>` and collapsed after load on narrow viewports:

```js
menu.open = matchMedia('(min-width: 1024px)').matches;
menu.dataset.ready = 'true';
```

No CSS rule keys off `data-ready` or the viewport to hide `.docs-topic-nav`; `data-ready` is referenced only by tests. Measured at a 390 px viewport with the JS response delayed:

```
mobile 390, JS delayed 400ms: {"cls":0.3141,"shifts":[{"value":0.3141,"startTime":910}],"menuOpenAfter":false}
mobile 390, JS delayed 800ms: {"cls":0.3141,"shifts":[{"value":0.3141,"startTime":1675}],"menuOpenAfter":false}
```

CLS 0.3141 is above the 0.25 “poor” threshold and comes from a single shift. The local measurement is 0.000, which is why it has gone unnoticed: the preview server is fast enough that the module executes before first paint. On a real network the shift lands after paint.

With JavaScript disabled the pre-hydration paint is worse than a flash — an eleven-item expanded navigation occupies the entire first viewport, pushing the page title, the search field and the article below the fold.

**Impact:** all 11 docs routes, mobile, on first load.

**Recommended fix:** drop the hardcoded `open` and set it synchronously before paint with a small `is:inline` script placed immediately after the `<details>`. That clears the shift at both breakpoints and degrades better without JavaScript. A CSS-only variant keyed on `:not([data-ready])` also works but leaves the navigation unreachable for no-JS mobile users.

**Coverage gap:** no test measures this. axe does not evaluate layout stability, and the e2e assertion covers only the post-hydration state.

### M2 — Literal Markdown emphasis markers appear in rendered search excerpts

`src/data/docs-search.json`, generated by `scripts/docs-guide.mjs`'s plain-text pass; rendered at `src/components/docs/DocsSearch.astro:70–71`.

`guideSearchIndex` strips links, heading markers, backticks and table pipes, but not emphasis markers. 53 `**` occurrences survive into the index, 50 of them from `safety.md`'s bolded list lead-ins. Captured from the running site with the query `install`:

```
Gotchas and safety
   "…ing rules most likely to surprise a new user: 1. **The install path is fixed.** init.zsh
    loads $HOME/.config/zsh/*.zsh. A clone elsewhere needs a symlink or a d…"
```

Excerpts are written with `textContent`, so the asterisks are shown literally to readers.

**Impact:** user-visible in the PR's headline new feature. The PR body states that table formatting was cleaned out of guide-search excerpts while literal shell pipes were preserved; emphasis markers were missed in the same pass.

**Recommended fix:** strip `**`/`__`/single-emphasis markers in `guideSearchIndex`, alongside the existing table and link handling. Three of the remaining occurrences are legitimate shell globs (`**/*(D)`, `**/*.js`) and must survive — the existing backtick-aware handling shows the pattern to follow.

### M3 — Fence-language tokens and Markdown markers pollute the search index

`scripts/docs-guide.mjs:29`.

The plain-text pass removes backticks but not fence info strings, so every `` ```zsh `` and `` ```text `` opener contributes the literal token `zsh`, `sh` or `text` to the indexed body: **105 such tokens** in the committed index, plus 53 `**` (M2), 35 list bullets and 2 blockquote markers.

Matching in `DocsSearch.astro:61` is substring-based over the whole body:

```js
entries.filter((entry) => terms.every((term) => `${entry.title} ${entry.text}`.toLowerCase().includes(term)))
```

**Impact:** queries for common words are widened — searching `text` or `zsh` matches most topics regardless of relevance. Combined with M2 it also degrades excerpt readability.

**Recommended fix:** drop fence delimiter lines (and their info strings) and list/quote markers during the plain-text pass.

### L1 — Tables break identifiers mid-word below 400 px, so the scroll affordance never engages

`src/styles/global.css:231` (`overflow-wrap: anywhere` on inline code), table styles at `:235`.

At 390 px, measured on `/docs/shell-basics/`:

- `AUTO_PUSHD` renders as `AUTO_PUSH` / `D` — the `code` box is 75 × 47 px at a 24 px line-height, i.e. two lines.
- `INTERACTIVE_COMMENTS` breaks across three lines; `NUMERIC_GLOB_SORT` becomes `NUMERIC_G` / `LOB_SORT`.
- `table.scrollWidth === table.clientWidth === 343` — the table never overflows, so the `overflow-x: auto` and `tabindex` machinery never activates.

**Pre-existing.** `main` already applied `.markdown-doc` to the whole guide with the same `overflow-wrap: anywhere` rule, so this is carried forward rather than introduced. It is listed because the PR body claims wide tables are made keyboard-scrollable and their overflow contained, and because AGENTS.md asks for a manual review of code/table overflow at mobile widths. Shell option names are copy-sensitive.

**Recommended fix:** `overflow-wrap: normal` on table cells (or a `min-width` on tables) so the table genuinely overflows and the existing scroll handling does its job.

### L2 — Topic count is hardcoded

`src/layouts/DocsLayout.astro:62` renders `<span>10 topics</span>` beside a list generated from `guideTopics`, whose length is available in the same expression. No test asserts the label. Adding a topic silently makes it wrong, and — per M1’s sibling concern in “Why CI is red” — it also breaks the payload budget.

### L3 — The search live region rewrites twice per keystroke

`src/components/docs/DocsSearch.astro:55–56`, `:81`. There is no debounce, and `role="status"` (`:14`) is also the target of the input’s `aria-describedby`. Measured while typing `fakeroot` (8 characters):

```
16 live-region mutations
  ["Searching…","11 matching topics","Searching…","10 matching topics","Searching…","2 matching topics", ...]
```

Assigning an identical string still fires a mutation, so a polite live region announces repeatedly. **Fix:** debounce (~150 ms) and write only when the message actually changes.

### L4 — Search excerpts begin mid-word

`src/components/docs/DocsSearch.astro:69`. The excerpt start is a raw character offset (`indexOf(terms[0]) - 55`) with no word-boundary snapping. Observed in the rendered UI: `…earch Recursive grep checkupdates`, `…er; the checkupdates reminder`. The trailing `…` handling is correct; only the leading edge truncates words.

### L5 — The search input loses its focus indicator in forced-colors mode

`src/styles/docs.css:29` sets `outline: none` on the input, with focus conveyed only by the parent `.docs-search-field:focus-within` `box-shadow` (`:28`). Box shadows are not rendered in forced-colors / Windows High Contrast, and there is no `@media (forced-colors: active)` block anywhere in the project. This is inconsistent with the same file’s other focus styles (`:18`, `:35`), which correctly use a real `outline: 2px solid var(--ring)`.

### L6 — Radii bypass the token scale

`src/styles/docs.css` uses raw `0.75rem` (5 sites), `0.375rem` and `0.25rem`, while `:14`, `:22` and `:34` use `var(--radius)`. The scale is defined at `src/styles/global.css:70–76` from `--radius: 0.5rem`, with `--radius-xl` = 0.7rem as the nearest step. Colours in this file are 100% token-derived; radii are the one place the discipline slips.

### L7 — Every code block and table is a tab stop whether or not it scrolls

`src/layouts/DocsLayout.astro:92` sets `element.tabIndex = 0` unconditionally on `.markdown-doc :is(table, pre)`. Pre-existing (the deleted `docs.astro` did the same) and a test asserts the attribute, so it is deliberate — but pages carry up to six code blocks plus tables, each becoming a stop with nothing to scroll, and per L1 the tables currently never overflow. **Fix:** set `tabIndex` only when `scrollWidth > clientWidth`, re-evaluated on resize.

### L8 — New sidebar padding misaligns the menu card by 4 px

`src/styles/docs.css:67` adds `padding: 0.25rem` to the sticky sidebar. Measured at 1440 px: `.docs-heading` and `.docs-sidebar` share a left edge at 228.5 px, but `.docs-menu`’s border sits at 232.5 px. The padding is defensible — it stops `overflow-y: auto` from clipping the summary’s 3 px-offset focus ring — but the card no longer aligns with the page’s content edge. **Fix:** offset with a negative margin, or apply padding only while scrolling.

### L9 — Topic budgets are discovered from dist, so a missing route is unchecked

`scripts/check-budget.mjs:30–36`. Docs-topic budgets come from the `dist/docs` directory listing. A build or configuration regression that drops one topic page removes it from `BUDGETS` instead of failing. Only the two hardcoded entries (`docs/index.html`, `docs/maintenance/index.html`) catch a wholesale directory loss. `docs.spec.ts` asserts the sidebar count and exercises several routes, but does not visit every topic. **Fix:** assert the expected route set from the guide map.

### L10 — `route-assets` can crash on an interpolated dynamic import

`scripts/route-assets.mjs:19`. The new backtick branch matches template-literal paths, and `${...}` is valid inside the regex body, so `import(\`./chunks/${name}.js\`)` would be treated as a concrete path and abort with ENOENT rather than being skipped. Rollup leaves such imports intact. Reproduced against a synthetic fixture; no such pattern exists in the current `dist`, so this is fail-loud, not a silent under-count — but it converts a build-output change into an uncaught stack trace.

### L11 — The backtick traversal is a no-op on real output, and the README overstates it

`scripts/route-assets.mjs:19`, `README.md:107`. An old-versus-new regex scan across every HTML/JS/CSS file in `dist` reports **zero differences**; the real deferred loads are `import(e)` where `e` comes from `component-url` / `before-hydration-url` attributes already matched by the quoted-attribute path. The capability was added for the Pagefind runtime, which this PR removes. The README sentence “Budget checks also follow deferred chunks using backtick import paths” describes behaviour exercised only by a synthetic fixture.

### L12 — The workflow test couples to YAML formatting

`scripts/snapshot-patch.test.mjs:8`. The test extracts the workflow’s export script by matching the exact step name plus `run: |` block form and 10-space indentation, so a step rename or a switch to a single-line `run:` turns a behaviour test into a formatting test. It fails safe (a clear message rather than a false pass). Separately, the fixture is created under `.playwright-mcp/` rather than the system temp directory; a `SIGKILL`ed run leaves the directory behind (gitignored, and normally removed in `finally`).

### L13 — `github-slugger` is a runtime dependency but is build-only tooling

`package.json:41`. It is imported by `scripts/docs-guide.mjs:1` and one e2e spec; nothing under `src/` imports it and `npm run build` does not need it. Conventionally a `devDependency`. No functional impact — `knip` and `verify` pass.

### L14 — `404.html` escapes budgeting entirely (pre-existing)

`scripts/check-budget.mjs`. It appears in no `BUDGETS` entry and `routeAssets()` is never called for it, so the 404 route has no HTML, DOM, JS, CSS or font budget. `main`’s script had the same six static entries.

### L15 — The home page’s runtime-fetched JSON is unbudgeted (pre-existing)

`scripts/check-budget.mjs:44–57`. This PR budgets the lazily fetched `docs-search.json` separately — the right pattern. The pre-existing `/tips.json` (18 KB raw / ~3.9 KB gzip, fetched by the TipRoulette chunk that `index.html` loads) is counted by no budget, so the home page’s JS budget understates real transfer by that amount.

### L16 — Latent parser: fence closers are accepted too permissively

`scripts/docs-guide.mjs:42–45`. The closer test compares only the leading delimiter run, so any same-character run of sufficient length closes a fence — including an indented run (CommonMark allows at most 3 spaces) and an opening fence carrying an info string. A maintainer adding a fenced example that itself contains a fence gets a misleading `GUIDE.md must contain exactly one section: …` error naming an unrelated section, because the spurious close swallows subsequent H2s. Not triggered by the pinned `GUIDE.md`.

### L17 — Latent parser: table-pipe escaping runs inside fenced code

`scripts/docs-guide.mjs:35`. The escape pass runs before fence tracking and has no fence guard, so a line inside a code block that starts with `|` and contains an inline-code pipe is rewritten with a backslash, which then renders literally. No `|`-leading line inside a fence exists in the current guide (all 234 pipe-leading lines are outside fences).

### L18 — Latent parser: a duplicate `## Contents` is silently dropped

`scripts/docs-guide.mjs:62`. The exemption is by title text rather than identity, so any number of `## Contents` sections pass the unassigned-section check and then vanish — the intro slice ends at the first H2, and only sections inside a topic’s chunk ranges are emitted. This contradicts the documented contract that unknown or missing sections fail sync. The first `## Contents` being replaced by the generated topic-card section is intentional.

### L19 — Latent parser: heading normalisation can disagree with the rendered id

`scripts/docs-guide.mjs:17–19`, `:47`, `:75`. A heading containing a Markdown link is used raw for both the legacy key and the page-local slug, so `### See [Setup](#setup-and-scope)` yields the key and target `see-setupsetup-and-scope` while the renderer produces `see-setup` — the legacy key never matches and the target fragment does not exist. Separately, the heading regex strips a trailing `#` without requiring preceding whitespace, so `## C#` is normalised to `C` (loud, in the diagnostic). No heading in the pinned guide contains markup or ends in `#`.

### L20 — Parser tests cover the happy path only

`scripts/docs-guide.test.mjs`, `scripts/extract-semantics.test.mjs`. The three guide tests are meaningful and fail when behaviour changes, and the negative cases in `describeCommandCondition` are real. But the guide fixture is built from `guideTopics` itself, so it can never catch drift between the map and the real `GUIDE.md` (a renamed or reordered source section). There is no coverage for fence strictness (L16–L17), duplicate `## Contents` (L18), obsolete-page deletion, or the `extract.mjs` integration that wires `docs-links.json` and `docs-search.json`.

## Verified correct

These were checked specifically and held up.

**Generated data is exact.** Regenerating from the upstream `GUIDE.md` at `9334c409` reproduces all 11 markdown pages, `docs-links.json` and `docs-search.json` **byte-for-byte**. `npm run sync:check` and an extractor `--check` run against a fresh clone at the pinned commit both pass, reporting 53 commands and 82 tips. Schema version 6 is declared consistently in `src/data/source.json` and `scripts/extract.mjs`.

**Legacy link preservation is complete.** All 61 headings from `main`’s guide are mapped, and all 61 targets resolve to real ids in the built HTML (60 generated, plus `#_top` from `PageHeader`). The three duplicate “Commands” headings map to the correct pages in old document order. The `contents` key targets a layout-provided anchor (`DocsLayout.astro:62`), which is intentional.

**Section coverage is exact.** All 15 content `##` sections are assigned exactly once across the ten topics; there are no orphan or missing files in `src/content/docs/docs/`.

**The shadcn restoration is lossless.** All ten non-comment top-level blocks of the deleted `src/styles/ui-variants.css` are present verbatim in `shadcn/dist/tailwind.css`; upstream is a strict superset (45 blocks vs 11), adding Radix `[data-state]` forms alongside the Base UI `[data-open]` forms. `shadcn/tailwind.css` is a genuine public export (`exports["./tailwind.css"]`) and contains no `:root`, so the Catppuccin theme is untouched. Import cost is negligible: Tailwind tree-shakes `@utility` to zero, leaving 8 `@property` registrations and 8 defaults totalling **765 bytes raw of 101,791**. `tw-animate-css` is still genuinely used by eight files.

**Toolchain declarations agree.** `.nvmrc`, `.node-version`, `package.json#engines` and the README requirements line are consistent, and the range matches the locked `eslint-plugin-astro` engine declaration. `engine-strict` was verified to reject an out-of-range value. The ESLint peer override resolves to a single `eslint@10` with `jsx-a11y` deduped to it, and the plugin’s rules were confirmed to actually run rather than being inert.

**The workflow patch export is correct.** Independently reproduced: it includes additions, modifications and deletions, excludes unrelated files (`README.md`, path-prefix lookalikes), and `git apply --check` succeeds on a fresh clone. No injection risk — `inputs.shell_ref` appears only in `with: ref:`, never interpolated into a `run:` block.

**Budget gating fails correctly when it should.** Fixtures with oversized routes, missing routes and missing assets all exit 1 with clear messages.

**Anchor navigation clears the sticky header.** `scroll-padding-top` resolves to 79 px against a 63 px header; a jumped-to heading lands at `top: 79` with the header bottom at 63. `--site-header-height` is genuinely published by `Header.astro`.

**Heading hierarchy is valid.** No generated markdown file contains an `h1`; `PageHeader` supplies exactly one per page, so there is no duplicate-`h1` or skipped-level risk. Tables carry column headers with `scope` semantics.

**Search behaves as documented.** The index is fetched only for a nonempty query and cached across navigations (a test asserts exactly one request across back/forward). Retry restores focus to the input, Tab order reaches the clear button and then the results, and Escape/Ctrl-K/`/` behave correctly with an input guard. URL restore on reload and on Back/Forward is verified by test.

**axe coverage is real.** `core.spec.ts`’s `siteRoutes` includes `/docs/` and all ten topic routes, with WCAG 2.0/2.1 A and AA tags and `prefers-reduced-motion: reduce` emulated.

**The browser suite passes on this head.** `desktop-chrome` 53/53, `mobile-webkit` 52/52 with one expected skip. This matters because CI’s `e2e` job never ran.

## Remediation order

**Before merge**

1. **B1** — reclaim the inline legacy-anchor map (≈920 gzip bytes) so the page clears the budget on its own merits; then consider hardening the gate against zlib-version variance. Separate commit if a limit moves.
2. **H1** — debounce the search URL write and wrap it in `try`/`catch`.
3. **M2** — strip emphasis markers in the search-index plain-text pass.

**Promptly after**

4. **M1** — set the mobile disclosure state before first paint.
5. **M3** — drop fence info strings and list/quote markers from the search index.
6. **L13, L11** — correct the dependency placement and the README’s deferred-chunk claim.

**Backlog**

7. **L1, L7** — make table overflow real, then make tab stops conditional on it. Together these restore the behaviour the PR intended.
8. **L3, L4, L5, L6, L8** — search and styling polish.
9. **L9, L12, L14, L15** — budget and test-harness hardening.
10. **L16–L20** — parser edge cases; none reachable from the current guide, but each will bite the next maintainer who edits it.

## Method notes

Commands and scripts used, for reproduction:

- `npm run build`, `npm run budget`, `npm run verify` — from a clean checkout of the reviewed commit.
- `npx playwright test tests/e2e/docs.spec.ts tests/e2e/core.spec.ts --project=desktop-chrome|mobile-webkit --workers=2`
- Layout shift: `PerformanceObserver` on `layout-shift` installed via `addInitScript`, with the JS bundle delayed through `page.route` at 400 ms and 800 ms; a control run with `javaScriptEnabled: false` captured the pre-hydration paint.
- Search instrumentation: `MutationObserver` on `#docs-search-status`; `history.replaceState` wrapped to count attempts and throws before page scripts ran.
- Cross-version compression: identical files read with `readFileSync` and measured with `gzipSync` under `node` (v26.10.0) and `npx node@22` (v22.23.3).
- Generated-data verification: upstream `GUIDE.md` fetched at the pinned revision and passed through the repository’s own `generateGuideDocs`, `guideSearchIndex` and extractor `--check`.

All scratch scripts were kept outside the repository. The working tree was left clean at `46e4369`.
