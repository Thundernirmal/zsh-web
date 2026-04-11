# Site Design Consistency Review

## Overall Verdict

The site has a strong visual base: the dark theme tokens are centralized, the font-role mapping is mostly coherent, and the new tips explorer is directionally better than the old archive. The main problems are **system drift** rather than total design failure: multiple header patterns, multiple card patterns, mixed motion systems, and a growing amount of inline/legacy CSS that makes the UI feel less unified than it should.

## What Is Already Consistent

- `src/styles/global.css:3` - color, radius, shadow, and font tokens are centralized in `:root`
- `src/styles/global.css:46` - font roles are mostly sensible: display for headings, body for prose, mono for code/meta
- `src/layouts/Layout.astro:20` + `src/styles/global.css:81` - dark-mode setup is aligned (`theme-color` + `color-scheme: dark`)
- `src/components/SearchCommands.tsx:35` + `src/components/TipsExplorer.tsx:40` - commands and tips both sync filter/search state to the URL
- `src/styles/global.css:62` + `src/components/TipRoulette.tsx:11` - reduced-motion handling exists globally and the roulette now respects it

## High-Priority Design / UX Issues

- `src/components/TipsExplorer.tsx:151` - nested `<main>` inside the layout `<main>`; invalid page structure and easy semantic bug
- `src/components/TipsExplorer.tsx:155` - featured section title is a styled `<span>`, not a heading
- `src/components/TipsExplorer.tsx:189` - category section titles are also styled `<span>` elements, so the tips page has weak heading hierarchy
- `src/components/TipRoulette.tsx:69` - `aria-live="polite"` is attached to text that changes every 80ms during spin; this can spam screen readers with intermediate states
- `src/components/TipRoulette.tsx:75` - roulette animation is not interruptible because the button is disabled until the spin finishes

## Typography Consistency

- `src/pages/index.astro:15` + `src/pages/commands.astro:7` + `src/pages/tips.astro:11` - three different page-header patterns are in use, so top spacing and title scale are not standardized across pages
- `src/styles/global.css:133` vs `src/styles/global.css:917` - base `h1` is `clamp(2.5rem, 5vw, 4rem)` while `.page-title` is `clamp(2rem, 4vw, 3rem)`; this makes Commands feel like a different product tier than Home/Tips
- `src/pages/index.astro:31` - home card heading hardcodes `1.75rem` instead of using the global heading scale
- `src/pages/index.astro:62` + `src/pages/index.astro:67` - home card headings hardcode `1.1rem`, creating a separate mini-scale
- `src/pages/index.astro:32` + `src/pages/index.astro:63` - body copy uses inline `1rem` and `0.9rem` sizes instead of shared prose classes
- `src/components/SearchCommands.tsx:82` + `src/components/TipsExplorer.tsx:97` - both pages use a primary search control, but one is large/hero-like and the other compact; if intentional, they should be defined as named variants instead of ad hoc styles
- `src/pages/index.astro:45` + `src/pages/index.astro:49` + `src/pages/index.astro:53` - key numeric stats do not use `font-variant-numeric: tabular-nums`
- `src/styles/global.css:516` + `src/styles/global.css:1008` + `src/styles/global.css:1088` + `src/styles/global.css:1187` - counts and meta labels also lack tabular numerals, so number alignment may jitter visually

## Card / Surface Consistency

- `src/styles/global.css:257` + `src/styles/global.css:280` + `src/styles/global.css:431` + `src/styles/global.css:452` + `src/styles/global.css:1121` - the site now has at least five surface patterns (`card`, `hero-card`, `geist-grid-item`, `geist-list-item`, `tip-card`) without one clearly dominant reusable recipe
- `src/pages/index.astro:28` - home uses grid cells as cards
- `src/components/SearchCommands.tsx:127` - commands uses list rows as cards
- `src/components/TipsExplorer.tsx:161` - tips featured uses a separate card pattern again
- `src/components/TipRoulette.tsx:40` - roulette uses another inline-styled panel pattern
- `src/styles/global.css:257` + `src/styles/global.css:280` - `.card` and `.hero-card` appear unused now, which is a sign the system has drifted from its own primitives

## Animation / Motion Consistency

- `src/styles/global.css:900` - generic page entrance motion uses `fadeSlideIn 0.5s ease-out`
- `src/styles/global.css:656` - terminal lines use a different staggered CSS animation system with very long delays
- `src/components/TipRoulette.tsx:56` - roulette uses Framer Motion with its own timing model
- `src/pages/index.astro:28` + `src/pages/commands.astro:7` + `src/pages/tips.astro:11` - some page shells animate in, but core content patterns are inconsistent; the new tips explorer itself does not share the same entrance rhythm
- `src/styles/global.css:646` + `src/styles/global.css:651` + `src/styles/global.css:890` + `src/styles/global.css:895` - `typing`, `blink-caret`, `fadeIn`, and `pulseGlow` keyframes are defined but not used; this is motion-system clutter
- `src/styles/global.css:116` + `src/styles/global.css:309` + `src/styles/global.css:361` + `src/styles/global.css:983` + `src/styles/global.css:1060` - transition durations/easings are all slightly different, but there are no motion tokens or named patterns to explain the differences

## CSS Architecture / Maintainability

- `src/pages/index.astro:15` through `src/pages/index.astro:68` - home still relies heavily on inline styles, which bypasses shared classes and makes consistency harder to maintain
- `src/components/TipRoulette.tsx:39` through `src/components/TipRoulette.tsx:79` - roulette layout and panel styling are still mostly inline
- `src/components/TipsExplorer.tsx:127` + `src/components/TipsExplorer.tsx:141` + `src/components/TipsExplorer.tsx:162` + `src/components/TipsExplorer.tsx:188` + `src/components/TipsExplorer.tsx:190` + `src/components/TipsExplorer.tsx:198` - new tips UI still depends on one-off inline color and spacing decisions
- `src/styles/global.css:758` through `src/styles/global.css:841` - old tips-page styles (`tip-item`, `category-section`, `empty-state`, etc.) remain in the global stylesheet after the redesign
- `src/styles/global.css:943` through `src/styles/global.css:1297` - new tips explorer styles were appended into the same global file instead of replacing the old system, so `global.css` now contains both legacy and current patterns

## Accessibility / Guideline Gaps

- `src/components/TipsExplorer.tsx:127` + `src/components/TipsExplorer.tsx:141` + `src/components/TipsExplorer.tsx:162` + `src/components/TipsExplorer.tsx:190` + `src/components/TipsExplorer.tsx:198` - decorative icons, dots, and arrows inside category rows / featured cards / tip rows should be hidden from assistive tech
- `src/components/TipsExplorer.tsx:101` - search input uses `type="search"` and `aria-label`, but it is missing a meaningful `name`
- `src/components/TipsExplorer.tsx:109` - visible `/` shortcut hint is helpful on desktop, but it stays visible on mobile too; consider hiding it below the desktop breakpoint

## System Drift Signals

- `src/styles/global.css:257` through `src/styles/global.css:292` - legacy card primitives exist but are not driving new UI
- `src/styles/global.css:675` through `src/styles/global.css:694` - `section-header` styles exist, but current pages use other header patterns instead
- `src/styles/global.css:559` through `src/styles/global.css:583` - old category badge styling still exists even though the redesigned tips page no longer uses that pattern
- `src/styles/global.css:758` through `src/styles/global.css:841` - old tips list system is still shipped alongside the new tips explorer

## Recommended Next Cleanup Pass

1. Replace the nested `main` in `TipsExplorer` with a `div` or `section`, and convert featured/category labels into real headings.
2. Standardize page headers into one shared pattern for Home, Commands, and Tips.
3. Define a small type scale for `hero`, `section`, `card-title`, `meta`, and `count` instead of using inline font sizes.
4. Pick one card/surface system and refactor home cards, tips featured cards, and roulette panel to use it.
5. Consolidate motion into shared timing tokens and delete unused keyframes.
6. Remove legacy tips CSS and reduce inline styling so the design system lives in one place.
