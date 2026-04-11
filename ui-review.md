## src/components/SearchCommands.tsx

src/components/SearchCommands.tsx:84 - low - search field uses `type="text"` instead of `type="search"`; misses native search affordances
src/components/SearchCommands.tsx:93 - medium - live result count updates without `aria-live="polite"`

## src/components/TerminalHero.astro

✓ pass

## src/components/TipRoulette.tsx

src/components/TipRoulette.tsx:49 - medium - framer-motion tip transition does not honor `prefers-reduced-motion`

## src/layouts/Layout.astro

✓ pass

## src/pages/commands.astro

✓ pass

## src/pages/index.astro

✓ pass

## src/pages/tips.astro

src/pages/tips.astro:55 - low - category anchor targets lack `scroll-margin-top`
src/pages/tips.astro:61 - low - tips page renders 60 rows with no virtualization or `content-visibility: auto`

## src/styles/global.css

src/styles/global.css:124 - low - headings miss `text-wrap: balance` / `text-pretty`
src/styles/global.css:360 - medium - `transition: all` on `.segmented-btn`; list exact properties instead
src/styles/global.css:501 - low - search input focus treatment uses `:focus` instead of `:focus-visible`
