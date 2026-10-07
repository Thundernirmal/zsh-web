const initDocs = () => {
  document.querySelectorAll<HTMLElement>('.markdown-doc :is(table, pre)').forEach((element) => { element.tabIndex = 0; });
  if (!location.hash) return;
  let anchor: string;
  try { anchor = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const link = document.getElementById(anchor);
  if (link instanceof HTMLAnchorElement && link.parentElement?.hasAttribute('data-legacy-links')) {
    const target = new URL(link.href);
    target.search = location.search;
    location.replace(target);
  }
};
const wide = matchMedia('(min-width: 1024px)');
document.addEventListener('focusin', (event) => {
  const link = event.target instanceof Element ? event.target.closest<HTMLElement>('.docs-topic-nav a') : null;
  // Firefox can leave a tall focused link only partially visible in a scrollport.
  if (wide.matches && link) requestAnimationFrame(() => {
    if (link === document.activeElement) link.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  });
});
document.addEventListener('astro:page-load', initDocs);
window.addEventListener('hashchange', initDocs);
initDocs();
