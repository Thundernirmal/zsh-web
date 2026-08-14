# Mobile Optimization Plan

- Status: Complete
- Created: 2026-08-14
- Updated: 2026-08-14 after completing implementation and verification
- Target: `zsh.nirmalkatariya.com`
- Reference: `blog.nirmalkatariya.com` and `/home/nirmal/projects/blog`

## Implementation Progress

- Phase 1 — Complete: Playwright/axe coverage runs against an isolated production preview and includes required viewports, interactions, accessibility, computed layout/typography, URL state, and console checks without committed image baselines.
- Phase 2 — Complete: the shared Header/Footer, safe-area shell, stable smart mobile header, three-column navigation, and intent prefetching are implemented and browser-verified.
- Phase 3 — Complete: phone control sizing, the non-scrolling 2×2 command filter, search-first content order, and responsive information density are implemented and browser-verified.
- Phase 3A — Complete: the role-based command typography system is implemented, computed-style tested, and optically reviewed at 320px and 390px using the production fonts.
- Phase 4 — Complete: command `h2` and detail `h3` semantics, definition-list structure, roulette placeholder correction, focus behavior, and announcements pass axe and Lighthouse accessibility checks.
- Phase 5 — Complete: fonts are self-hosted, Home roulette data is lazy, the phone terminal transcript is shorter, Framer Motion is removed, and bundle/Lighthouse checks pass.
- Phase 6 — Complete: the aggregate repository gate, Lighthouse audit, browser inspection, and final diff hygiene review pass.

## Completed Validation Results

- Aggregate Playwright suite: 20 passed across desktop and mobile Chromium with no skipped or screenshot-dependent tests.
- Mobile Chrome verifies the 320px and 390px layout through viewport, overflow, touch-target, heading, typography, state, and exact alignment assertions; image baselines are intentionally excluded from version control.
- Required viewport overflow checks pass at 320×800, 360×800, 390×844, 430×932, and 667×375.
- Axe reports no serious or critical violations on Home, Commands, or Tips.
- Mobile Lighthouse: Home 99 performance/100 accessibility, Commands 98/100, and Tips 97/100.
- Mobile Lighthouse LCP: Home 1.7s, Commands 2.3s, and Tips 2.6s; TBT is 0ms, 100ms, and 0ms respectively; CLS is 0 on every route.
- Home has no React island and references approximately 4.9KB gzip of JavaScript; catalogue hydration remains route-specific.
- `npm test` passes the complete aggregate gate: source-data sync, lint, dead-code analysis, Astro diagnostics/build, and both Playwright projects.

## Regression Follow-ups

- 2026-08-14 — Complete: restored the roulette's labeled `Category` and `Source` placeholder pills before the first roll, plus the category-specific icon and visible category name after selection. Real metadata uses native hidden wrappers so shadcn Badge retains its `inline-flex` layout, while placeholders use a contrast-safe semantic muted variant. Deterministic assertions cover initial/selected visibility, icon, label, badge bounds, lazy requests, and reduced motion without image baselines.
- 2026-08-14 — Complete: centered each Commands filter label/count pair horizontally and vertically at phone and desktop breakpoints, replacing the previous baseline/end-to-end alignment. Removed all Playwright screenshot assertions and generated `*.spec.ts-snapshots` files, added the directory pattern to `.gitignore`, and retained computed centering and responsive-layout assertions. The complete `npm test` gate passes with 20 tests.

## Objective

Bring Nirmal's Shell close to the mobile experience of Nirmal's Notes while preserving the shell-specific content, Catppuccin styling, desktop density, and existing search/filter behavior.

The work should make the target feel like a sibling of the blog, not turn it into a copy. The shared experience should come from the page shell, navigation, spacing, touch behavior, safe-area handling, typography delivery, motion, and quality gates. The terminal demonstration and command/tip interfaces remain specific to this site.

## Review Basis

The plan is based on:

- Source review of this project and `/home/nirmal/projects/blog`.
- Live comparison of `https://zsh.nirmalkatariya.com/` and `https://blog.nirmalkatariya.com/`.
- Responsive browser checks at 320×800, 360×800, 390×844, 430×932, 667×375, and 768×1024.
- The provided 2026-08-14 Android screenshot of the expanded `upkg` command at phone width.
- Mobile Lighthouse runs for Home, Commands, Tips, and the blog home page.
- The current Vercel Web Interface Guidelines: <https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md>.
- Current shadcn Base UI documentation for Button, Toggle Group, Select, Input Group, Accordion, Table, Card, and Badge.

## Baseline Findings

### What already works

- No tested route produces document-level horizontal overflow at the tested phone, landscape, or tablet widths.
- Search inputs use a 16px font, avoiding automatic iOS zoom on focus.
- Long commands, examples, labels, and descriptions wrap safely.
- Command feature tables switch to a list below the `md` breakpoint.
- Tip metadata wraps below the description on phones.
- Search, filter, and expanded command state are reflected in the URL.
- Links and actions use semantic elements, focus indicators are visible, async result counts use `aria-live`, and reduced-motion handling exists.
- Mobile Lighthouse reported a cumulative layout shift of `0` on all tested routes.

These behaviors are regression constraints and should be preserved.

### Main gaps

| Area | Current target | Blog reference | Priority |
| --- | --- | --- | --- |
| Mobile header | 63px on Home and 97px on inner routes; permanently sticky | Stable 79px base height; hides down and returns up | P0 |
| Header navigation | Brand creates a second row; GitHub is always visible | One equal-width mobile row; secondary destinations hidden | P0 |
| Header touch targets | 28px high | 44px high | P0 |
| Search and filters | 28–36px high | Primary mobile controls are 44px | P0 |
| Command type filter | Last option clips inside a horizontal scroller at 320px | Primary controls remain directly visible | P0 |
| Safe areas | No `viewport-fit=cover` or inset-aware shell | Notch and home-indicator aware | P0 |
| Content priority | Three stacked statistic cards precede search on phones | Primary content/actions appear immediately | P1 |
| Fonts | Third-party Google Fonts stylesheet and font requests | Self-hosted variable fonts with critical preloads | P1 |
| Prefetching | Commands and Tips are prefetched on initial load | Navigation uses intent-based prefetching | P1 |
| Home hydration | React and Framer Motion hydrate a below-fold roulette immediately | Blog home ships only a small amount of JavaScript | P1 |
| Heading hierarchy | Command accordion headers default to `h3` after the page `h1` | Sequential headings | P0 |
| Command-detail type hierarchy | Section headings and the `Example` label are 12px while the text they introduce is 14–16px | Reading headings are never smaller than their associated content | P0 |
| Type-scale consistency | Reading content mixes 12px, 14px, and 16px with 16px, 20px, and 24px line heights by local utility rather than semantic role | 12px is reserved for micro-UI; reading roles use a predictable scale | P0 |
| Placeholder contrast | Faded roulette placeholder badges fail contrast | No equivalent failure | P0 |

### Mobile typography findings

The screenshot is consistent with the source and is not just device scaling. The command details currently invert their visual hierarchy:

| Element | Current source | Current size | Finding |
| --- | --- | ---: | --- |
| `Features & Examples` | `SearchCommands.tsx:277` | 12px/16px | A real section heading is smaller than its 14px supporting sentence. |
| Feature term such as `outdated` | `SearchCommands.tsx:294` | 14px/20px | It is visually weaker than the 16px command summary and syntax blocks. |
| Feature description | `SearchCommands.tsx:300` | 14px/20px | Readable, but part of an abrupt 16→12→14 hierarchy change. |
| `Example` label | `SearchCommands.tsx:306` | 12px/16px | It is smaller than the example it introduces and is the clearest issue in the screenshot. |
| Example command and annotation | `SearchCommands.tsx:248,252` | 14px/20px | Both are larger than their label; mono text also has a larger apparent x-height. |
| `Examples`, `Notes`, `Command`, and `Usage` section headings | `SearchCommands.tsx:383,409,640` | 12px/16px | The same reversed hierarchy repeats throughout every expanded command. |
| Syntax value | `SearchCommands.tsx:643` | 16px/24px | It jumps two size roles above its 12px heading. |
| Note text | `SearchCommands.tsx:414` | 14px/24px inherited | Its size and line height do not match either the feature body or syntax pattern. |

The three font families amplify the mismatch: 12px Outfit headings, 14px Plus Jakarta Sans prose, and 14–16px JetBrains Mono code do not have the same apparent size. Numeric equality alone is therefore insufficient; the final scale needs an optical check with the production fonts.

The rest of the site has two related outliers:

- `TerminalHero.astro:39` renders meaningful terminal content at 12px on phones.
- `TipRoulette.tsx:109` renders a full availability sentence at 12px, although equivalent availability copy in `TipsExplorer.tsx:250` is 14px.

The page headers, 16px form fields, 14px action labels, and 12px badges/counts already form sensible roles. Those should be preserved. The fix must not globally enlarge every `text-xs`; badges, counters, keyboard hints, and short navigational micro-labels can remain 12px.

The blog provides the intended hierarchy: its reading body is 16px, article headings start at 20px, and its 12px styles are limited to supporting UI such as tag counts and navigation context. The shell catalogue is denser than an article, so it should use the same principle rather than copying article sizes verbatim.

### Lab performance baseline

These are directional, single-environment mobile lab measurements and should not be treated as field performance data.

| Route | Performance | Accessibility | LCP | TBT |
| --- | ---: | ---: | ---: | ---: |
| Target Home | 78 | 96 | 3.95s | 56ms |
| Target Commands | 74 | 98 | 4.34s | 124ms |
| Target Tips | 79 | 100 | 4.00s | 0ms |
| Blog Home | 95 | 100 | 2.64s | 0ms |

Observed encoded JavaScript was approximately 103–129KB on target routes and approximately 7KB on the blog home page. The target's interactive catalogue pages will remain heavier than the static blog, but the target home page should not pay that cost before the interaction is needed.

## Target Mobile Experience

Below 640px:

- The header has one row containing `Home`, `Commands`, and `Tips`.
- The visual brand is omitted from the header; the Home item provides the route back to the site root.
- Header icons are hidden on phones if needed to keep labels comfortable at 320px.
- GitHub moves out of the primary mobile header and remains available in the footer.
- Every primary navigation and form control has a minimum 44×44px target.
- The header has a stable 79px base height, plus any top safe-area inset.
- The header hides after deliberate downward scrolling and returns after a small upward scroll.
- The header remains visible near the top, while focused, and during hash/keyboard navigation.
- Search and filters appear before redundant statistics.
- All command type filters are visible without horizontal scrolling.
- The home terminal keeps its identity but uses a shorter phone transcript.
- Expanded commands use a stable reading hierarchy: command heading, detail section heading, item label, and body/example.
- No heading or content label is smaller than the content it introduces.
- Full sentences and meaningful code are never rendered as 12px microcopy.

At 640px and above:

- Keep the compact desktop navigation, visible brand, icons, and GitHub link.
- Keep the existing 1000px content shell and desktop information density.
- Keep three-column statistics and the current desktop command feature table.

## Implementation Phases

### Phase 1: Establish regression tests

Add Playwright and axe coverage before changing layout.

Files:

- `playwright.config.ts`
- `tests/e2e/mobile.spec.ts`
- `package.json`

Tasks:

1. Add `@playwright/test` and `@axe-core/playwright` as development dependencies.
2. Add `test:e2e` and an aggregate `test` script without weakening the existing `verify` gate.
3. Test `/`, `/commands/`, and `/tips/` at:
   - 320×800
   - 360×800
   - 390×844
   - 430×932
   - 667×375
4. Assert `document.documentElement.scrollWidth <= clientWidth` for every route and viewport.
5. Assert primary phone controls have a height of at least 44px.
6. Assert the mobile header has the same height on all routes and follows scroll direction.
7. Assert the header remains visible at the top and while it contains focus.
8. Assert all four command filters fit without an inner horizontal scroller.
9. Assert inputs retain a computed font size of at least 16px.
10. Run axe against all three routes and reject serious or critical findings.
11. Check keyboard focus, reduced motion, URL state restoration, and console errors.
12. Assert the route-shell layout and primary control geometry at 320px and 390px without committed screenshot baselines.
13. Cover expanded `upkg` at 320px and 390px with computed typography, heading, overflow, and long-content assertions.
14. Assert the computed phone sizes for command heading, detail section heading, feature term, `Example` label, body, and example text against the typography contract in Phase 3A.
15. Assert the expanded-command outline is `h1` → command `h2` → detail-section `h3`, with no skipped level.

Reference implementation: `/home/nirmal/projects/blog/tests/e2e/site.spec.ts`.

### Phase 2: Align the shared shell with the blog

Files:

- `src/layouts/Layout.astro`
- New `src/components/layout/Header.astro`
- New `src/components/layout/Footer.astro`
- `src/styles/global.css`

Tasks:

1. Extract the current header and footer from `Layout.astro` so shell behavior can be tested independently.
2. Change the viewport meta value to `width=device-width, initial-scale=1, viewport-fit=cover`.
3. Introduce a reusable `.content-shell` equivalent to the blog:
   - 16px phone padding.
   - 24px `sm` padding.
   - 32px `lg` padding.
   - `max()` with `env(safe-area-inset-left/right)`.
4. Apply `env(safe-area-inset-top)` to the site header and the bottom inset to the footer.
5. Add `scrollbar-gutter: stable` and `scroll-padding-top` driven by `--site-header-height`.
6. Apply `touch-action: manipulation` to links as well as buttons.
7. Build a phone-only three-column navigation row for Home, Commands, and Tips.
8. Hide the visual brand below `sm`; show it and the current richer navigation at `sm+`.
9. Hide GitHub from the phone header and retain it in the footer and larger navigation.
10. Add `data-site-header` and `data-scroll-state` hooks.
11. Port the blog's scroll-direction behavior:
    - Always show within the first 80px of the page.
    - Hide after 24px of accumulated downward movement.
    - Show after 10px of accumulated upward movement.
    - Always show for `focus-within`, hash navigation, and widths at or above 640px.
12. Use a `ResizeObserver` to keep `--site-header-height` current.
13. Reduce phone main padding from `py-10` to `py-8`; retain `sm:py-14`.
14. Give footer links 44px phone hit areas and compact them again at `sm`.
15. Change navigation prefetching from `load` to `hover`/intent-based prefetching.

Reference files:

- `/home/nirmal/projects/blog/src/components/layout/Header.astro`
- `/home/nirmal/projects/blog/src/components/layout/Footer.astro`
- `/home/nirmal/projects/blog/src/layouts/BaseLayout.astro`
- `/home/nirmal/projects/blog/src/styles/global.css`

### Phase 3: Normalize touch targets and page priority

Files:

- `src/components/ui/button.tsx`
- `src/components/ui/input-group.tsx`
- `src/components/SearchCommands.tsx`
- `src/components/TipsExplorer.tsx`
- `src/pages/commands.astro`
- `src/pages/tips.astro`

Tasks:

1. Match the blog's Button sizing for `default`, `lg`, `icon`, and `icon-lg`: 44px.
2. Leave `xs`, `sm`, and `icon-sm` compact for explicitly desktop-oriented controls.
3. Make search groups and the actual input elements 44px on phones and 36px at `sm+`.
4. Make the Tips category Select 44px on phones and compact at `sm+`.
5. Shorten placeholders to `Search commands…` and `Search tips…`.
6. Keep live result counts, but render them below the input on phones and inside the trailing add-on at `sm+`.
7. Make command type filters a full-width 2×2 ToggleGroup on phones.
8. Return the ToggleGroup to a compact single row at `sm+`.
9. Remove the horizontal scroller around the command type filters.
10. Give filter items, empty-state actions, roulette actions, and Show More at least 44px height on phones.
11. On Commands and Tips, place search/filter controls immediately after the page header on phones.
12. Hide the three statistic cards below `sm`; their counts already appear in the introduction, filters, and result summary.
13. Preserve the existing cards from `sm` upward.
14. Preserve the existing mobile list/desktop table split in the command details.

The command type selection should remain a shadcn ToggleGroup rather than becoming four independently stateful buttons.

### Phase 3A: Establish a responsive typography system

This is part of the first user-visible changeset and should be completed before visual sign-off on Commands or Tips.

Files:

- `src/styles/global.css`
- `src/components/SearchCommands.tsx`
- `src/components/TerminalHero.astro`
- `src/components/TipsExplorer.tsx`
- `src/components/TipRoulette.tsx` or its replacement
- `src/components/PageHeader.astro`
- `src/components/StatCard.astro`
- `src/components/ui/accordion.tsx`
- `tests/e2e/mobile.spec.ts`

Use this role-based scale:

| Role | Phone target | Larger-screen target | Treatment |
| --- | --- | --- | --- |
| Page title | Keep existing 36–40px | Keep existing 48–64px | Outfit, semibold/extrabold, tight leading |
| Command result heading (`h2`) | 18px/28px | 16px/24px | JetBrains Mono, semibold |
| Detail section heading (`h3`) | 16px/24px | 16px/24px | Outfit, semibold; title case rather than tiny uppercase eyebrow text |
| Feature term and `Example` label | 16px/24px | 14px/20px in the dense desktop presentation | Semibold; never smaller than adjacent content |
| Detail body, command examples, and annotations | 16px/24–28px | 14px/20–24px in the desktop table | Plus Jakarta Sans for prose, JetBrains Mono for commands |
| Supporting metadata or availability | 14px/20px minimum | 14px/20px | Muted color is sufficient hierarchy; do not also shrink it to 12px |
| Badges, counts, and keyboard hints | 12px/16–20px | 12px/16–20px | Restricted to short micro-UI, never headings or reading sentences |
| Terminal transcript | 14px/24px | 14px/24px | JetBrains Mono; fit the phone by shortening content, not shrinking text |

Tasks:

1. Document these roles next to the typography definitions in `global.css` and expose a small set of shared detail styles; do not continue duplicating independent size/leading combinations throughout JSX.
2. Keep form fields at 16px on phones regardless of the compact UI scale so iOS focus does not zoom.
3. Stop relying on the `AccordionContent` component's inherited `text-sm` for reading content. Apply an explicit role to every command-detail heading, label, paragraph, definition, and code example.
4. Coordinate this phase with Phase 4: render each command result as `h2`, then change internal `Features & Examples`, `Examples`, `Notes`, `Command`, and `Usage` headings from `h4` to `h3`.
5. Use title case and the heading font for true detail-section headings, matching the blog's hierarchy. Reserve uppercase tracking for optional eyebrow/micro-label roles only.
6. Make `Example` a visual detail label rather than a document-outline heading, but give it the same phone size as the content it labels and establish hierarchy with weight, color, and spacing.
7. Treat feature terms as semantic terms—prefer `dl`/`dt`/`dd` for the phone presentation—while retaining the shadcn Table and proper row/column headers at `md+`.
8. Normalize mobile command-detail prose, feature terms, examples, annotations, availability, and notes onto 16px with 24–28px leading. Keep the desktop table compact at 14px with 20–24px leading.
9. Raise roulette availability from 12px to the 14px supporting-metadata role.
10. Raise the phone terminal transcript from 12px to 14px; use the shorter transcript already planned in Phase 5 to preserve fit.
11. Audit PageHeader, StatCard, home cards, Tips items, empty states, footer, controls, badges, and keyboard hints against the role map. Preserve intentional differences, but make each size explicit at the composition boundary when inherited primitive typography would be ambiguous.
12. Do not change the shadcn Badge/Kbd microcopy scale or indiscriminately override component primitives. Apply reading typography where components are composed into page content.
13. Check long terms such as `search <query>`, long option examples, annotations, and availability sentences at 320px, 390px, 200% zoom, and text-only zoom.
14. Perform a final optical pass after the self-hosted variable fonts in Phase 5 are active, because the same numeric size renders differently in Outfit, Plus Jakarta Sans, and JetBrains Mono.

### Phase 4: Fix accessibility findings

Files:

- `src/components/ui/accordion.tsx`
- `src/components/SearchCommands.tsx`
- `src/components/TipRoulette.tsx` or its replacement

Tasks:

1. Expose a heading-level option on `AccordionTrigger` using Base UI's `render` API.
2. Keep `h3` as the reusable default, but render command result headers as `h2` beneath the page `h1`.
3. Render command-detail sections as `h3` beneath each command `h2`; do not retain the current skipped `h4` level.
4. Keep repeated `Example` labels and feature terms out of the document heading outline; use explicit visual-label and definition-term semantics from Phase 3A.
5. Remove the faded fake `Category` and `Source` placeholder badge text from the empty roulette state.
6. Preserve the empty state's layout using spacing/min-height rather than low-contrast visible text.
7. Re-run axe and Lighthouse accessibility checks and require a score of 100.

Base UI Accordion reference: <https://base-ui.com/react/components/accordion.md>.

### Phase 5: Reduce home-page mobile cost

Files:

- `src/layouts/Layout.astro`
- `src/styles/global.css`
- `src/pages/index.astro`
- `src/components/TerminalHero.astro`
- `src/components/TipRoulette.tsx`
- New static data endpoint such as `src/pages/tips.json.ts`
- `package.json`

Tasks:

1. Add the same Fontsource variable packages used by the blog.
2. Import self-hosted Outfit, Plus Jakarta Sans, and JetBrains Mono from CSS.
3. Preload only the critical display and body font files.
4. Remove Google Fonts preconnects and the remote stylesheet.
5. Replace the React/Framer Motion roulette with Astro-rendered markup and a small local script.
6. Load the tip catalogue from a static JSON endpoint only when the roulette is first activated.
7. Keep the existing `aria-live` announcement and reduced-motion behavior.
8. Remove `framer-motion` if it has no remaining consumers.
9. Keep the terminal card, but hide secondary output rows on phones so the transcript shows one tip, one command example, and the prompt.
10. Restore the full terminal transcript at `sm+` without duplicating accessible content.
11. Tighten the hero heading line height from `1.2` to the blog's `1.1` treatment.
12. Recheck typography in the browser after Fontsource replaces the remote fonts; approve apparent hierarchy as well as computed pixel values.

An interim `client:visible` change can reduce early execution, but it does not eliminate serialized props. The Astro/vanilla version is the preferred final state because it removes the home page's React and Framer Motion cost entirely.

### Phase 6: Verification and rollout

Run:

```sh
npm run sync:check
npm run lint
npm run dead-code
npm run build
npm run test:e2e
```

Then perform manual checks on:

- iPhone SE/320px class viewport.
- 390px modern iPhone viewport.
- 430px large phone viewport.
- 667×375 landscape viewport.
- iPad Mini/tablet viewport.
- Desktop at 1280px and 1440px.

Verify:

- Header behavior with touch scroll and keyboard navigation.
- Safe-area behavior in portrait and landscape.
- Search, filter, accordion, URL restoration, and browser back/forward behavior.
- Long command names, dependency labels, availability text, and zero-result states.
- Expanded `upkg` details, including every feature term, `Example` label, annotation, and long option at 320px and 390px.
- The typography role matrix across Home, Commands, Tips, empty states, and the roulette.
- Reduced motion.
- 200% browser zoom and text-only zoom.
- No layout regressions during Astro client-side navigation.

## Acceptance Criteria

### Layout and interaction

- No document-level horizontal overflow at any required viewport.
- Mobile header base height is stable across Home, Commands, and Tips.
- Mobile header is approximately 79px high before safe-area inset.
- Every primary phone control is at least 44px high.
- All command type filters are visible without horizontal scrolling.
- Search is encountered before statistic cards on phones.
- Phone inputs remain at least 16px.
- Safe-area insets are honored on all four edges where applicable.
- The desktop layout and 1000px shell remain visually unchanged apart from intentional shared-shell improvements.

### Accessibility

- Heading hierarchy is sequential.
- Lighthouse accessibility is 100 on all three routes.
- Axe reports no serious or critical violations.
- Focus remains visible and the smart header cannot hide focused navigation.
- Async result and roulette changes remain announced politely.
- Reduced-motion preferences disable non-essential motion.

### Typography

- No visual heading or content label is smaller than the content it introduces.
- The mobile command outline is a page `h1`, command-result `h2` elements, and command-detail `h3` elements with no skipped level.
- Expanded command headings, feature terms, descriptions, examples, and annotations follow the Phase 3A role matrix at 320px through 767px.
- `Example` is at least 16px/24px on phones and uses weight and spacing to remain visually distinct from its example content.
- No full sentence or meaningful command is 12px; 12px is limited to badges, counts, keyboard hints, and similarly short micro-UI.
- Terminal content is at least 14px/24px on phones.
- No more than the documented role sizes and line heights are used in primary page content without an explicit exception.
- Heading and body hierarchy remains clear with the production fonts, at 200% zoom, and under text-only zoom without clipping or overlap.

### Performance

- Home mobile Lighthouse performance is at least 90.
- Commands and Tips mobile Lighthouse performance is at least 85.
- Mobile LCP is below 3 seconds in the agreed lab environment.
- CLS remains below 0.05.
- Home does not eagerly download React or Framer Motion for the roulette.
- Navigation no longer prefetches Commands and Tips immediately on every page load.

## Non-goals

- Do not change the Catppuccin palette or introduce a light theme.
- Do not replace direct navigation with a hamburger menu or drawer.
- Do not remove URL-synchronized search/filter state.
- Do not redesign the command detail model or remove extracted documentation.
- Do not flatten all typography to one size or globally replace `text-xs`; preserve intentional micro-UI and desktop density.
- Do not make the target visually identical to the blog; preserve its terminal-focused identity.
- Do not introduce a new client router, state library, or UI registry.

## Recommended Delivery Sequence

Deliver the work in two reviewable changesets:

1. Tests, shared shell, safe areas, touch sizing, content priority, responsive typography, and accessibility corrections.
2. Self-hosted fonts, prefetch changes, terminal compaction, and roulette performance refactor.

Phase 3A and Phase 4 should land together so the visual and semantic heading hierarchies cannot diverge. The first changeset delivers the user-visible mobile improvement. The second closes most of the measured performance gap while carrying more implementation risk and should be reviewed separately.
