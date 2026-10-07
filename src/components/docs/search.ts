import { preserveRouterState } from './history';

interface Entry { title: string; url: string; text: string; lower: [string, string] }
let catalog: Promise<Entry[]> | undefined;
let failed = false;
let loaded = false;
let catalogUrl = '';
let lastHistoryWrite = 0;
const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
let restoreEntry = navigationType === 'reload' || navigationType === 'back_forward';
const normalize = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
const resetCatalog = () => { catalog = undefined; failed = false; loaded = false; };
document.addEventListener('astro:before-preparation', (event) => {
  restoreEntry = event.navigationType === 'traverse';
  if (!loaded) resetCatalog();
});
function load(url: string) {
  if (catalog) return catalog;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const request = fetch(url, { signal: controller.signal }).then(async (response) => {
    if (!response.ok) throw new Error('Search unavailable');
    const entries = (await response.json() as Entry[]).map((entry) => ({ ...entry, lower: [normalize(entry.title), normalize(entry.text)] as [string, string] }));
    if (catalog === request) loaded = true;
    return entries;
  }).catch((error: unknown) => { if (catalog === request) failed = true; throw error; }).finally(() => clearTimeout(timeout));
  return catalog = request;
}
function initSearch() {
  const root = document.querySelector<HTMLElement>('[data-docs-search]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  if (catalogUrl !== root.dataset.indexUrl) { catalogUrl = root.dataset.indexUrl!; resetCatalog(); }
  const select = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const input = select<HTMLInputElement>('input');
  input.disabled = false;
  select<HTMLAnchorElement>('[data-search-reload]').hidden = true;
  const status = select<HTMLElement>('[data-search-status]');
  const panel = select<HTMLElement>('[data-search-panel]');
  const error = select<HTMLElement>('[data-search-error]');
  const results = select<HTMLElement>('[data-search-results]');
  const clear = select<HTMLButtonElement>('[data-search-clear]');
  const template = select<HTMLTemplateElement>('template');
  let urlTimer: ReturnType<typeof setTimeout> | undefined;
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  let statusMessage = status.textContent ?? '';
  const listeners = new AbortController();
  // History writes can be throttled by the browser. Save every edit separately.
  // A document-level navigation can reuse Astro's index zero. Stamp an opaque
  // identity once per entry and retain it on reload/traversal instead.
  const entryKey = () => {
    const state = preserveRouterState();
    if (!state.docsQueryId) history.replaceState({ ...state, docsQueryId: Array.from(crypto.getRandomValues(new Uint32Array(4)), (word) => word.toString(16)).join('-') }, '');
    return `docs-query:${history.state.docsQueryId}`;
  };
  const remember = () => {
    try { sessionStorage.setItem(entryKey(), input.value); } catch { /* Storage may be disabled. URL flushing remains available. */ }
  };
  const syncUrl = (force = false) => {
    clearTimeout(urlTimer);
    if (!root.isConnected) return;
    const remaining = 1000 - (Date.now() - lastHistoryWrite);
    if (!force && remaining > 0) { urlTimer = setTimeout(syncUrl, remaining); return; }
    const url = new URL(location.href);
    if (input.value.trim()) url.searchParams.set('q', input.value);
    else url.searchParams.delete('q');
    if (url.href === location.href) return;
    lastHistoryWrite = Date.now();
    try { history.replaceState(history.state, '', url); remember(); }
    catch { urlTimer = setTimeout(syncUrl, 1000); }
  };
  // Publish at a fixed cadence, rather than announce transient counts for
  // every key repeat. Identical counts cause no live-region mutation.
  const updateStatus = (message: string) => {
    statusMessage = message;
    if (statusTimer) return;
    statusTimer = setTimeout(() => {
      statusTimer = undefined;
      if (root.isConnected && status.textContent !== statusMessage) status.textContent = statusMessage;
    }, 500);
  };
  document.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a[href]')) syncUrl(true);
  }, { capture: true, signal: listeners.signal });
  document.addEventListener('docs:legacy-navigation', (event) => {
    const url = (event as CustomEvent<URL>).detail;
    if (input.value.trim()) url.searchParams.set('q', input.value);
    else url.searchParams.delete('q');
    remember();
  }, { signal: listeners.signal });
  document.addEventListener('astro:before-swap', () => {
    clearTimeout(urlTimer); clearTimeout(statusTimer); listeners.abort();
  }, { once: true, signal: listeners.signal });
  let version = 0;
  const search = async () => {
    const current = ++version;
    const query = normalize(input.value.trim());
    clear.hidden = !query;
    if (failed && query) { error.hidden = false; updateStatus('Search unavailable'); return; }
    error.hidden = true;
    results.replaceChildren();
    panel.hidden = true;
    if (!query) { updateStatus('Search across the whole guide.'); return; }
    if (!catalog) updateStatus('Searching…');
    try {
      const entries = await load(root.dataset.indexUrl!);
      if (current !== version || !root.isConnected) return;
      const terms = query.split(/\s+/);
      const matches = entries.filter((entry) => terms.every((term) => (entry.lower[0].includes(term) || entry.lower[1].includes(term))));
      matches.sort((a, b) => Number(b.lower[0].includes(query)) - Number(a.lower[0].includes(query)));
      updateStatus(matches.length ? `${matches.length} matching topic${matches.length === 1 ? '' : 's'}` : 'No matches. Try a command name or a different phrase.');
      for (const entry of matches) {
        const item = template.content.cloneNode(true) as DocumentFragment;
        const link = item.querySelector<HTMLAnchorElement>('a')!;
        link.href = entry.url;
        item.querySelector('strong')!.textContent = entry.title;
        const match = terms.map((term) => entry.lower[1].indexOf(term)).find((index) => index >= 0) ?? 0;
        const offset = Math.max(0, match - 55);
        const start = offset ? entry.text.lastIndexOf(' ', offset) + 1 : 0;
        const limit = start + 160;
        const boundary = entry.text.indexOf(' ', limit);
        const end = boundary < 0 ? entry.text.length : boundary;
        const excerpt = entry.text.slice(start, end);
        item.querySelector('span')!.textContent = `${start ? '…' : ''}${excerpt}${end < entry.text.length ? '…' : ''}`;
        results.append(item);
      }
      panel.hidden = !matches.length;
    } catch {
      if (current !== version || !root.isConnected) return;
      updateStatus('Search unavailable');
      error.hidden = false;
    }
  };
  input.addEventListener('input', () => { remember(); void search(); syncUrl(); });
  const reset = () => { input.value = ''; remember(); void search(); syncUrl(true); input.focus(); };
  clear.addEventListener('click', reset);
  root.querySelector('[data-search-retry]')!.addEventListener('click', () => { resetCatalog(); input.focus(); void search(); });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') reset();
    if (event.key === 'Enter') syncUrl(true);
  });
  input.value = new URL(location.href).searchParams.get('q') ?? '';
  if (restoreEntry) {
    try { input.value = sessionStorage.getItem(entryKey()) ?? input.value; } catch { /* Storage may be disabled. */ }
  }
  const pathname = location.pathname;
  window.addEventListener('popstate', () => {
    if (pathname !== location.pathname || !history.state?.docsQueryId) return;
    try { input.value = sessionStorage.getItem(entryKey()) ?? input.value; } catch { /* Storage may be disabled. */ }
    void search();
  }, { signal: listeners.signal });
  remember();
  syncUrl();
  void search();
}
document.addEventListener('keydown', (event) => {
  const input = document.querySelector<HTMLInputElement>('[data-docs-search] input');
  const typing = event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
  if (input && !input.disabled && (((event.ctrlKey || event.metaKey) && event.key === 'k') || (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey))) {
    event.preventDefault(); input.focus();
  }
});
document.addEventListener('astro:page-load', initSearch);
initSearch();
