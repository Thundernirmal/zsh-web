/**
 * Catppuccin theme state, shared with nirmalkatariya.com's conventions: `data-theme`
 * on <html> is "latte" or "mocha", and an explicit choice is stored under the
 * "theme" localStorage key. The inline script in Layout.astro applies it before
 * first paint; this module keeps it applied across client-side navigation, follows
 * live system changes while no choice is stored, and drives the header toggle.
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
  for (const toggle of doc.querySelectorAll('[data-theme-toggle]')) toggle.setAttribute('aria-pressed', String(theme === 'mocha'));
}

/** Swaps the theme with nirmalkatariya.com's circular reveal, centred on the toggle. */
function setTheme(theme: Theme, origin: Element): void {
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Storage can be blocked; the choice still applies to this page view.
  }
  if (theme === currentTheme()) return;

  const root = document.documentElement;
  // Colour transitions would otherwise all start at once and repaint every frame under the reveal.
  const swap = () => {
    root.classList.add('theme-switching');
    applyTheme(theme);
  };
  const settle = () => root.classList.remove('theme-switching');

  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    swap();
    requestAnimationFrame(() => requestAnimationFrame(settle));
    return;
  }

  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  // Named page regions would otherwise cross-fade on their own instead of joining the reveal.
  root.classList.add('theme-switching');
  const transition = document.startViewTransition(swap);
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: Math.min(900, Math.max(450, 300 + radius * 0.27)),
          easing: 'cubic-bezier(0.61, 1, 0.88, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {});
  transition.finished.finally(settle);
}

let initialized = false;

export function initTheme(): void {
  if (initialized) return;
  initialized = true;

  applyTheme(currentTheme());

  // ClientRouter copies the incoming page's <html> attributes, which carry no theme.
  document.addEventListener('astro:before-swap', (event) => applyTheme(currentTheme(), event.newDocument));

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (!storedTheme()) applyTheme(event.matches ? 'mocha' : 'latte');
  });

  // Delegated so the toggle in each swapped-in header works without rebinding.
  document.addEventListener('click', (event) => {
    const toggle = event.target instanceof Element ? event.target.closest('[data-theme-toggle]') : null;
    if (toggle) setTheme(currentTheme() === 'mocha' ? 'latte' : 'mocha', toggle);
  });
}
