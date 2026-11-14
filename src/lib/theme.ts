/**
 * Catppuccin theme state, shared with nirmalkatariya.com's conventions: `data-theme`
 * on <html> is "latte" or "mocha", and an explicit choice is stored under the
 * "theme" localStorage key. The inline script in Layout.astro applies it before
 * first paint; this module keeps it applied across client-side navigation and
 * follows live system changes while no choice is stored.
 */
type Theme = 'latte' | 'mocha';

const themeColors: Record<Theme, string> = { latte: '#eff1f5', mocha: '#1e1e2e' };

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'latte' ? 'latte' : 'mocha';
}

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem('theme');
    return value === 'latte' || value === 'mocha' ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme, doc: Document = document): void {
  doc.documentElement.dataset.theme = theme;
  for (const meta of doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = themeColors[theme];
}

let initialized = false;

export function initTheme(): void {
  if (initialized) return;
  initialized = true;

  // ClientRouter copies the incoming page's <html> attributes, which carry no theme.
  document.addEventListener('astro:before-swap', (event) => applyTheme(currentTheme(), event.newDocument));

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (!storedTheme()) applyTheme(event.matches ? 'mocha' : 'latte');
  });
}
