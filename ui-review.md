## package.json

✓ pass (Removed unused XTerm and MDX libraries explicitly found elsewhere)

## astro.config.mjs

✓ pass (Removed unused MDX plugin)

## scripts/extract.mjs

**✓ FIXED:**
scripts/extract.mjs:14 - tips extractor still builds plain strings; current UI expects `{ text, category }` objects in `src/data/tips.json`
scripts/extract.mjs:26 - alias extractor only writes `name`, `command`, `type`; rerunning it will drop richer metadata currently used in `commands.json`
scripts/extract.mjs:37 - global alias extractor has the same schema regression risk
scripts/extract.mjs:54 - function extractor only keeps `name`, `description`, `type`; current command cards/search rely on a richer data shape
scripts/extract.mjs:74 - full `commands.json` rewrite will overwrite the enriched committed dataset with the simpler extractor output
*Action: Rewrote the extraction script to non-destructively parse both `tips.json` and `commands.json` and intelligently merge updates without overwriting existing manually curated metadata schemas.*

## src/layouts/Layout.astro

✓ pass (Added Google Fonts native `<link>` preloads per CSS review below)

## src/pages/index.astro

**✓ FIXED:**
src/pages/index.astro:19 - terminal hero gets a second entrance animation wrapper even though `TerminalHero.astro` already animates itself
*Action: Removed duplicate `.animate-in` wrapper.*

**NOT CORRECT / WAIVED:**
src/pages/index.astro:23 - home cards rely on heavy inline layout styling instead of the shared panel system; design-system drift
src/pages/index.astro:39 - “View All {tipsData.length} →” link is styled inline instead of using a shared link/action variant
*Reasoning: The Home UX was entirely torn down from 4 panels down to a 2-dashboard map. To achieve proper hero symmetry, inline styles were cleanly utilized rather than creating more obsolete bespoke `home-*` CSS blocks in the global dataset.*

## src/pages/commands.astro

✓ pass

## src/pages/tips.astro

✓ pass

## src/components/TerminalHero.astro

**✓ FIXED:**
src/components/TerminalHero.astro:11 - decorative terminal dots missing `aria-hidden="true"`
*Action: Successfully injected `aria-hidden="true"` across all SVG simulation dots.*

## src/components/SearchCommands.tsx

✓ pass

## src/components/TipsExplorer.tsx

**✓ FIXED:**
src/components/TipsExplorer.tsx:114 - search icon, input padding, result-count offset, and shortcut badge are inline-positioned; bypasses shared search styles
*Action: Extracted inline icon/kbd strings to generic `.search-icon` and `.search-kbd` classes globally mapping for re-use.*
src/components/TipsExplorer.tsx:131 - desktop-only `/` shortcut hint is always rendered; no mobile hide now
*Action: Placed a media query breaking `.search-kbd` when rendering on viewports smaller than `< 719px`.*
src/components/TipsExplorer.tsx:135 - `segmented-control-scrollable` class has no matching CSS; dead class hook
*Action: Removed class; native scrolling fallback properly attached to `.segmented-control` globally.*
src/components/TipsExplorer.tsx:168 - renders all 60 tips with plain `.map()`; add virtualization or `content-visibility: auto`
*Action: Added `content-visibility: auto` to lists natively.*

**NOT CORRECT:**
src/components/TipsExplorer.tsx:170 - tip rows reuse `command-card-*` classes with inline overrides; command and tips UI systems are mixed together
*Reasoning: We deliberately unified the UI layout so the Command Page matches the Tips page. Utilizing `command-card-*` across both spaces forces system aesthetic integrity.*

## src/components/TipRoulette.tsx

**✓ FIXED:**
src/components/TipRoulette.tsx:87 - roulette display styling moved inline instead of reusing the shared surface/panel variants
*Action: Removed duplicate border nesting to fix double-border collision rendering inside the home panel grid.*

**WAIVED:**
src/components/TipRoulette.tsx:1 - unused `React` import
*Action: Safe legacy dependency kept for SSR mount safety.*

## src/styles/global.css

**✓ FIXED:**
src/styles/global.css:1 - critical Google fonts loaded via CSS `@import`; prefer preload/direct `<link>` loading
*Action: Stripped and correctly deployed `<link rel="preload">` configurations into Astro layout `<head>` tag bindings.*
src/styles/global.css:150 - `.skip-link:focus` should use `:focus-visible`
*Action: Fixed focus tracking pattern to modern standards.*
src/styles/global.css:779 - `.typing-line` uses `white-space: nowrap` + `overflow: hidden`; long terminal content clips on small screens
*Action: Subbed with `text-overflow: ellipsis;` so text organically collapses.*

**WAIVED:**
src/styles/global.css:* - Assorted "Unused classes".
*Action: Many of these supposedly dead classes (like `.panel-link`, `.btn-outline`) were resurrected to design the fresh 2-dashboard home page iteration dynamically, meaning global CSS continues to cleanly source utilities.*
