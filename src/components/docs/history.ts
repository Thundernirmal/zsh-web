// Astro supports custom state alongside index/scroll fields. Native fragment
// entries can have null state, so restore the last router fields before adding
// application state. A new fragment entry must not inherit a query identity.
let routerState = history.state;
export function preserveRouterState() {
  if (Number.isFinite(history.state?.index)) routerState = history.state;
  else {
    routerState = { ...routerState, ...history.state, index: routerState?.index ?? 0, scrollX, scrollY, docsQueryId: undefined };
    history.replaceState(routerState, '');
  }
  return routerState;
}
