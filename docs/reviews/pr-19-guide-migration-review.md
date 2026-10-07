# PR #19 “Sync shell reference and add docs matching the website”: full review

**Completed:** 7 October 2026.

**Pull request:** https://github.com/Thundernirmal/zsh-web/pull/19

**Commit reviewed:** `46e4369d75bea3cdf715824e26f45907b5be6ab6` — 16 commits, 48 files, +3,124 −2,214 against `main`.

**Base:** `main` at `c6d3cde`.

**Shell source pinned by the branch:** `Thundernirmal/zsh` at `9334c4090dbc0490b5682ce03cff2c2e29e0ffbd`.

**CI at time of review:** `verify` **failed** (run `37573837801`); `e2e` was **skipped** because it depends on `verify`. The preceding run (`37571833320`, commit `164ff01`) was green.

## Independent assessment and remediation of R1–R17 — 7 October 2026

This assessment preserves the follow-up findings below as review history. Each item was checked against the implementation; recommended fixes were treated as hypotheses rather than copied. The pinned shell revision remains unchanged; the extractor contract advances to schema 8 and all generated outputs were regenerated together from the clean source checkout.

| Finding | Decision and implemented outcome |
| --- | --- |
| R1 | **Confirmed for immediate history traversal.** A shorter timer still loses edits within its window. Every edit is instead saved in tab-local session storage under the router entry index and route. Reload/traversal restore that entry; new navigations honor their URL. URL writes retain the Safari-safe one-second cadence. The previous code already had a `beforeunload` flush, so “nothing flushes on reload” was inaccurate. The new recovery mechanism removes that listener. |
| R2 | **Confirmed and fixed.** Rewriting checks own properties and the anchor dictionary has no prototype. Tests cover prototype-member fragments and a literal `__proto__` heading. |
| R3 | **Confirmed and fixed.** A failed catalog stays failed while typing, without another request or repeated alert toggling. Only explicit Retry resets the failure; keyboard activation returns focus to the input. |
| R4 | **Confirmed and fixed.** CommonMark code-span ranges are masked at equal offsets before GFM table recognition, then only spans inside actual tables are escaped. Tests cover optional leading pipes, pipes in headers, prose, and opaque fence examples. |
| R5 | **Confirmed fragility, replaced.** Controllers live in the docs component directory and share a named Rolldown chunk. Importing entries cannot be inlined by Astro, independently of Astro component filenames. Browser coverage asserts the same external chunk is loaded across routes. |
| R6 | **Confirmed and fixed.** Automatic legacy navigation retains all query parameters. Every mapped legacy fragment also identifies a native destination link, revealed by `:target`, which works without JavaScript and can be activated by keyboard. |
| R7 | **Retained as a performance observation, not an outstanding correctness defect.** Strict existing ceilings remain unchanged. The comment promising approximately 15% headroom was misleading and now describes explicit ceilings. The additional recovery behavior fits after consolidating controllers and simplifying duplicate handlers. A tolerance band would weaken the gate; arbitrarily trimming unrelated functionality or promising a universal percentage is not justified. Current measured headroom is recorded below and remains a constraint on future changes. |
| R8 | **The encoded hidden map was removed; on-demand JSON was rejected for this implementation.** Native legacy landing links are now the single representation consumed by both browsers and the redirect controller. Fetching a separate map would duplicate that necessary no-JavaScript representation and add a request. Native compatibility adds HTML, so this is not presented as a payload reduction or a solution to the JS budget. Redundant navigation text wrappers and decorative card arrows were removed to keep the DOM inside its existing ceiling. |
| R9 | **Confirmed and fixed.** The version key hashes actual serialized index content, covering guide-map edits that affect the payload. The endpoint and Cloudflare `_headers` declare the same cache policy as tips: 300 seconds plus stale revalidation. The review's claim that `_headers` used 3600 seconds for tips was inaccurate. Index loading stays lazy and its promise is shared between topic pages; a changed content version resets the cache. |
| R10 | **Confirmed and fixed.** Generated topic descriptions use the authored taxonomy text; the overview has an authored summary. Regenerated frontmatter now supplies those descriptions to metadata. |
| R11 | **Confirmed and fixed.** Lowercase title and text are computed once when the catalog resolves and reused for filtering, ranking and excerpt matching. |
| R12 | **Confirmed coupling, removed.** `src/lib/guide-topics.mjs` is dependency-free and owns the taxonomy. The extractor, layouts, budget tooling and browser specs import it directly. README and AGENTS.md reflect its new ownership. |
| R13 | **Confirmed duplication, removed.** Desktop and mobile render the same `DocsTopicNav` component. Both responsive surfaces remain present in server HTML to preserve the verified no-JavaScript behavior and avoid layout shift; extracting a component alone does not reduce rendered DOM. |
| R14 | **Confirmed and fixed.** Budget discovery recursively measures actual built HTML while retaining expected mapped routes. Extraction recursively reports and removes obsolete Markdown. Fixtures cover a nested oversize route and a nested obsolete generated page. |
| R15 | **Confirmed and fixed.** Copilot instructions defer to authoritative toolchain declarations and identify tokens.css, the Astro tip roulette, current registry/catalog sources and the complete snapshot contract. |
| R16 | **Confirmed and fixed.** The source integration test skips explicitly if the checkout or pinned commit is unavailable. Unit tests remain standalone; `sync:check` continues to require authoritative sources. The missing-checkout skip path was exercised separately. |
| R17 | **Reproduced and fixed.** All headings participate in source/page slug counters in document order; only root-level H2 headings partition topics. A regression fixture exercises duplicate headings inside blockquotes and lists. |

Research used the [GFM table specification](https://github.github.com/gfm/#tables-extension-), [session storage lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage), [Rolldown code-splitting API](https://rolldown.rs/reference/OutputOptions.codeSplitting), current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), and the installed Astro router/script-inlining implementation. The shadcn review preserves existing semantic tokens and native accessible controls; no framework or component library was added.

### Validation of this remediation

- Clean `npm ci` followed by `npm run verify` on Node 22.22.3/npm 10.9.2: 20 extractor/tooling tests, sync validation, lint, unused-code checks, Astro diagnostics, build and budgets pass.
- New browser regressions: **20 passed** across desktop Firefox/Chromium and mobile Chromium/WebKit. They cover immediate Back/Forward and reload, explicit fresh URL queries, one request after failure, keyboard Retry focus, retained legacy query parameters, native no-JavaScript activation and shared controller loading.
- Payload limits were not raised. Node 22.22.3 measures overview 33,499 raw / 6,944 gzip / 318 elements; docs JS 7,905 gzip and CSS 22,178 gzip. Node 26.10.0 measuring the same built output gives 6,928 overview gzip, 7,938 JS and 22,150 CSS. Both pass existing ceilings; JS and DOM headroom remain narrow.
- Full browser matrix: 273 passed, 4 intentionally skipped, and 5 stale menu-readiness assertions failed. Those assertions now wait on the initialized search control; the five-case rerun passes. All **282 non-skipped cases**, including the four additional changed-index-version cases, passed across the complete matrix and focused rerun. Mobile search results and the native legacy destination were manually inspected at 390px. The Chromium no-JavaScript regression uses native keyboard activation, avoiding its stalled animation-frame stability check for a locator click; the link remains visible and in the viewport.
- An additional 16-case cache/recovery run passed across all four browsers, including changed-version invalidation and unchanged-version request reuse.
- Existing GitHub review comments were rechecked: the engine-range correction and inclusion of generated guide pages in snapshot artifacts remain fixed.

## Second follow-up review — 7 October 2026

**Commit reviewed:** `a029c786b0f2e512fa5c2eebd8933f2010901e4b` — 24 commits, 52 files, +4,687 −2,221 against `main` (`c6d3cde`).

**Extractor schema:** 7. Generated dataset sizes are unchanged in substance: 53 commands, 82 tips, 61 legacy anchor mappings, 11 search index entries.

**CI at time of review:** `verify`, `e2e` and the Cloudflare Pages preview all pass. The blocker recorded in the original review is cleared.

This round supersedes both sections below. It re-runs the original method against the repaired branch rather than trusting the repair commits: the three release-blockers are re-measured independently, the shadcn and Web Interface Guidelines review skills are applied to the changed UI, and a separate correctness pass is run over the whole diff, including a line-by-line scan by an independent reviewer.

### Verdict

The repairs are real, not cosmetic. All three release-blockers from the original review are confirmed fixed by measurement: the mobile layout shift is gone, the Safari search no longer freezes under sustained typing, and tables now behave as the PR originally intended. The shadcn token-discipline and interface-guideline items are closed, and one of the original findings (L7) was rejected with reasoning that is sound and is withdrawn below.

The remaining risk is no longer concentrated. The findings below are largely latent, robustness or efficiency issues on a branch that works; none blocks merge by itself. Two are worth fixing before merge because they are cheap and user-facing: the search URL write lag (R1), which is a correctness regression introduced by the H1 repair itself, and the unguarded prototype lookup in the link rewriter (R2).

### Verification of the first follow-up's repairs

Measured on the reviewed commit against a fresh build, not read from the repair commits.

| Original finding | Independent result | Measurement |
| --- | --- | --- |
| M1 — mobile layout shift | Confirmed fixed | Layout shift at 390 px with the controller delayed 400 ms and 800 ms measures **0.0005**, previously **0.3141**. With JavaScript disabled the menu renders closed and the title, search field and article are all above the fold, where the earlier build filled the first viewport with navigation. |
| H1 — Safari search freeze | Confirmed fixed | Sustained 140-character typing in WebKit: **5 history writes, 0 throws, 0 unhandled rejections**, and the URL query tracks the input exactly (127 characters against 127). The previous build recorded 141 attempts, 41 throws and a frozen search. |
| L1 — table readability | Confirmed fixed | At 390 px `AUTO_PUSHD` renders on one line (84 × 22 px, `white-space: nowrap`) and the table genuinely overflows (`scrollWidth` 351 > `clientWidth` 343), so the existing overflow and tab-stop machinery is now reachable rather than inert. |
| L2 — hardcoded topic count | Confirmed fixed | The heading now renders `{guideTopics.length} topics`. |
| L5 — forced-colors focus | Confirmed fixed | A `@media (forced-colors: active)` block supplies a system-colour outline on the search field. |
| L6 — raw radii | Confirmed fixed | `docs.css` uses `--radius-xl`, `--radius-md` and `--radius-sm`; no raw radius values remain. |
| L8 — sidebar misalignment | Confirmed fixed | The added `padding` is gone from `.docs-sidebar`. |
| L14, L15 — budget gaps | Confirmed fixed | `404.html` and `tips.json` now carry independent ceilings. |
| L18 — duplicate `Contents` | Confirmed fixed | `docs-guide.mjs:67` now rejects a second root-level `Contents` section. |
| L13 — dependency placement | Confirmed fixed | `github-slugger` moved to development dependencies. The follow-up's correction of the original finding is accurate: `DocsLayout.astro` does import the taxonomy module, so the original claim that nothing under `src/` consumes it was too broad. |
| B1 — budget and CI | Confirmed fixed, with a caveat | CI passes. The fix relocated the pressure rather than removing it; see R7. |
| L7 — unconditional tab stops | Rejected with reasoning; accepted | The follow-up argues that a focusable reading block aids reading and selection, that resizing and text zoom can introduce overflow at any width, and that conditional tab stops would require continuous layout observation. That reasoning is sound and the finding is withdrawn. |

### Findings raised in this round

Ordered by user impact, not by fix difficulty. Each was reproduced unless marked otherwise.

#### R1 (high) — the search URL write lags the input, so a fast reload or Back restores a truncated query

`src/components/docs/DocsSearch.astro:53–61`.

The H1 repair replaced per-keystroke history writes with a fixed one-second cadence. The first keystroke still writes immediately; subsequent state is coalesced into a timer that fires up to a second later. Nothing flushes that pending write when the user leaves via reload or Back/Forward.

Reproduced in Chromium against the built site, typing `fakeroot` in about 175 ms:

```
immediately : input "fakeroot", urlQ "f"        (deferred write lands 1.4s later)
after Back  : urlQ "f", input restored as "f"
at reload   : http://…/docs/?q=f  ->  after reload the input is "f"
```

The stale entry is written before the user leaves, so a `pagehide` or `popstate` flush cannot repair it retrospectively; the window has to be shortened or closed at the point of writing. README and AGENTS.md both state that reload and Back/Forward restore results, and they do — but only from a second after the first keystroke. The click handler at `:73` force-flushes before link navigation, so in-page result clicks are unaffected; the exposure is reload, Back/Forward, and any navigation not preceded by a click on an anchor.

This is a regression against the previous commit of this branch, where every keystroke wrote immediately. That behaviour was correct for restore and wrong for Safari; the fix traded a hard crash for a truncation window. **Recommended fix:** lower the rate limit from 1000 ms to roughly 200 ms. Worst-case sustained writes become about 50 per 10 seconds, half of WebKit's 100-per-10-second ceiling, and the window shrinks fivefold.

#### R2 (high) — the link rewriter reads through the prototype chain, injecting JavaScript source into generated Markdown

`scripts/docs-guide.mjs:92`.

```js
const rewrite = (body) => body.replace(/\]\(#([^)]*)\)/g, (match, anchor) => anchors[anchor] ? `](${anchors[anchor]})` : match);
```

`anchors[anchor]` is a prototype-chain lookup, not an own-property test. An intra-guide link whose fragment names an `Object.prototype` member is treated as a mapped anchor and replaced with the member's source text. Reproduced for four anchors: a body containing `[object model](#constructor)` emits `[object model](function Object() { [native code] })` into the published page. `#toString`, `#valueOf` and `#hasOwnProperty` behave the same way.

Reachable only by a maintainer writing such a link in `GUIDE.md`, and the pinned guide contains no colliding anchor — but the failure is silent, publishes a corrupt link, and the same file already performs this lookup correctly elsewhere (`src/layouts/DocsLayout.astro:105` uses `Object.hasOwn`). **Fix:** one line, `Object.hasOwn(anchors, anchor)`.

Two independent reviewers arrived at this finding separately.

#### R3 (medium) — a failed index load re-fetches on every keystroke

`src/components/docs/DocsSearch.astro:33`.

The `catch` resets the memoized `catalog` promise and clears `catalogReady`, so after a single failure every subsequent `input` event calls `load()` again. Typing eight characters with the endpoint aborted produced **8 full requests** against the built site, each also re-rendering the error panel and re-announcing the failure on the live region.

This contradicts the deliberate manual-retry design: the UI offers a Retry button precisely so a transient failure does not become request amplification. **Fix:** leave `catalog` in its rejected state and let the Retry button clear it, or gate re-fetching behind the retry path.

#### R4 (medium) — table-pipe escaping is keyed on the line, not on the table

`scripts/docs-guide.mjs:54`.

Escaping runs only for code spans on lines that begin with a pipe. Two gaps follow, both reproduced directly against `generateGuideDocs`:

- **Rows without leading pipes.** GFM permits table rows written without them. A row `G | \`| grep\`` is emitted unescaped, and re-parsing the generated page splits the cell apart. Verified: `no leading pipes → "G | `| grep`" escaped: false`, against `leading pipes → "| G | `\| grep` |" escaped: true`. Latent; every table in the current guide uses leading pipes.
- Fenced code was the original L17; the follow-up reports it fixed via parsed inline-code ranges, and the pipe-leading fenced example is now asserted byte-for-byte.

**Fix:** decide from the parsed table node rather than the line's first character.

#### R5 (medium) — the docs overview's budget compliance rests on a filename regex

`astro.config.mjs:27`.

```js
assetsInlineLimit: (file) => /(?:DocsSearch|DocsLayout)\.astro/.test(file) ? false : undefined,
```

This predicate is what keeps the overview inside its ceiling: with it active the page is 31,856 raw / 6,839 gzip, and with it not matching — simulated by a rename — the same page becomes 35,734 raw / 8,314 gzip, over **both** the 35,000-byte and 8,000-byte limits. Nothing asserts that the docs routes continue to share a controller URL, so a rename or a third small controller surfaces only as a budget failure with no indication of the cause.

**Fix:** assert the expected controller set, or attach the exemption to an explicit list that fails loudly when it no longer matches anything.

#### R6 (medium) — the legacy-anchor redirect needs JavaScript and discards the query string

`src/layouts/DocsLayout.astro:105`. Two distinct problems in one line:

- `location.replace(links[anchor])` navigates to a bare path, so `/docs/?q=nix#aliases` becomes `/docs/shell-basics/#aliases` and the active search is silently dropped.
- The redirect exists only in a client script. With JavaScript disabled, `/docs/#setup-and-scope` returns 200, keeps the hash, matches no element and scrolls nowhere (verified: `scrollY` 0). `main`'s monolithic guide scrolled to that heading in the same situation.

Non-JavaScript arrival on a legacy deep link is therefore a silent regression for exactly the audience the compatibility mapping exists to serve. **Fix:** preserve the query string when replacing, and emit static per-anchor redirect stubs or landing headings for the no-JS case.

#### R7 (medium) — the budget fix relocated the pressure instead of removing it

`scripts/check-budget.mjs:31`.

Externalizing the guide controllers gave the overview genuine HTML headroom (6,839 against 8,000), but the same code is now counted as an asset. The docs JS budget stands at **7,860 of 8,000 (98.25%)** and CSS at **22,091 of 23,000 (96%)**, against the file's own stated ~15% convention. The measured zlib spread between supported Node lines is ~29 bytes; 140 bytes of JS headroom is roughly five times that, so the next controller change reintroduces the Node-version-dependent red build this PR just spent a round eliminating.

Nothing is broken today. **Fix:** either reclaim payload — the inline anchor map (R8) is the obvious candidate — or adopt a tolerance band so the gate stops being a byte-exact comparison of an environment-dependent metric.

#### R8 (medium) — a 4.6 KB anchor map is inlined on the page with the least headroom

`src/layouts/DocsLayout.astro:90`.

The 61-entry legacy map is serialized into a hidden DOM attribute on every `/docs/` load, although the consumer returns early unless `location.hash` is non-empty. Measured on the built page: **4,646 raw / ~901 gzip**, about 13% of the overview's 6,839 gzip. Removing it drops the page to 27,229 raw / 5,938 gzip.

This is the same data the follow-up chose to retain while solving the budget by externalizing controllers instead. Adopting the on-demand JSON pattern the PR already established for the search index would close the headroom question outright and address R7 at the same time.

#### R9 (medium) — the search index endpoint diverges from the established lazy-data pattern

`src/pages/docs-search.json.ts:4`. `src/pages/tips.json.ts` sets `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`, and `public/_headers:15` repeats it for `/tips.json`. The new `/docs-search.json` sets content type only and has no `_headers` rule, so a 24.5 KB gzip payload falls back to host defaults on every full document load that carries a query.

The `?v=` key covers the shell commit and schema version but not a guide-map edit, so the cache rule and the cache key have to be designed together rather than adding a long `max-age` to the current key.

#### R10 (medium-low) — page descriptions are boilerplate, discarding the authored text

`scripts/extract.mjs:1009`. Generated frontmatter uses a template, so `nix.md` ships `"Nix profiles and pickers from Nirmal's shared Zsh configuration."` while `guideTopics` — which AGENTS.md names as the owner of descriptions, and which the on-page card renders — says `"Manage profiles, select packages, and compare outputs."` All 11 pages' `meta`/`og` descriptions are therefore boilerplate, and the two copies can drift with no test relating them.

#### R11 (low) — every keystroke re-lowercases the whole index

`src/components/docs/DocsSearch.astro:94`. The filter haystack, the sort key and the excerpt lookup each lowercase the full ~65 KB index per keystroke, and all result nodes are rebuilt from scratch. At 4× CPU throttle on a 390 px context this measured ~1.33 ms per keystroke for matching against ~0.11 ms with precomputed fields, with the whole handler between 4.6 and 27.9 ms. **Fix:** store lowercased fields when the catalog resolves.

#### R12 (low) — the topic taxonomy is imported from the markdown parser

`src/layouts/DocsLayout.astro:6`. `guideTopics` lives in `scripts/docs-guide.mjs`, which also imports `mdast-util-from-markdown`, `mdast-util-gfm`, `micromark-extension-gfm` and `github-slugger`. `src/`, the budget gate and two e2e specs therefore pull a parser toolchain for a constant array. These are build-time only and none enters a browser controller, so there is no shipped cost — but the repo's own precedent for this is `src/lib/categories.ts`, which owns data in a dependency-free module. **Fix:** move the taxonomy to a dependency-free module the extractor imports.

#### R13 (low) — the topic navigation is duplicated byte-for-byte

`src/layouts/DocsLayout.astro:43` and `:51`. The desktop surface and the mobile `<details>` contain the same `pages.map` expression, so numbering, `aria-current` and any future badge or sub-link must be edited twice and can drift without a test noticing. The duplicate also consumes roughly 22 elements of the overview's 290-of-320 budget and about 24 per topic page. The responsive-CSS approach is sound; only the markup needs extracting.

#### R14 (low) — nested docs routes are neither measured nor reported

`scripts/check-budget.mjs:37` discovers topic routes one directory deep, while `src/content.config.ts` uses `glob('**/*.md')`. A page at `src/content/docs/docs/notes/extra.md` builds to `/docs/notes/extra/`; the gate then seeds a budget for the non-existent `docs/notes/index.html` and fails with a misleading "missing from dist" message (reproduced against a fixture), while the real page receives no budget at all and the extractor's obsolete-file scan never reports the stray file.

#### R15 (low) — the standing agent instructions are now stale

`.github/copilot-instructions.md:5`. It still states "Node.js 22.12 or newer and npm 9.6.5 or newer" while `package.json#engines` is `^22.22.3 || ^24.16.0 || >=26.3.0` under `engine-strict=true`, so following it produces an `EBADENGINE` failure during `npm ci`. It also still locates the semantic tokens in `src/styles/global.css`, which now contains no `:root` block at all — an invitation to reintroduce a competing token block in the file that is imported *before* `tokens.css`.

#### R16 (low) — `npm run test:extract` now requires the private shell checkout

`scripts/extract-integration.test.mjs:15`. The new integration test clones the shell repository and checks out the pinned commit unconditionally, so the documented standalone static gate no longer runs without it — on a fresh clone or a fork, `npm run test:extract` fails with a raw git exit-128 rather than skipping. `sync:check` already required the sources; this newly extends the requirement to the unit-test step. **Fix:** skip with an explicit message when the source tree or pinned commit is absent.

#### R17 (low, not asserted) — nested headings may shift duplicate-slug counters

A separate reviewer reported that legacy anchors are computed from top-level Markdown headings only while the renderer slugs every rendered heading, so a heading nested in a blockquote or list item would shift the renderer's duplicate-slug suffix away from the generated map. The reviewer's own confidence was low, and by their account `docs.spec.ts` would fail the build rather than ship the break. **Not reproduced here; recorded as a hypothesis, not a finding.**

### Limits of this round

- Physical-device Safari remains untested; WebKit findings come from the Playwright WebKit build, as before.
- The back/forward cache was investigated and found **inconclusive**: bfcache did not engage on any route in the headless Chromium used here, including controls, so the newly added `beforeunload` listener could not be shown to change restore behaviour either way. It is not recorded as a finding.
- The URL-lag window (R1) was measured in Chromium only. The mechanism is shared, but Firefox and WebKit timings were not measured.
- R5's regression was demonstrated by simulating a rename in `astro.config.mjs`; the rebuild was reverted and the tree left clean.
- R11's timings are from a single 4× CPU-throttled run and are indicative of magnitude, not a benchmark.

### Remediation order for this round

1. **R2** — one-line `Object.hasOwn` fix in the link rewriter. Two reviewers converged on it independently.
2. **R1** — shorten the history write cadence so reload and Back/Forward cannot restore a truncated query.
3. **R9** and **R3** — cache header for the index endpoint, and stop re-fetching it on every keystroke after a failure.
4. **R7**, **R5**, **R8** — reclaim the headroom (the inline anchor map is the natural source) and assert the controller set so the budget stops depending on a filename regex.
5. **R6** — preserve the query string through the legacy redirect and cover the no-JavaScript path.
6. **R4**, **R10**, **R11**, **R12**, **R13**, **R14**, **R15**, **R16** — parser precision, description ownership, search efficiency, module boundary, markup duplication, gate coverage, stale instructions, and test portability.

### Method notes for this round

- Repairs were verified by measurement against a fresh `npm run build` served as static files, not by reading the repair commits.
- Layout shift: `PerformanceObserver` on `layout-shift` installed via `addInitScript`, with the controller delayed 400 ms and 800 ms through `page.route`, plus a `javaScriptEnabled: false` control for the pre-hydration paint.
- Safari behaviour: `history.replaceState` wrapped before page scripts ran, counting attempts, throws and `unhandledrejection`, under 140-character sustained typing at 15 ms intervals.
- URL lag: fast keystroke bursts with the URL read immediately and again after the deferred write, then Back and reload inside the window.
- Table behaviour: measured `scrollWidth` against `clientWidth` and the rendered geometry of an identifier cell at 390 px.
- Parser gaps: direct calls to `generateGuideDocs` with synthetic guides exercising pipe-leading and non-pipe-leading table rows.
- The full diff was additionally reviewed by an independent correctness pass and a separate line-by-line scan, whose findings are folded in above; duplicates between the two are noted once.

## First follow-up assessment and independently developed repairs (historical) — 7 October 2026

The original review below is a historical record of `46e4369`. This section superseded its verdict and remediation order until the second follow-up above. Each of its 25 findings was checked against the implementation, the CI failure log, the pinned source checkout, browser behavior, or a regression fixture. The proposed patches were not adopted as a plan: the repairs below were chosen from the underlying platform and parsing behavior.

### Disposition of every finding

| Finding | Assessment | Result and evidence |
| --- | --- | --- |
| B1 | Valid; fixed | CI run `37573837801` confirms 8,013 gzip bytes. Astro's build plugin was repeating small controllers inside each HTML document. Emit only the two shared guide controllers as cacheable assets, retain the inline legacy mapping, and retain every existing limit. Exact Node **22.22.3 / npm 10.9.2** verification passes; overview HTML is **6,858 B gzip** versus the unchanged **8,000 B** ceiling. No tolerance band or toolchain bump is used. |
| H1 | Valid; fixed | History writes were outside filtering's error handling. Use a fixed one-second write cadence that coalesces pending query state, handles rejection independently, retries, and flushes before link navigation, reload, or Enter. Filtering remains independent of history. Real 140-character typing and an injected `SecurityError` exercise both paths on all browser projects. This is not a per-keystroke trailing debounce. |
| M1 | Valid; fixed | The server-rendered `open` attribute created the mobile collapse. Render a desktop navigation surface and a closed native mobile disclosure, selected entirely by responsive CSS. No initial script changes their open state. Both remain usable without JavaScript; delayed-controller CLS and no-JavaScript navigation have coverage. |
| M2 | Valid; fixed | Derive search text from Markdown syntax nodes rather than removing marker strings. Emphasis nodes contribute their content; inline/fenced code contributes its literal value. Tests retain `**/*.js`, `**/*(D)`, identifiers, and shell pipes. |
| M3 | Valid; fixed | The same structural extraction excludes code-fence metadata, list delimiters, quote delimiters, and reference definitions without discarding their content. Queries still match real occurrences of `text` or `zsh`. |
| L1 | Valid existing readability issue; fixed | Keep only code spans inside tables unbroken (`white-space: nowrap`); prose still wraps. A 320px browser test checks the identifier's one-line geometry, actual overflow, focus, and ArrowRight scrolling. |
| L2 | Valid; fixed | The displayed topic count now comes from the taxonomy length. |
| L3 | Valid; fixed | Announcements are coalesced at a fixed 500ms cadence and identical messages are not rewritten. A loaded catalogue no longer emits a transient “Searching…” message for each key. MutationObserver coverage verifies an unchanged result count causes no mutations. |
| L4 | Valid; fixed | Excerpts expand their context to whitespace boundaries at both ends. A synthetic index with repeated complete words verifies rendered excerpts do not split them. |
| L5 | Valid; fixed | Forced-colors focus uses a real outline with the system `Highlight` color on the compound search field. Chromium's forced-colors test inspects the actual focused outline; unsupported emulation is explicitly skipped elsewhere. |
| L6 | Valid small consistency issue; fixed | Documentation border radii now consume the shared radius scale. Spacing values remain spacing values. |
| L7 | Observation correct; retain intentional behavior | A focusable reading block is not an accessibility violation solely because it fits at one width. Stable keyboard access also supports reading and selection, while resizing/text zoom can introduce overflow. Conditional tab stops would require continuous layout observation and would change the existing reading contract. Keep the deliberate behavior and its focus tests; do not describe every block as overflowing. The table readability repair addresses the demonstrated usability defect. |
| L8 | Valid; fixed | Remove the additional sidebar padding, restoring the card's content-shell alignment. Existing inner menu padding already contains link focus outlines; short-viewport keyboard tests check the resulting visibility. No negative-margin compensation is used. |
| L9 | Valid; fixed | Seed expected topic routes from the taxonomy before examining build output. A missing entire topic directory now fails the gate. A test executes the real budget script against a complete fixture and then deletes a mapped directory. Contrary to the original wording, the existing reflow test already visited every `guideTopics` entry; browser coverage alone was still insufficient for the static gate. |
| L10 | Risk valid; diagnostic fixed | An interpolated path cannot be measured as a concrete file. Keep fail-closed accounting, report an explicit unsupported-interpolation diagnostic, and let the gate report it without an uncaught stack trace. The synthetic interpolation fixture verifies this. Silently skipping it would risk undercounting. |
| L11 | Not a defect requiring removal; wording clarified | Zero additional matches in one build does not invalidate support for statically named backtick imports. The generic traversal and regression are useful and cheap. Retain them; README now describes supported static references and interpolation failure without claiming an observed reduction or extra assets in this build. |
| L12 | Valid maintenance issue; fixed | Parse the workflow as YAML and identify the export step by a stable semantic ID. Execute its actual `run` value. Name, whitespace, and block-style formatting no longer drive extraction; fixtures live in the OS temporary directory and are cleaned in `finally`. |
| L13 | Placement valid; corrected | Move `github-slugger` into development dependencies with the extraction tools. The assertion that nothing under `src` imports the module was too broad: `DocsLayout.astro` imports `guideTopics` from the shared extraction module. This occurs at build time; none of these parsing dependencies enters a browser controller. |
| L14 | Valid existing guard gap; fixed | Add a 404 HTML/DOM budget: **30,000 B raw / 6,800 B gzip / 150 elements**, plus existing default JS/CSS/font ceilings. It covers the measured 25,435 B raw / 5,795 B gzip CI-runtime build with deliberate headroom. No existing ceiling was raised. |
| L15 | Valid existing guard gap; fixed | Add an independent on-demand `tips.json` ceiling: **21,000 B raw / 4,500 B gzip**, based on the measured 18,086 B / 3,801 B CI-runtime payload. JS is still a JS metric, not a total-transfer metric; the separate data gate closes the actual omission. |
| L16 | Valid latent defect; fixed | Use the CommonMark parser for block boundaries rather than a custom fence state machine. A fixture includes a same-delimiter info string, a four-space fake closer, and apparent H2 headings that must remain code. |
| L17 | Valid latent defect; fixed | Apply table compatibility escaping only to parsed inline-code source ranges. Fenced/indented code is opaque and is not rewritten; the pipe-leading fenced example is asserted byte-for-byte. |
| L18 | Valid latent defect; fixed | Reject multiple root-level Contents sections explicitly. The single existing contents section continues to map to topic cards. |
| L19 | Valid latent defect; fixed | Heading text comes from parsed inline content, so link labels, emphasis, code spans, and literal trailing `#` follow Markdown semantics. Slugging uses that rendered text. Fixtures check formatted duplicate headings and accurate C# diagnostics; browser coverage checks every generated legacy target against actual HTML IDs. |
| L20 | Coverage gap valid; strengthened | Add negative parser fixtures, missing-route budget coverage, interpolation diagnostics, and an extraction integration test. The latter clones the actual pinned shell commit locally, runs the extractor in a separate project, deletes both guide JSON outputs and a topic, adds an obsolete topic, checks the diagnostics, syncs, and compares restored outputs byte-for-byte. The shell source checkout is never modified. |

### Research and design basis

- [History API exceptions](https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState): history failure must not be a dependency of search rendering; browser limits are implementation-dependent.
- [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/): code, headings, emphasis, and fence boundaries are grammatical constructs rather than independent substitutions.
- [mdast parser API](https://github.com/syntax-tree/mdast-util-from-markdown) and [GFM extension](https://github.com/syntax-tree/mdast-util-gfm): source positions allow targeted table repair while node types provide plain text without destroying shell syntax.
- [Astro configuration](https://docs.astro.build/en/reference/configuration-reference/#vite), cross-checked against the installed `plugin-scripts.js`: the asset-inline predicate controls whether small shared controllers are repeated in HTML. The predicate is limited to the guide's two components.
- [Forced-colors behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors): shadows do not provide a reliable forced-color focus indicator; an outline using a system color does.

### Follow-up validation

The complete snapshot was regenerated with extractor schema **7** from clean shell commit `9334c409`. Only the search index and schema metadata changed; command/tip datasets, topic Markdown, and the 61 legacy mappings remain identical. The new parser/YAML dependencies are development tooling and are not shipped in the guide controllers. The existing seven high-severity shadcn development-tree audit entries remain disclosed and unchanged.

Exact CI-runtime static verification passes all **16** parser, integration, workflow, and asset tests; source consistency, lint, dead-code analysis, Astro types/build, and every budget pass. The complete four-project browser run reported **257 passed, 4 intentionally skipped, 1 failed assertion**. The new scroll test initially required overflow at 390px, which is not necessary when a readable table fits; it now measures the supported 320px minimum after fonts load. That case passed in all four projects on rerun. The sustained-typing rate assertion also uses elapsed time instead of a hardware-dependent absolute call count; its final four-project rerun passes. All **258 non-skipped cases** have passed across the complete run and focused reruns. The four skips are two existing clipboard-permission cases and two browsers without forced-colors emulation.

Manual Chromium review checked 390px search results and unbroken identifiers, 320px keyboard table scrolling, and the focused desktop Maintenance link at 1440×500. Heading and menu card left edges both measure **228.5px**; the semantic radius resolves to **11.2px**. Checked pages reported no page errors. Independent 390px layout-shift measurements with 400ms and 800ms controller delays both measured **0.00114348**, with the mobile menu closed throughout. These are controlled browser measurements, not physical-device Safari or a universal performance score.

## Original verdict (historical)

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

## Original remediation order (superseded by the follow-up above)

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
