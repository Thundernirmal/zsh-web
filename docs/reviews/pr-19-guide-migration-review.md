# PR #19 “Sync shell reference and add docs matching the website”: full review

**Completed:** 7 October 2026.

**Pull request:** https://github.com/Thundernirmal/zsh-web/pull/19

**Commit reviewed:** `46e4369d75bea3cdf715824e26f45907b5be6ab6` — 16 commits, 48 files, +3,124 −2,214 against `main`.

**Base:** `main` at `c6d3cde`.

**Shell source pinned by the branch:** `Thundernirmal/zsh` at `9334c4090dbc0490b5682ce03cff2c2e29e0ffbd`.

**CI at time of review:** `verify` **failed** (run `37573837801`); `e2e` was **skipped** because it depends on `verify`. The preceding run (`37571833320`, commit `164ff01`) was green.

## Fifth follow-up review and merge decision — 7 October 2026

**Commit reviewed:** `856f5873ea3b74c464c6eaf6eed7cd589290ed11` — 48 commits, 64 files, +5,934 −2,297 against `main` (`c6d3cde`).

**Published PR head:** `856f587` — identical to the reviewed revision. Local, remote and PR head agree; `git rev-list --left-right --count` reports `0 0`. The divergence that blocked the previous round is resolved.

**Extractor schema:** 8.

**CI at time of review:** `verify`, `e2e` and the Cloudflare Pages preview all **pass** on this head.

This round supersedes the earlier rounds; its remediation assessment follows these findings. It re-measures the previous round's remediation against a fresh build, applies the shadcn and Web Interface Guidelines review skills to the changed UI, and runs a fresh correctness pass over the whole diff (ten finder angles plus a sweep) whose findings are reproduced individually where marked *verified* below.

### Merge decision

# NO

Do not merge yet. This is a much closer call than the previous round — the structural blocker is gone and the remaining list is short — but three verified items should be cleared first, one of which is a correctness regression this branch introduced.

**The previous round's blocking condition is resolved.** All nine previously-unpushed commits are now published, the PR head equals the reviewed revision, and CI is green on it. The `:has()` repair is also genuinely fixed this time, and in the right way: rather than splitting the selector list around the problem, `:has()` was removed entirely and replaced with `:not(:target)`. The emitted stylesheet now carries three separate, universally-supported rules with nothing for the minifier to recombine:

```
dist/_astro/_..Cgz_smbj.css:[data-legacy-links]{display:contents}
dist/_astro/_..Cgz_smbj.css:[data-legacy-links]>a:not(:target){display:none}
dist/_astro/_..Cgz_smbj.css:[data-legacy-links]>a:target{scroll-margin-top:…;display:block}
```

**What still blocks.**

**1. The per-entry query snapshot corrupts the router's history state (V2, verified).** The snapshot identity is stamped onto `history.state` — an object the router also owns. When the entry's state is `null`, which is exactly what a same-document fragment navigation leaves behind, the spread produces a state object with no `index` field and the entry never regains one. Verified in Chromium:

```
1) arrive at /docs/nix/#picker-cache-and-dependencies via fragment:  state null
2) type in the guide search:  state {"docsQueryId":"5b891b75-…","scrollX":0,"scrollY":236}   ← no index
3) after a later push and Back:  state unchanged, index undefined
```

Arriving on a fragment and then searching is an ordinary path — it is precisely what the legacy compatibility layer exists to serve. Astro's router derives its traversal bookkeeping from `state.index`; the reported consequences are misclassified transition direction and lost scroll restoration. The deeper issue is ownership: application data does not belong in the router's state object. Storing the query directly in `history.state` (which the browser already keeps per entry) would give stable identity without writing into the router's namespace.

**2. The PR body is materially inaccurate about a raised performance ceiling (V1, verified).** The body states, in three separate places, that no budget moved:

> "Restore the docs JavaScript allowance to **8 KB gzip**"
> "No existing ceiling is raised; narrow JS/DOM headroom is documented as a continuing constraint"
> "Budget limits remain unchanged."

The code says otherwise: `scripts/check-budget.mjs:33` sets `docsAssets = { jsGzip: 9_500, … }`, and the build measures **8,778 gzip** — above the former 8,000 ceiling, so the raise is load-bearing rather than headroom. The body's own measurement table still reads `7,905 B gzip`. AGENTS.md is explicit that raising a limit in this file is a deliberate performance decision needing its own commit and stated rationale, and that the PR body must let a reviewer map every body line to commits and back. Here a reviewer following the description would conclude the opposite of what the diff does. This is a documentation fix, not a code fix, but it is the item most directly governed by a written project convention.

**3. A navigation link lost its label and its link affordance (V3, verified).** The documentation-snapshot commit link now renders as a bare hash with no styling, where `main` labelled it:

```
aside text: "Documentation snapshot9334c409View GUIDE.md source"
commit link:  name "9334c409",  text-decoration: none,  color rgb(203,166,247)
sibling link: name "View GUIDE.md source",  text-decoration: underline
.docs-source elements matching: 0
```

The accessible name is an unlabelled eight-character SHA, the two links in the same list are distinguished only by colour (WCAG 1.4.1), and `.docs-source` — the selector `global.css` still styles — matches nothing, so those rules are dead. Link lists read a bare hash to screen readers with no indication of what it points at.

### What would make this a yes

1. Stop writing application data into `history.state`; give the query snapshot an identity the router does not own, so a null-state entry cannot lose its `index` (V2).
2. Correct the PR body's budget statements and record the docs JS raise from 8,000 to 9,500 as the deliberate, justified decision AGENTS.md requires — or bring usage back under the original ceiling (V1).
3. Restore the commit link's label and link styling in the snapshot block, or confirm the removal is intentional (V3).
4. Worth doing alongside, though not blocking on its own: give the lazy index fetch a timeout or `AbortSignal` (V4), and pick up the smaller consistency items listed below.

### Verification of the previous round's remediation

Measured against a fresh build of `856f587`.

| Previous finding | Independent result | Evidence |
| --- | --- | --- |
| U1 — `:has()` repair defeated by the build | **Confirmed fixed** | `:has()` removed entirely in favour of `:not(:target)`; the emitted CSS contains three separate rules with no selector list for the minifier to recombine. Verified by building and inspecting `dist/_astro/*.css`. |
| U2 — `components.json` breaks the shadcn CLI | Confirmed addressed | The shadcn import and font mapping were moved so the configured stylesheet is the one the CLI reads (commit `3cf4fc8`). |
| U3 — legacy redirect leaks a link, leaves null state | Confirmed addressed for the full-load path | Native fragment targets and router history are preserved (commit `ffbb5f0`). The in-page path is where V2 now surfaces. |
| U4 — restore key not unique per entry | Addressed in intent; replaced by a new defect | Identity is now a per-entry id, but it is stored in the router's state object, which is the mechanism behind V2. |
| U5 — stale rejection re-arms the failure | Confirmed addressed | Stale index failures are ignored after navigation (commit `a9a9d34`). |
| U6 — disabled input is a dead end | Confirmed addressed | Native recovery is offered when initialisation fails (commit `4aa07d9`). |
| U7, U15 — route validation and label derivation | Confirmed addressed | Routes are validated and labels derived from the guide taxonomy (commit `339ef7c`). |
| U11 — commands loop overwrites explicit ceilings | Confirmed fixed | `ec883f0` applies the `??=` policy to command routes as well. See V12 for the remaining duplicate literal. |
| U14 — test pinned generated prose | Confirmed fixed | `d70c37c` decouples the quote-search coverage from guide text. |

### Findings raised in this round

Ordered by user impact. *Verified* means reproduced here; the remainder are recorded from the correctness pass and its verifier agents, none of which were refuted.

#### V1 (high) — the PR body denies a budget raise the code performs *(verified)*

`scripts/check-budget.mjs:33` against the PR description. See the merge decision above for the quoted text and measurements.

#### V2 (high) — the query snapshot writes into the router's history state and can strand an entry without an index *(verified)*

`src/components/docs/search.ts:48`. See the merge decision above for the reproduction.

#### V3 (medium) — the snapshot commit link lost its label and link styling *(verified)*

`src/layouts/DocsLayout.astro:76`. See the merge decision above for the measurements.

#### V4 (medium) — the lazy index fetch has no timeout, so a stalled request pins search in "Searching…"

`src/components/docs/search.ts:95`. `load()` memoises the pending promise and the fetch carries no `AbortSignal`, so a request that accepts but never completes leaves the status at *Searching…* indefinitely, with the error block, Retry and reload affordances all gated on state that is never reached. Reported as reproduced against the built site with a never-fulfilling route: after 13 s the status was unchanged, every recovery affordance was hidden, and a second query reused the same pending promise.

#### V5 (medium) — the legacy redirect can truncate a just-typed query

`src/components/docs/layout.ts:13`. The redirect copies the 1-second-throttled `location.search` into the destination, so a query typed within the coalescing window is carried across as its earlier value, and the fresh load reads the stale URL rather than the session snapshot. Reported as reproduced in Chromium and WebKit.

#### V6 (medium) — the docs keyboard shortcut diverges from the site's shared contract

`src/components/docs/search.ts:148`. It accepts only lowercase `k`, so `Shift+Ctrl/Cmd+K` does nothing on docs pages while `/commands/` and `/tips/` accept either case via `src/hooks/useSlashFocus.ts`, and it omits `select()`, so typing appends to the existing query instead of replacing it.

#### V7 (medium) — route validation is one-directional

`src/pages/docs/[...slug].astro:8`. Registered topics with no generated page are not caught, so `npm run build` alone can ship links to routes that do not exist — and `README.md` documents Cloudflare Pages building with exactly that command.

#### V8 (medium) — `crypto.randomUUID` is unavailable outside secure contexts

`src/components/docs/search.ts:47`. On a plain-HTTP origin — a normal way to review mobile widths over a LAN — `entryKey()` throws on every keystroke and all three call sites swallow it, so the entire snapshot layer silently no-ops and restore degrades to the possibly-truncated URL value.

#### V9–V15 (low) — consistency and dead-code items

- **V9** `search.ts:64` — `remember()` sits inside the same `try` as `history.replaceState`, so an edit whose history write is rejected never reaches session storage.
- **V10** `search.ts:9` — `normalize()` reconciles quote characters only; prose dashes and ellipses would remain unfindable if the upstream guide ever uses them. No live mismatch today.
- **V11** `search.ts:28` — the `data-ready` flag is published before the element lookups and listener wiring, so a partial initialisation disables both recovery paths.
- **V12** `scripts/check-budget.mjs:36` — the docs payload/DOM budget literal is duplicated verbatim in two loops, unlike the shared `docsAssets` constant.
- **V13** `src/pages/docs-search.json.ts:5` — the endpoint's `Cache-Control` is inert for static output and duplicates `public/_headers`, which has already drifted once for `/tips.json`.
- **V14** `src/components/docs/DocsSearch.astro:18` — the server-rendered `href` on the reload link can never be followed; the watchdog overwrites it before revealing it.
- **V15** `scripts/docs-guide.mjs:29` — `guideSearchIndex` re-parses all eleven page bodies even though the same run has already parsed them three times.

### Limits of this round

- V1, V2 and V3 were reproduced directly; V4–V15 are recorded from the correctness pass and its verifier agents and were not re-run here.
- The downstream consequences of V2 (misclassified transition direction, lost scroll restoration) are as reported by the verifier; this review confirmed the corrupted state object itself, which is the mechanism.
- CI status was read at the time of review and may change; re-check before merging.
- Physical-device Safari remains untested throughout this series; WebKit findings come from the Playwright WebKit build.
- This round did not re-audit the shell-reference datasets or generated guide content.

### Method notes for this round

- Published-versus-local parity was established with an explicit `git fetch` followed by `git rev-list --left-right --count`, not from cached remote-tracking refs.
- The `:has()` repair was confirmed by building the working tree and inspecting the emitted `dist/_astro/*.css`.
- The history-state defect was reproduced in Chromium by arriving on a fragment through a same-document navigation, typing into the guide search, then pushing and traversing, reading `history.state` at each step.
- The snapshot regression was measured by reading the aside's accessible names, computed `text-decoration-line` and colours, and counting `.docs-source` matches in the built page.
- The budget discrepancy was measured with `npm run budget` and compared against the published PR description.

## Independent assessment and remediation of V1–V15 — 8 October 2026

Assessed the fifth round against `856f587`. The findings above are preserved as the historical record; this section records the implementation decisions and final verification for the new repairs.

| Finding | Disposition | Change or evidence |
| --- | --- | --- |
| V1 — PR body denies the docs JS increase | **Fixed in PR metadata** | Updated PR #19 to state the deliberate increase from 8,000 to 8,500 (`ef2d338`) and then 9,500 bytes (`d28e6b4`), its rationale, current measurements, every subsequent review repair and final validation. Read back the published body and confirmed it matches the prepared description. These changes fit 9,500 without another ceiling increase. |
| V2 — native fragment query state lacks a router index | **Fixed** | A shared helper restores complete router fields before a native fragment receives a new query identity; ordinary fragments now go through Astro's navigator as well as legacy fragments. Legacy replacement passes custom state through Astro's supported `state` option. Query-result restoration no longer triggers desktop scroll anchoring that overrides the router's saved position. Pending URL timers are canceled at navigation preparation so an outgoing controller cannot overwrite a traversal destination before the document swap. Browser coverage checks numeric index/scroll fields, full query restoration, exact saved scroll, Back and Forward, and a held traversal fetch across the URL timer deadline. |
| V3 — source commit label and link affordance | **Fixed** | The snapshot link reads `Source commit <sha>` and uses the shared underlined `text-link` style. Removed unused `.docs-source` rules while retaining the Markdown link rules. Browser coverage checks the accessible name, pinned destination, computed underline and actual keyboard focus. |
| V4 — indefinitely pending index | **Fixed** | Each index request has an AbortController and ten-second timeout, cleared on settlement. Timeout reaches the existing error/Retry path without losing the query. A controlled stalled-request test advances time, retries successfully and checks returned input focus; successful lazy caching and stale-request protection remain covered. |
| V5 — legacy redirect copies a stale query URL | **Fixed** | Before navigating, the active search controller supplies the full current input to the destination URL. The bridge preserves unrelated URL parameters and does not depend on the coalesced URL write succeeding first. Browser cases cover both cross-topic `#aliases` and same-topic `#contents` while the URL still contains the earlier query. |
| V6 — shortcut case/selection differs from shared search | **Fixed** | Ctrl/Cmd+K accepts either case and selects the query; slash retains focus-only behavior. Tests execute all four Control/Meta and shifted/unshifted combinations, assert focus and selection, and type replacement text. |
| V7 — registered pages can be missing from the collection | **Fixed** | The existing `getStaticPaths` validation now rejects missing registered ids alongside unknown ids, with aggregate diagnostics. `npm run build` therefore enforces the complete route set independently of CI's snapshot/budget gates. Unit coverage checks missing pages and combined errors. |
| V8 — randomUUID requires a secure context | **Fixed** | Identity generation uses `crypto.getRandomValues`, available on insecure HTTP origins, rather than `randomUUID`. A browser fixture serves the site at a controlled plain-HTTP origin, asserts `isSecureContext === false`, and verifies complete pending-query restoration and identity persistence on reload. |
| V9 — a rejected URL write loses the snapshot | **Not a live defect** | The input handler already calls `remember()` before `syncUrl()`, and Clear does the same. A rejected URL write cannot erase that stored edit. Strengthened the existing rejection test to check the stored query before the retry succeeds. The extra remember call inside the successful URL flush is not the only storage path. |
| V10 — future typography could need dash/ellipsis matching | **Deferred; no present mismatch** | The review explicitly reports no current mismatch. Broader punctuation folding would need defined behavior for literal shell syntax such as `--` and `...`, plus a demonstrated rendered/authored mismatch. Existing curly/straight quote coverage and authored code preservation remain intact. |
| V11 — readiness published before initialization completes | **Fixed** | Required controls are validated before listener installation, and the input is enabled and `data-ready` published only after setup completes. A missing-template fixture confirms the control stays disabled, readiness stays absent, the independent watchdog reveals native reload, and reloading repaired HTML initializes normally. |
| V12 — repeated docs HTML/DOM limit object | **Fixed** | Both taxonomy and discovered-route loops consume one `docsBudget` constant. Values and explicit-route precedence are unchanged. |
| V13 — static endpoint repeats an inert cache header | **Fixed** | Removed the static JSON endpoint's Cache-Control declaration. `public/_headers` owns the production cache policy; the endpoint retains the JSON content type. The generated JSON bytes are unchanged. |
| V14 — reload link's initial href is overwritten | **Intentional; retained** | The hidden server anchor has a valid route destination, satisfying native-link markup and accessibility lint. The independent watchdog assigns the full live URL before exposing it, preserving query/hash. It is not a user-visible dead destination; existing failed-chunk and partial-init tests activate the revealed native link successfully. Removing a required valid href or replacing it with a placeholder would not improve behavior. |
| V15 — index re-parses page bodies | **Retained; different parse inputs** | The earlier passes parse the whole source for code-span ranges, the pipe-masked probe for GFM table recognition, and the repaired whole guide for heading ownership. They are not trees for the eleven final page bodies after partitioning and link rewriting. Reusing them directly would change parser semantics; no measurable extraction bottleneck was demonstrated. Existing semantic and snapshot tests validate the current output. |

### Repair commits

- `3f2aed1` — V2/V8 router-state, scroll restoration and HTTP-safe snapshot identity; strengthened V9 evidence.
- `e26a5d4` — V5 complete live query on legacy redirects.
- `afe53fe` — V4 stalled-index timeout and retry.
- `e3fd9f8` — V6 keyboard shortcut case and selection.
- `eeccc9b` — V11 complete initialization before readiness.
- `605cff8` — V3 labelled, underlined source link and obsolete styles.
- `89ec555` — V7 missing registered route rejection.
- `dcd5f8f` — V12 shared default docs page limit object, unchanged ceilings.
- `164158a` — V13 static cache policy owned by hosting headers.
- `0b4c3ce` — updated behavior documentation.
- `4296f79` — cancel outgoing URL timers at navigation preparation; deterministic slow-traversal regression and settled Back/Forward reload fixture.
- `ef0a914` — poll actual search island hydration before leaving Commands/Tips in the shared navigation fixture, preserving `client:visible`.

### History-state ownership clarification

The reproduced missing-index defect in V2 is valid. The broader claim that application data cannot coexist with router state is not Astro's contract: the installed navigator exposes `NavigateOptions.state`, and its router spreads that state alongside its reserved `index`, `scrollX` and `scrollY` fields. The repair preserves those fields and keeps only the query identity in its separate field; query text remains in tab-local storage. Moving the full query into history on every keystroke would also undo the existing Safari-safe write cadence. The defect was incomplete state after native fragment creation, rather than the mere presence of custom state.

### Full-matrix race investigation

The first complete rerun exposed two WebKit query-restoration failures. Temporary event diagnostics confirmed a connected outgoing controller could flush an empty query into the already-selected Back destination before `astro:before-swap`. Canceling the URL timer at `astro:before-preparation` closes that interval. The regression now holds the Back fetch and advances the clock beyond the timer deadline, then checks the destination URL, snapshot and restored scroll. The older reload fixture also waits for the actual home document before Forward, so it no longer cancels a still-pending Back swap and reloads an intermediate document. Both cases pass **24 repeated executions** across all four browser projects after the repair. Temporary diagnostics were removed. A separate intermittent React #424 failure in the existing Commands/Tips navigation fixture was resolved by polling actual shortcut focus before leaving each visible island, following the repository hydration contract without changing the directives. That fixture passes **20 repeated executions** across the matrix. Final complete-matrix results follow below.

### Validation and publication

- `npm run verify` passes on Node 26.10.0: all **25** tooling/extractor tests, source consistency, lint, dead-code checks, Astro diagnostics, production build and every payload/DOM budget. Docs JavaScript is **9,051 B gzip** against the existing **9,500 B** ceiling; overview HTML is 34,139 B raw / 7,168 B gzip with 313 elements, docs CSS is 22,122 B gzip, and the lazy index is 65,597 B raw / 24,513 B gzip. No ceiling is changed in this repair round; generated snapshots are unchanged.
- Final `npm run test:e2e -- --workers=2` passes the complete Firefox, WebKit, desktop Chromium and mobile Chromium matrix: **366 passed, 4 intentionally skipped**, no failures. The targeted repeated traversal/reload and navigation checks also pass, as recorded above.
- Manual collaborative-browser review at **320px and 390px** covers readable search results, the labelled and underlined source commit, ordinary and legacy native heading navigation, valid router state, and contained code/table overflow. A focused overflowing table scrolls horizontally with ArrowRight (0 → 40px) without page overflow. Physical-device Safari remains untested.
- PR #19 description is corrected and verified by reading it back. The latest user request explicitly authorizes committing **and pushing**, superseding earlier local-only handoffs. After a fresh fetch, the remote has no commits absent locally (`0 12` before this record commit); publication follows committing this record. The final published head and fresh CI status are checked and reported in the handoff, rather than attributing the older head’s green checks to these repairs.

## Fourth follow-up review and merge decision (historical) — 7 October 2026

**Commit reviewed:** `105633aa4af3d7aec245485b343af50e3e725952` — 38 commits, 62 files, +5,472 −2,229 against `main` (`c6d3cde`).

**Published PR head:** `11a94d4403d209d5d6574a682e463f8d16e49f9f` — **9 commits behind the reviewed revision.** Verified against the remote after an explicit `git fetch`; `git rev-list --left-right --count` reports `0 9`.

**Extractor schema:** 8.

**CI at time of review:** `verify`, `e2e` and the Cloudflare Pages preview pass on `11a94d44`. **The nine unpushed commits have never been through CI.**

This round supersedes the earlier review rounds; the remediation assessment follows its findings. It re-measures the previous round's remediation against a fresh build, applies the shadcn and Web Interface Guidelines review skills to the changed UI, and runs a fresh correctness pass over the whole diff (ten finder angles plus a sweep). Every finding marked *verified* below was reproduced here; the rest are recorded as reported.

### Merge decision

# NO

Do not merge this pull request in its current state.

The decision rests on three independent grounds, in order of weight.

**1. The pull request is not the code that has been reviewed.** The published head is `11a94d44`; the reviewed and repaired revision is `105633a`, nine commits further on. Every finding from the previous round — the router-state desync, the symlink deletion, the quote mismatch, the failing `:has()` rule, the budget coupling — is addressed in commits that exist only on the local branch. The green CI run on `11a94d44` therefore certifies a revision that still contains all of them. Merging now merges the unrepaired code. This alone is disqualifying, and it is also the cheapest to fix: push the branch, then let CI run on the head that actually contains the work.

**2. Two of the repairs do not survive into the artifact, or introduce a regression.** Both were verified here, not inferred:

- The `:has()` repair is undone by the build. The source now correctly splits the selector into two rules (`src/styles/docs.css:75–76`), but the build's Lightning CSS pass re-merges them into a single selector list, so the shipped stylesheet is byte-identical in effect to the version the repair was meant to fix. In a browser without `:has()` support the whole rule is dropped and all 61 legacy anchors render inline above the search box.
- The `components.json` repair breaks the shadcn CLI. Repointing `tailwind.css` at `tokens.css` makes `shadcn eject` fail with *Could not find `@import "shadcn/tailwind.css"` in `src/styles/tokens.css`. Nothing to eject.*, where the previous value ejected successfully. The `cn-font-heading` font transform reads the same configured file, which no longer contains `--font-heading`. The rationale for the change — keeping a single token source — is sound, but the fix as implemented trades one inconsistency for a broken tool.

**3. A navigation defect from the previous round survives on a second path.** The legacy redirect still leaves `history.state` null when the mapped anchor is reached by an in-page fragment navigation rather than a fresh document load, so the URL/DOM desync identified as T1 is not fully closed. That path additionally leaks a visible fallback link above the search box. Verified in Chromium:

```
A) in-page arrival : /docs/#explore-the-guide  :target "contents"  container block  link visible TRUE  state null
B) fresh deep link : /docs/#explore-the-guide  :target correct     container none   link visible false state {index:0}
```

### What would make this a yes

1. Push the nine commits so the reviewed revision is the published one, and let CI run on it.
2. Make the `:has()` fallback survive minification — remove `:has()` from the hiding rule entirely, for example `[data-legacy-links] > a:not(:target) { display: none; }`, so no build pass can merge it back into a list that fails as a unit.
3. Restore shadcn CLI compatibility while keeping one token source — for instance by moving the `shadcn/tailwind.css` import into `tokens.css` so the configured file is the one the CLI reads.
4. Close the legacy-redirect state and `:target` handling for the in-page path, and assert URL/DOM agreement after Back in a browser test.

### Verification of the previous round's remediation

Measured against a fresh build of `105633a`.

| Previous finding | Independent result | Evidence |
| --- | --- | --- |
| T1 — URL/DOM desync after legacy redirect | **Partially fixed; defect survives** | The route now uses `history.replaceState` and preserves the query, and the fresh deep-link path is clean. On in-page arrival the entry state is still `null` and `:target` is stale, so the desync and a visible link leak remain. See U3. |
| T2 — symlink deletion during sync | Confirmed fixed | Commit `a8b6645` rejects symlinks before the obsolete scan; the guard is present and the failure mode no longer reproduces. |
| T3 — index cannot match displayed text | Confirmed fixed | Index text is now derived from parsed Markdown through the same typographic path as the rendered page. |
| T4 — `:has()` non-forgiving list | **Fixed in source; defeated by the build** | Source correctly splits into two rules at `docs.css:75–76`, but `dist/_astro/_..DfopI72k.css` contains the merged single list. See U1. |
| T5 — failed load disables search | Partially fixed | The failure is now scoped and cleared on navigation, but a rejection landing after a navigation re-arms it. See U5. |
| T6 — shadcn generator CSS target | **Regression introduced** | Repointed to `tokens.css`, which breaks `shadcn eject` and the font transform. See U2. |
| T7 — budget headroom | Addressed by reserving JS headroom; remaining margins are recorded below | The reviewed revision reserves headroom for the navigation and search repairs. |
| T8 — asset ceilings overwritten | Partially fixed | `??=` now used for docs routes, but the commands discovery loop six lines later still uses `=`. See U11. |
| T9 — `@import` placement | Confirmed fixed | CSS imports now precede other rules in `global.css`. |
| T10, T12, T13 — layout metadata | Confirmed fixed | Page metadata is centralised and the layout validates its topic; route and label duplication is reduced. See U7 and U15 for the residual. |
| T16, T17 — content-coupled and slow tests | Partially addressed | The live-region count is no longer hard-coded; the reflow test was split, though the work per run is unchanged. See U13 and U14. |

### Findings raised in this round

Ordered by user impact. *Verified* means reproduced here.

#### U1 (high) — the `:has()` repair is reverted by the build *(verified)*

`src/styles/docs.css:75–76`.

The source now separates the rules so that a browser without `:has()` keeps the plain hiding rule. Lightning CSS merges them back during the build:

```
dist/_astro/_..DfopI72k.css:[data-legacy-links]:not(:has(>a:target)),[data-legacy-links]>a{display:none}
```

The shipped artifact therefore behaves exactly like the single rule the repair set out to replace: in Chrome <105, Firefox <121 or Safari <15.4 the entire declaration is dropped and all 61 legacy anchors render inline above the search box. Every browser in the Playwright matrix supports `:has()`, so no test can observe this. **Fix:** remove `:has()` from the hiding rule rather than splitting around it, so no minifier pass can recombine a failing selector into the list.

#### U2 (high) — pointing `components.json` at `tokens.css` breaks the shadcn CLI *(verified)*

`components.json:8`.

Verified with the project's installed `shadcn@4.21.3` in a scratch copy, holding everything else constant:

```
css -> src/styles/tokens.css (current):  Could not find @import "shadcn/tailwind.css" in src/styles/tokens.css. Nothing to eject.
css -> src/styles/global.css (previous): ✔ Inlining shadcn/tailwind.css ... Removing shadcn.
```

`@import "shadcn/tailwind.css"` and `--font-heading` both live in `global.css`; the configured path is what the CLI reads for `eject` and for the `cn-font-heading` font transform, which will now rewrite that class to nothing. The single-token-source goal is right; the implementation contradicts it by pointing the CLI at a file that does not contain the declarations the CLI manipulates. **Fix:** move the shadcn import into `tokens.css`, or keep the CLI pointed at the file that carries it.

#### U3 (high) — the legacy redirect still leaks a link and leaves a null history state on in-page arrival *(verified)*

`src/components/docs/layout.ts:11`.

`history.replaceState` does not update the document's `:target` element and copies the current entry's state verbatim. Verified in Chromium:

```
A) in-page arrival : /docs/#explore-the-guide  :target "contents"  container display block  link visible TRUE  state null
B) fresh deep link : /docs/#explore-the-guide  :target correct     container display none   link visible false state {index:0}
```

On the in-page path — an old bookmark activated while `/docs/` is already open — a legacy "Open …" link stays painted above the search box for the rest of the visit, and the entry keeps a null state, so the T1 desync and the unusable `docs-query:undefined:` storage key both persist. The new regression test only exercises the full-load path, where the router has already stamped a state. **Fix:** keep a real fragment navigation, or manage `:target` and `history.state` explicitly.

#### U4 (medium) — the restore key is not unique per history entry

`src/components/docs/search.ts:40`. `docs-query:${history.state?.index}:${location.pathname}` is not a unique entry identity — the router stamps index `0` on every document-level load — so different entries share one slot. Reported as measured: typing `alpha` on `/docs/`, then loading `/docs/?z=1` in the same tab and typing `beta`, overwrites the slot; Back restores `alpha` but then rewrites the entry to `beta`. The legacy cross-page redirect makes this likely, since the redirected document is a fresh load that immediately writes an empty value into the destination's shared key.

#### U5 (medium) — a rejection landing after navigation re-arms the failure

`src/components/docs/search.ts:11`. `load()`'s catch sets the module-wide `failed` flag without checking that the rejected promise is still current. Reported as verified with a delayed abort: navigating away while the index request is in flight lets the abort land on the destination page and disable search there until Retry. **Fix:** a generation token so only the current request can set `failed`.

#### U6 (medium) — the search input is server-rendered disabled, so a chunk failure is permanent

`src/components/docs/DocsSearch.astro:12`. If the shared docs chunk fails to load, the input stays disabled forever while the live region reports *Enable JavaScript to search* even though JavaScript is enabled, and `/` and Ctrl/Cmd+K focus a disabled control. This trades the previous "silently inert" behaviour (T14) for a mislabelled dead end. `<noscript>` is the browser-owned mechanism for this layer.

#### U7 (medium) — the taxonomy invariant fails at render rather than at the data layer

`src/layouts/DocsLayout.astro:21`. The check runs inside one layout's render, so an unregistered page still becomes a route and aborts the build from inside the layout instead of being rejected where the page list is produced. Validating in `getStaticPaths` would report every offending id once and protect other consumers of the collection.

#### U8–U15 (low) — reconciliation and test-robustness items

- **U8** `layout.ts:12` — the manual `scrollIntoView` that replaces native fragment scrolling is asserted nowhere; the existing test only checks that the heading is attached, which is true of every `/docs/` response.
- **U9** `layout.ts:10` — `target.search === location.search` can never be false, because line 9 assigns it from `location.search`; the clause reads as a guard but is inert.
- **U10** `scripts/check-budget.mjs:46` — `ASSET_BUDGETS['docs/index.html'] ??= docsAssets` is dead; the guide-page loop already assigns that key.
- **U11** `scripts/check-budget.mjs:49` — the commands discovery loop still overwrites explicit ceilings with `=`, so the policy applied to docs routes six lines above was not applied here.
- **U12** `src/lib/guide-topics.mjs:24` — `guidePages` shallow-copies all ten topics to add a `navigationTitle` that is identical to `title` for every one, leaving two shapes of the same taxonomy.
- **U13** `tests/e2e/docs.spec.ts:68` — splitting the reflow test redistributed the 30-second timeout without reducing work: each of the five tests still loads all ten topics, so the matrix still performs roughly 200 document loads.
- **U14** `tests/e2e/docs.spec.ts:266` — the new quote test pins a sentence from generated guide content, reintroducing the content coupling that was just removed from the live-region test.
- **U15** `src/layouts/DocsLayout.astro:51` — the legacy-anchor label still rebuilds the `/docs/<slug>/` route rule by string prefix with a literal `Shell guide` fallback, a surviving copy of the rule the previous round consolidated.

### Limits of this round

- U4, U5, U6, U7 and U8–U15 are recorded from the correctness pass and its verifier agents; I reproduced U1, U2 and U3 directly and did not re-run the others.
- The `:has()` consequence rests on the CSS selector-list specification plus the emitted build output; no browser without `:has()` support was available to run against.
- The merge decision does not depend on CI passing on the unpushed revision, which has not been run.
- Physical-device Safari remains untested throughout this review series.
- This round did not re-audit the shell-reference datasets or generated guide content.

### Method notes for this round

- The published-versus-local divergence was established with an explicit `git fetch origin codex/sync-shell-reference-qa` followed by `git rev-list --left-right --count origin/codex/sync-shell-reference-qa...HEAD`, not from cached remote-tracking refs.
- The minifier merge was confirmed by building the working tree and grepping the emitted `dist/_astro/*.css` for the legacy-link rules.
- The shadcn regression was reproduced by running the project's installed CLI (`node node_modules/shadcn/dist/index.js eject -y`) in a scratch copy of `components.json`, `package.json`, `tsconfig.json` and `src/styles/`, toggling only the `tailwind.css` value between runs.
- The redirect leak was measured in Chromium by comparing an in-page fragment arrival against a fresh deep link on the same build, reading `document.querySelector(':target')`, the container's computed `display`, the link's client rects, and `history.state` on both paths.

## Independent assessment and remediation of U1–U15 (historical) — 7 October 2026

Assessed the fourth round against local `105633a` and implemented the confirmed defects in nine local commits, `d28e6b4` through `d70c37c`. The fourth-round findings above remain as the historical record; this assessment describes their disposition in the repaired revision.

| Finding | Decision | Change or rationale |
| --- | --- | --- |
| U1 — minified `:has()` hiding rule | **Fixed** | Removed `:has()` from legacy-link hiding entirely. The container uses `display: contents`; only the targeted anchor can display. A browser test reads the emitted stylesheet and asserts the actual hiding selector remains independent of `:has()` after minification. |
| U2 — shadcn eject/font regression | **Fixed** | Moved the shadcn import, dark variant and inline theme declarations into the configured `tokens.css`. It remains the sole token source and now contains the font mapping the CLI reads. A disposable fixture runs the installed CLI's real `eject` command and heading-font transform, without uninstalling repository dependencies or accessing the network. |
| U3 — native fragment arrival leaves stale target/state | **Fixed** | Restores Astro's bookkeeping on a null-state native fragment entry and replaces the legacy destination through Astro's navigator. Native fragment handling updates `:target` and performs the scroll. Tests exercise both a fresh deep link and `location.hash` arrival, then Back, Forward and a second Back, checking URL, document, state and hidden fallback anchors. Router code is shared separately so other site routes do not acquire the guide controllers. |
| U4 — document loads reuse one snapshot slot | **Fixed** | Query snapshots use an opaque identity stamped into each history entry, rather than the router index/path combination. The identity survives reload and traversal; fresh document entries receive different identities even when Astro starts their index at zero. Browser coverage loads the same route twice with distinct queries and checks Back, reload and Forward. |
| U5 — stale rejection disables destination search | **Fixed** | Only the current catalog promise can update load/failure state. Pending or failed catalogs are discarded on navigation; successful catalogs remain cached. A delayed-abort test rejects the old request after the next topic renders and confirms a fresh search succeeds without Retry. |
| U6 — missing controller chunk is a misleading dead end | **Fixed** | Native `noscript` messaging replaces the disabled search UI when JavaScript is off. A small independent inline bootstrap detects missing initialization after ten seconds and reveals a native reload link retaining the current URL. A failed-chunk browser test restores delivery, activates that link and searches successfully. Shortcuts only target enabled search controls, and delayed initialization hides the reload link. |
| U7 — unknown ids rejected during render | **Fixed as hardening** | The existing layout guard already failed the build, so an unknown route could not ship. `getStaticPaths` now validates all collection ids before mapping routes and reports every unknown id together. A unit test verifies the aggregate diagnostic; the layout guard remains defensive. |
| U8 — scroll not asserted | **Fixed** | Both legacy-arrival tests check that the destination heading is in the viewport and below the sticky header. The untested manual `scrollIntoView` path was removed in favor of router/native fragment scrolling. |
| U9 — tautological query comparison | **Fixed** | Removed the manual same-route branch and its inert query equality check. The destination retains the current query before router navigation. |
| U10 — redundant overview asset assignment | **Fixed** | Removed the fallback already provided by the guide-page loop. |
| U11 — commands discovery overwrites explicit limits | **Fixed** | Command detail discovery uses `??=`. The affected assignment is in the HTML/DOM `BUDGETS` map, not `ASSET_BUDGETS`; explicit route limits are preserved. |
| U12 — duplicate topic shapes/navigation titles | **Fixed** | `guidePages` references the original topic objects. One navigation-label helper supplies the overview-only label override; sidebar and pagination consume it. Unit coverage checks object identity and labels. |
| U13 — exhaustive reflow tests still perform ~200 loads | **Retained; no correctness defect** | The split addressed an aggregate per-test timeout and intentionally preserved all ten topics at five widths in four browser projects. It never claimed to reduce total work. Each topic can contain different code/table content, and each browser can reflow differently; reducing this matrix would remove coverage. The complete matrix is validated below. |
| U14 — quote regression coupled to generated prose | **Fixed** | Replaced the pinned guide sentence with controlled HTML and index fixtures containing curly and straight quotes. The test searches the displayed text and the authored equivalent without depending on source-guide wording. |
| U15 — route/title reconstruction in legacy labels | **Fixed** | Destination labels resolve through a map built from `guidePages` and `guideUrl`; the fallback comes from `guideOverview.title`. No second route formula or literal overview title remains. |

### Reconciliation with the fourth-round merge decision

The publication mismatch is real, but this task explicitly requires local commits **without pushing**. The previous nine commits and these repairs therefore remain local. No remote CI or deployment result is claimed for them, and the published PR must still be updated and validated before merge. Pushing is intentionally left to the user under that instruction; it is not an unresolved code repair or permission request.

One factual correction to the verification table above: T3 did **not** regenerate the index through the rendered Markdown typography pipeline. It normalized curly/straight quotes in the query and cached searchable text while preserving authored index text, including code. U14 now tests that actual behavior with controlled fixtures.

### Payload decision and validation

The docs JavaScript gzip ceiling increases from **8,500 to 9,500 bytes** in standalone performance-budget commit `d28e6b4`. Router-native legacy navigation, independent history snapshots, stale-request recovery and initialization fallback are required for the correctness fixes; the final build measures **8,778 bytes**, leaving **722 bytes** of compression headroom. Keeping the previous ceiling would fail the repaired artifact. Other route ceilings, hydration directives and the separate on-demand search-index ceiling are unchanged. The overview measures **34,107 raw bytes and 313 elements**, within its existing 35,000-byte/320-element limits; the search index remains **24,513 bytes gzip**, fetched only for a nonempty query.

- `npm run verify`: passed all **24 tooling/parser/CLI tests**, snapshot consistency, lint, dead-code checks, Astro/TypeScript diagnostics, production build and every payload/DOM budget. Generated commands, tips, guide pages, links, search index and source metadata remain unchanged.
- `npm run test:e2e -- --workers=2`: **334 passed, 4 skipped** across desktop Firefox, mobile WebKit, desktop Chromium and mobile Chromium (338 scheduled tests, 5.1 minutes). The pre-existing skip conditions are unchanged; all new regression cases passed. The suite includes the full reflow matrix, accessibility, query-history restoration, successful index reuse, failure recovery and route-transition checks.
- Manual Chromium review at **390px and 320px**: search results, result-to-topic navigation and the topic outline remained usable; the Nix tables stayed within the article, and the commands code block accepted focus and horizontal scrolling without page overflow. Native `#contents` arrival reached `#explore-the-guide`, with a real router state, no painted legacy links and the heading 95px below the viewport top. Physical-device Safari remains untested.

## Third follow-up review (historical) — 7 October 2026

**Commit reviewed:** `11a94d4403d209d5d6574a682e463f8d16e49f9f` — 29 commits, 59 files, +5,100 −2,227 against `main` (`c6d3cde`).

**Extractor schema:** 8. Dataset sizes are unchanged in substance: 53 commands, 82 tips, 61 legacy anchor mappings, 11 search index entries.

**CI at time of review:** `verify`, `e2e` and the Cloudflare Pages preview all pass.

This round supersedes the earlier review rounds below; its remediation assessment follows these findings. It re-measures the previous round's remediation independently rather than reading the repair commits, applies the shadcn and Web Interface Guidelines review skills to the changed UI, and runs a fresh correctness pass over the whole diff — ten finder angles plus a sweep — whose findings are verified individually here rather than relayed.

### Verdict

All seventeen items from the previous round are addressed, and the fixes are structural rather than cosmetic: the link rewriter now uses own-property access, table escaping is driven by parsed table ranges rather than the line's first character, the taxonomy moved to a dependency-free module, the index version is a content hash, and the guide controllers share a named chunk instead of depending on a filename regex.

This round's findings are of a different character again. The branch works and CI is green. The remaining risk has concentrated in two places: the interaction between the new client-side legacy navigation and Astro's router, and the narrow margins the budget gate now operates on. Two are worth fixing before merge — the URL/DOM desync after a legacy redirect (T1), which is a navigation correctness bug on exactly the deep-link path the compatibility layer exists to serve, and the symlink-following deletion in `npm run sync` (T2), which can destroy files outside the repository.

### Verification of the previous round's remediation

Measured against a fresh build of this commit, not read from the repair commits.

| Previous finding | Independent result | Measurement |
| --- | --- | --- |
| R1 — truncated query on reload/Back | Confirmed fixed | Typing `fakeroot` in ~175 ms still leaves the URL at `?q=f`, which is deliberate for Safari safety, but the restored value is now the full query: after Back the input reads `fakeroot` and after reload it reads `fakeroot` (previously `f` in both cases). The recovery layer decouples what the reader sees from what the URL can safely carry. |
| R2 — prototype-chain lookup | Confirmed fixed | `scripts/docs-guide.mjs:94` now reads `Object.hasOwn(anchors, anchor)`. |
| R4 — table escaping keyed on the line | Confirmed fixed | Code-span pipes are masked at equal offsets, table ranges come from parsed `table` nodes (`:47–49`), and only spans inside real tables are escaped. |
| R9 — index cache policy | Confirmed fixed | `public/_headers` now declares the same policy for `/docs-search.json` as for `/tips.json` (both `max-age=300, stale-while-revalidate=86400`), and the version key is a content hash: the built page carries `?v=2b8bf226c60ed6c5`, derived from the serialized index. |
| R11 — repeated lowercasing | Confirmed fixed | Lowercased title and text are computed once when the catalog resolves (`search.ts:11`) and reused for filtering, ranking and excerpt matching. |
| R12 — taxonomy in the parser module | Confirmed fixed | `src/lib/guide-topics.mjs` exists, is dependency-free, and is imported by the layout, the budget gate and the specs. |
| R13 — duplicated navigation markup | Confirmed fixed | Both surfaces render the same `DocsTopicNav` component. The assessment is right that extracting the component does not by itself reduce rendered DOM, since both responsive surfaces remain in server HTML. |
| R15 — stale agent instructions | Confirmed fixed | `.github/copilot-instructions.md` no longer states a Node range; it defers to `README.md` and `package.json#engines`. |
| R7 — budget headroom | Partially addressed; still a constraint | The misleading "~15% headroom" comment was corrected rather than the margin. Measured now: the overview sits at 318 of 320 elements and 7,938 of 8,000 gzip JS. See T8. |
| R9 wording | Corrected fairly | The previous round's phrasing implied `public/_headers` repeated the `tips.json` value; in fact the file and the route disagreed (300 vs 3600). The assessment's correction is accurate and the two are now aligned. |

### Findings raised in this round

Ordered by user impact. Each was reproduced unless marked otherwise.

#### T1 (high) — Back leaves the URL and the DOM out of sync after a legacy redirect

`src/components/docs/layout.ts:10`.

The legacy redirect performs `location.replace(target)` where only the fragment differs — a same-document fragment navigation, which sets the entry's `history.state` to `null`. Astro's `ClientRouter` uses `state.index` for its own bookkeeping and skips popstates whose state is null, so a Back onto that entry restores the URL but not the document. Reproduced in Chromium against the built site:

```
1) after legacy redirect : /docs/#explore-the-guide   history.state === null
2) on topic page        : /docs/shell-basics/        h1 "Shell basics"
3) after Back           : /docs/#explore-the-guide   h1 "Shell basics"
                          #explore-the-guide present in DOM: false
```

The reader lands on a URL that claims to be the overview while the previous topic's article is still rendered, and the next Back lands on the same desynchronised entry. The trigger is arriving on any mapped `/docs/#anchor` link and then navigating — exactly the audience the compatibility mapping exists to serve. The same null state means the session-storage key for that load is `docs-query:undefined:/docs/`, which no later load reads.

**Fix:** re-apply the router's state after a fragment-only replace (pass `history.state` through, or use `pushState`/`replaceState` rather than a fragment navigation), and assert URL/DOM agreement in a browser test.

#### T2 (high) — `npm run sync` can delete files outside the repository

`scripts/extract.mjs:1036`, with the scan at `:1014`.

```js
const obsoleteDocs = fs.existsSync(docsDir)
  ? fs.readdirSync(docsDir, { recursive: true }).filter((name) => name.endsWith('.md') && !expectedDocs.has(name))
  : [];
...
for (const name of obsoleteDocs) fs.unlinkSync(path.join(docsDir, name));
```

`readdirSync` with `recursive: true` follows symlinked directories. Verified directly: with `docs/linked -> /tmp/symtest/outside`, the scan returns `linked/keep.md`, the filter selects it as obsolete, and `path.join(docsDir, 'linked/keep.md')` resolves through the symlink to the file outside the tree. `npm run sync` would unlink it, silently. `--check` reports the same path as stale, which at least makes the state visible before it is acted on.

Any hand-authored `.md` placed in the generated directory is deleted the same way, which is by design — but the symlink case reaches outside the repository entirely. **Fix:** reject symlinked entries during the scan, or resolve each candidate and assert it stays within `docsDir` before unlinking.

#### T3 (medium) — the search index cannot find text the page displays

`scripts/docs-guide.mjs:29`.

The index is generated from raw Markdown while the pages render through Astro's Markdown pipeline with Smartypants typography enabled. Measured: `dist/docs/finders/index.html` renders `zoxide’s interactive picker` with 5 U+2019 characters and zero ASCII apostrophes, while `src/data/docs-search.json` stores `zoxide's interactive picker`. The index carries 19 straight apostrophes across six entries. A reader who selects a phrase from the page and pastes it into the guide search gets *No matches*, and the result excerpts display straight quotes the page never renders.

This is the failure mode with the largest user-visible surface in this round: copying text from a page and searching for it is the natural way to use an in-page search. **Fix:** normalise typographic punctuation in the indexed text (or generate the index from the rendered text so the two cannot diverge).

#### T4 (medium) — a `:has()` selector disables a whole rule on older browsers

`src/styles/docs.css:76`.

```css
[data-legacy-links]:not(:has(> a:target)), [data-legacy-links] > a { display: none; }
```

A plain comma-separated selector list is not forgiving — unlike `:is()` and `:where()`, one invalid or unsupported selector invalidates the entire rule. In a browser without `:has()` support (Firefox ≤ 120, Safari ≤ 15.3, Chrome ≤ 104) the whole declaration is dropped, including the plain `[data-legacy-links] > a { display: none }` half, so all 61 legacy anchors render inline above the search box on every visit. Verified that `:has()` survives untransformed into the shipped `dist/_astro/*.css`, so nothing in the build protects this. **Fix:** split into two rules, or wrap the `:has()` term in `:is()`.

#### T5 (medium) — a failed index load disables search for the rest of the session

`src/components/docs/search.ts:6` and `:19`.

This is a regression introduced by the R3 repair, which correctly stopped per-keystroke refetching but keyed the failure to the index URL. The URL only changes when the content version changes, so after a single transient failure, navigating to another topic and typing still shows *Search unavailable* with no fetch attempt — only the Retry button recovers. Relatedly, `performance.getEntriesByType('navigation')[0]?.type !== 'navigate'` evaluates to `true` when the entry is absent, so an unknown navigation type is treated as a restore rather than a fresh load. **Fix:** clear the failure on navigation, and invert the navigation-timing default.

#### T6 (medium) — the shadcn generator still targets the old stylesheet

`components.json:8`.

`"css": "src/styles/global.css"` while `global.css` now contains **zero** `:root` blocks and `tokens.css` holds the single one. A future `shadcn add` merges its generated `cssVars` into `global.css`, after the `@import` at line 12, shadowing `tokens.css` and recreating exactly the second token source this PR removed. `.github/copilot-instructions.md` already points at `tokens.css`, so the config and the instructions now disagree.

#### T7 (medium) — the docs budget is coupled to the guide's heading count

`scripts/check-budget.mjs:15`. Measured: `docs/index.html` is 318 of 320 elements and 7,938 of 8,000 gzip JS. Each legacy anchor becomes an element on the overview, so three new headings in `GUIDE.md` push the page over the element ceiling and fail `npm run verify` on a documentation-only change. The 62-byte JS slack is smaller than the 29–40 byte cross-Node zlib spread this repository has already documented, so a green local run can be a red CI run for identical code.

The R7 response — retaining the ceilings and correcting the headroom comment rather than loosening the gate — is defensible, but "retain" only holds while nothing grows. This remains a live constraint, not a settled question.

#### T8 (medium) — per-route asset budgets are silently overwritten

`scripts/check-budget.mjs:34`. Topic entries use `??=` for the HTML/DOM budget but plain `=` for `ASSET_BUDGETS[file] = docsAssets`, so a per-route asset ceiling added next to the explicit entries is overwritten by the discovery loops, and a new docs route about 35% heavier than anything shipped receives the looser generic ceiling with no diagnostic.

#### T9 (medium) — `@import` is placed after other rules

`src/styles/global.css:12`. `@import "./tokens.css"` sits after the `@custom-variant` at line 10, which CSS forbids; it works only because Tailwind inlines imports at build time. If the stylesheet is ever processed without that transform, the browser discards the import and every themed surface falls back to initial values while `astro check`, lint and the budget gate all stay green.

#### T10 (medium) — an unknown docs slug produces a broken page

`src/layouts/DocsLayout.astro:21`. `pages.findIndex(...)` returns `-1` for any collection entry not in `guideTopics`, producing a `-1` breadcrumb, `previous = pages[-2]` (absent), `next = pages[0]` (Overview) and `topic` undefined, so `PageHeader` renders an empty description. `src/content.config.ts` uses `glob('**/*.md')`, so a nested page is a legitimate build target; both the extractor's recursive obsolete scan and the budget gate's recursive dist scan contemplate that shape.

#### T11 (low) — the excerpt anchors on a term that may have matched only the title

`src/components/docs/search.ts:90`. Windowing uses `terms[0]`; when that term occurs only in the title, `indexOf` returns `-1`, the offset clamps to zero, and the card shows the page introduction instead of the matched context. The excerpt test only exercises single-term queries.

#### T12 (low) — the overview lede duplicates the generator's description

`src/layouts/DocsLayout.astro:35` hard-codes the same sentence the generator writes into `index.md`'s frontmatter, so the visible paragraph and the `meta`/`og` description have two owners. Editing the generator updates the metadata and leaves the paragraph stale, with no failing test; topic pages avoid this only because they read `topic?.description`.

#### T13 (low) — the route rule and the index label are rebuilt in several places

`src/components/docs/DocsTopicNav.astro:5`, `src/layouts/DocsLayout.astro:20`, `scripts/docs-guide.mjs:98` and the budget tooling each rebuild the synthetic `{ slug: 'index', … }` entry and the `/docs/<slug>/` rule. The copies already disagree: the two UI files label it `Overview`, the generator labels it `Shell guide`.

#### T14 (low) — the search field is inert without JavaScript

`src/components/docs/DocsSearch.astro:12`. The input is enabled, labelled and focusable, but it has no enclosing form and the index is fetched only by the controller, so with JavaScript disabled typing and pressing Enter do nothing while the static status text still claims *Search across the whole guide.* The legacy anchors deliberately gained a native fallback in the same series, so the two degrade inconsistently.

#### T15 (low) — the layout-shift test can pass without measuring

`tests/e2e/performance.spec.ts:25`. `Number(attr ?? 0)` converts a missing measurement into `0`, and `0 < 0.1` passes, so an absent observer attribute reports success rather than failure.

#### T16 (low) — a test hard-codes a count derived from guide content

`tests/e2e/docs.spec.ts:151` asserts the literal `2 matching topics`. A routine `npm run sync` that moves a mention into a third section changes the count and fails the run with no application change.

#### T17 (low) — one test performs 50 document loads against a 30-second cap

`tests/e2e/docs.spec.ts:68` iterates five widths across ten topics: 50 full document loads in a single test, measured at 15.8 s on WebKit locally against the 30 s per-test default, with four browser projects competing for two workers in CI.

#### T18 (medium, reported but not reproduced) — intermittent WebKit restore failure

`src/components/docs/search.ts:34`. The restore key embeds the router's history index; when it misses, the input falls back to the URL query, which may be up to a second stale, and the next write persists the truncated value. Reported as reproducing 2 of 12 runs of `tests/e2e/docs.spec.ts:195` on mobile-webkit. My own six repeats of that suite — 96 passed, 6 skipped, 0 failed — did not reproduce it, so the rate is low and the finding is recorded as plausible rather than confirmed.

#### T19 (low, reported not verified) — test-timing and content coupling

Two further items were reported without independent reproduction: that the sweep's reflow timings interact with CI contention, and that a generated-content change can shift other asserted strings. Both are covered by T16/T17 where they overlap; the remainder is recorded as unverified.

### Limits of this round

- Physical-device Safari remains untested throughout; WebKit findings come from the Playwright WebKit build.
- T18 was reported by the correctness pass and not reproduced in six independent repeats; it is recorded as plausible, not confirmed.
- The reflow-timing figure (T17) is a single local WebKit measurement and indicates magnitude rather than a CI prediction.
- T4 rests on the CSS selector-list specification plus the presence of `:has()` in the shipped CSS; no browser without `:has()` support was available to run against.
- This round did not re-audit the shell-reference datasets or the generated guide content; it reviewed the application, tooling and test surfaces.

### Remediation order for this round

1. **T1** — re-apply router state after the fragment-only legacy redirect, with a browser assertion that URL and DOM agree after Back.
2. **T2** — refuse to unlink anything that resolves outside the generated docs directory.
3. **T3** — normalise typographic punctuation in the search index so displayed text is findable.
4. **T4**, **T6** — split the `:has()` rule; point `components.json` at `tokens.css`.
5. **T5**, **T9**, **T10** — failure recovery across navigation, import placement, and the unknown-slug guard.
6. **T7**, **T8** — decide deliberately whether the budget margins are acceptable and make per-route asset ceilings enforceable.
7. **T11–T17** — excerpt anchoring, description ownership, route/label duplication, no-JS search, and the three test-robustness items.

### Method notes for this round

- Remediation claims were verified by measurement against a fresh `npm run build` served as static files, not by reading the repair commits.
- The legacy-redirect desync was captured by driving the real flow in Chromium: arrive on `/docs/#contents`, read `history.state`, click a sidebar topic, press Back, and compare `location.href` against the rendered `h1` and the presence of `#explore-the-guide`.
- The symlink deletion was reproduced with a purpose-built tree in the system temporary directory, using the real `readdirSync(…, { recursive: true })` call shape and the extractor's own filter.
- The typography mismatch was measured by counting U+2019 against ASCII apostrophes in both `dist/docs/finders/index.html` and `src/data/docs-search.json`.
- The budget figures are from `npm run budget` on this head.
- The intermittent restore failure was probed by running `tests/e2e/docs.spec.ts` six times on mobile-webkit (`--repeat-each=6 --workers=1`).
- The full diff was additionally reviewed by a ten-angle correctness pass plus a sweep; their findings are verified individually above, and duplicates between them are reported once.

## Independent assessment and remediation of T1–T19 (historical) — 7 October 2026

Every finding from the third follow-up was checked against the current implementation. The original findings above are preserved as review history. These repairs are local only; nothing was pushed or posted to GitHub.

| Finding | Decision and outcome |
| --- | --- |
| T1 | **Confirmed and fixed.** Fragment-only legacy redirects use `history.replaceState(history.state, '', target)` and scroll to the destination rather than invoking a fragment navigation that clears Astro's state. Cross-page destinations still replace the document. A browser regression asserts the history index survives and URL, H1 and destination DOM agree after Back, Forward and a second Back. |
| T2 | **Confirmed and fixed.** Sync scans with directory entries and rejects symbolic links before writing or deleting any generated outputs. It rejects nested directory links, file links, dangling links and a linked root directory; it never descends through them. Standalone temporary-tree tests exercise these cases, and the source-backed integration test checks both sync and `--check` refuse a linked directory while leaving its external file intact. Obsolete regular Markdown files remain removable. |
| T3 | **Confirmed and fixed at matching time.** Query and cached title/body matching normalize straight and typographic single/double quotes alike. The browser regression copies the actual rendered `zoxide’s interactive picker` phrase and finds the correct topic with both apostrophe forms. Raw index text and excerpts retain authored punctuation, including literal shell syntax; blanket Smartypants transformation of code in the index would change command text. This solution needs no larger or eagerly loaded index. |
| T4 | **Confirmed and fixed.** The plain legacy-link hiding selector has its own declaration. Unsupported `:has()` can no longer invalidate it; the independent `:target` destination remains available. No unsupported historical browser was available for execution. |
| T5 | **Confirmed and fixed.** A failed promise is cleared on the next Astro navigation, while further typing on the failed page still makes no requests. Retry remains explicit on that page and restores input focus. Browser coverage checks recovery after navigation with an unchanged version. Missing navigation timing now defaults to a fresh load; only explicit `reload` or `back_forward` restores session state, with a missing-timing regression. |
| T6 | **Confirmed and fixed.** `components.json` points the generator at `src/styles/tokens.css`, the existing variable owner. `global.css` continues to import it. The installed CLI's context command could not complete its registry request because DNS for `ui.shadcn.com` was unavailable. A local in-memory check using the installed registry's real helpers confirms the new config still detects Tailwind v4 and merges a test variable into the single existing tokens root without changing files. |
| T7 | **Confirmed narrow margins; explicit performance decision.** Ten redundant card wrappers were removed, reducing the overview from 318 to 308 elements without changing card contents or layout. The 320-element ceiling is retained: native fallback anchors intentionally count as DOM, and sufficiently large guide growth should still trigger review. The docs JS ceiling advances separately from 8,000 to 8,500 gzip bytes to accommodate the confirmed navigation/search fixes and compression variance. The fixed controllers measure 8,060 bytes on Node 26.10.0, leaving 440 bytes of slack instead of the former 62. HTML, CSS, font and lazy-index ceilings are unchanged. This is finite headroom, not a promise that any future guide size fits. |
| T8 | **Confirmed and fixed.** Both expected-route and recursive discovery use `??=` for asset budgets, including the overview fallback. Explicit per-route ceilings now survive discovery. The generic topic ceiling remains intentional, rather than a claim that every topic has equal current transfer. |
| T9 | **Confirmed ordering issue and fixed.** The tokens import precedes `@custom-variant` and all declaration-bearing rules; the permitted layer-order statement stays first. Tailwind no longer needs to compensate for its placement. |
| T10 | **Confirmed latent invalid state and fixed.** `DocsLayout` throws an actionable build error for any unregistered collection slug before computing pagination or rendering breadcrumbs. Nested or extra collection pages must first be registered in the guide taxonomy. |
| T11 | **Confirmed and fixed.** Excerpts select the first query term that actually occurs in the body; a title-only first term no longer forces the introduction. A controlled multi-term browser fixture asserts the body context is shown. All-title queries still reasonably use the introduction. |
| T12 | **Confirmed and fixed.** The visible lede reads the same frontmatter `description` passed to metadata. The overview summary itself now belongs to the taxonomy, which the generator consumes. |
| T13 | **Confirmed duplication and consolidated.** The dependency-free taxonomy exports the overview definition, ordered page list and `guideUrl`. Navigation, pagination, generation, search-index URLs and expected budget routes consume them. `Shell guide` is deliberately the page title and `Overview` the navigation title; these distinct roles are explicitly named in the one overview definition. Generated files are unchanged after regeneration. |
| T14 | **Confirmed and fixed.** Server HTML disables the search input and explains that JavaScript is required while pointing readers toward guide topics. The controller enables the input when initialized and replaces the status. The no-JavaScript browser test checks the disabled control and honest status before using native topic navigation. |
| T15 | **Confirmed and fixed.** The performance test registers an observer only when `layout-shift` is supported and publishes an explicit initial zero after DOM readiness. It requires a present, finite, nonnegative measurement before comparing the threshold; an absent or unsupported observer no longer passes by defaulting to zero. |
| T16 | **Confirmed and fixed.** The live-region test derives its expected count from actual rendered results, verifies the count is positive, and still asserts zero repeated mutations for whitespace edits. It no longer ties correctness to today's `fakeroot` distribution. |
| T17 | **Confirmed test-structure risk and fixed.** Each of the five widths is its own test with ten topic loads and a separate timeout/report. No timeout ceiling was increased. |
| T18 | **Unverified report; no speculative state rewrite.** The existing immediate reload/Back/Forward regression remains, and T1 removes one confirmed route to a null history state. Additional WebKit repetition is recorded below. A history-key miss remains plausible, but the report provides no reproducible trigger warranting a second recovery mechanism that could overwrite an explicit fresh URL query. |
| T19 | **No additional actionable finding established.** The concrete count and fifty-navigation coupling are addressed by T16/T17. The remaining unspecified timing/content reports have no reproduced behavior or particular assertion to fix; retained here as unverified observations. |

### Validation of this remediation

- `npm run verify` passes on Node 26.10.0/npm 11.19.1: all 21 extractor/tooling tests, pinned-source consistency, lint, unused-code checks, Astro diagnostics, build and budgets. Final lint also passes after the performance assertion adjustment.
- `npm run sync` ran from the clean pinned source checkout. Commands, tips, all guide pages, legacy mappings, search index and source metadata remain byte-for-byte unchanged; no snapshot SHA or extraction schema was advanced.
- `npm run test:e2e -- --workers=2` exercised the complete four-browser matrix: 312 passed, 4 intentionally skipped, 2 Firefox failures during an accidentally concurrent verification rebuild (a transient 404 and a React hydration error). After builds stopped, a focused rerun of both failures on Firefox and Chromium plus the final layout-shift test passed all 5 cases. All 314 non-skipped matrix cases therefore passed across the matrix and focused rerun. No production code was changed in response to those transient failures.
- Additional mobile-WebKit stress run: both the immediate-query restore regression and the legacy-fragment history regression repeated twelve times each, **24 passed**, with two workers. T18 was not reproduced; this result does not establish behavior on physical-device Safari.
- Docs regressions pass in all four browsers, including history-state preservation, missing navigation timing, typographic-quote matching, body-context excerpts, navigation recovery after fetch failure, and honest no-JavaScript search controls. Existing successful-index cache reuse and changed-version invalidation coverage remain green.
- Overview: 33,424 raw / 6,928 gzip bytes / 308 elements. Docs assets: 8,060 gzip JS / 22,143 gzip CSS / 188,744 font bytes, under the deliberately revised JS ceiling and unchanged remaining ceilings.
- At 390px, the collaborative preview was manually inspected for overview/cards, topic headings, curly-quote search results and code/table overflow. Shell-basics tables and long code blocks scroll inside their own containers; page content does not overflow the viewport. Physical-device Safari and browsers predating `:has()` support remain untested.

## Independent assessment and remediation of R1–R17 (historical) — 7 October 2026

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

## Second follow-up review (historical) — 7 October 2026

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
