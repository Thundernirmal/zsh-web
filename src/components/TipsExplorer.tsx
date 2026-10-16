import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { RotateCcwIcon, SearchIcon, SearchXIcon } from 'lucide-react';

import { CategoryBadge, CategoryIcon } from '@/components/CategoryBadge';
import { CopyButton } from '@/components/CopyButton';
import { highlightText } from '@/components/HighlightText';
import { Badge } from '@/components/ui/badge';
import { categoryLabels, categoryOrder, type Category } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup } from '@/components/ui/item';
import { Kbd } from '@/components/ui/kbd';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSlashFocus } from '@/hooks/useSlashFocus';
import { matchesQuery } from '@/lib/command-search';
import { commandHref, formatLabel, tipSourceLabel, type ShellTip } from '@/lib/shell-docs';

const PAGE_SIZE = 24;

// Copying needs JavaScript, so copy buttons render only after hydration: the
// static HTML stays within its budget and no-JS readers get no dead controls.
const subscribeNever = () => () => {};
const useHydrated = () => useSyncExternalStore(subscribeNever, () => true, () => false);

function tipSearchText(tip: ShellTip): string {
  return [tip.text, tip.category, tip.source, tip.availability]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

// A tip's runnable segment renders as inline code with its command linked;
// older or prose-only tips fall back to linking the leading command name.
function TipText({ tip, query }: { tip: ShellTip; query: string }) {
  const href = tip.commandId ? commandHref({ id: tip.commandId }) : undefined;
  const exampleStart = tip.example ? tip.text.indexOf(tip.example) : -1;
  if (href && tip.example && tip.commandName && exampleStart >= 0) {
    return (
      <>
        {highlightText(tip.text.slice(0, exampleStart), query)}
        <code translate="no">
          <a className="text-link" href={href} translate="no">{tip.commandName}</a>
          {highlightText(tip.example.slice(tip.commandName.length), query)}
        </code>
        {highlightText(tip.text.slice(exampleStart + tip.example.length), query)}
      </>
    );
  }
  const nameStart = tip.commandName ? tip.text.indexOf(tip.commandName) : -1;
  if (href && tip.commandName && nameStart >= 0) {
    return (
      <>
        {highlightText(tip.text.slice(0, nameStart), query)}
        <a className="text-link" href={href} translate="no">{tip.commandName}</a>
        {highlightText(tip.text.slice(nameStart + tip.commandName.length), query)}
      </>
    );
  }
  return <>{highlightText(tip.text, query)}</>;
}

export default function TipsExplorer({ tips }: { tips: ShellTip[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const isInitialMount = useRef(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const hydrated = useHydrated();
  const listRef = useRef<HTMLDivElement>(null);
  // Index of the first tip revealed by "Show More", focused once it renders so
  // keyboard and screen-reader users continue from the new content.
  const revealedIndex = useRef<number | null>(null);

  useEffect(() => {
    const index = revealedIndex.current;
    if (index === null) return;
    revealedIndex.current = null;
    const tip = listRef.current?.querySelectorAll<HTMLElement>('[role="listitem"]')[index];
    tip?.focus({ preventScroll: true });
    // WebKit does not reliably scroll on programmatic focus; scroll explicitly.
    tip?.scrollIntoView({ block: 'nearest' });
  }, [visibleCount]);

  useSlashFocus(searchRef, {
    onClear: () => setQuery(''),
  });

  const availableCategories = useMemo(() => {
    const present = Array.from(new Set(tips.map((tip) => tip.category as Category)));
    const known = categoryOrder.filter((category) => present.includes(category));
    const additional = present
      .filter((category) => !categoryOrder.includes(category as Category))
      .sort();
    return [...known, ...additional];
  }, [tips]);

  /* eslint-disable react-hooks/set-state-in-effect -- URL parameters only exist after Astro hydrates this static page. */
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const params = new URLSearchParams(window.location.search);
      const nextQuery = params.get('q');
      const nextFilter = params.get('cat');
      if (nextQuery) setQuery(nextQuery);
      if (nextFilter && (availableCategories as string[]).includes(nextFilter)) setFilter(nextFilter);
      return;
    }
  /* eslint-enable react-hooks/set-state-in-effect */

    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (filter !== 'all') url.searchParams.set('cat', filter);
    else url.searchParams.delete('cat');
    window.history.replaceState(window.history.state, '', url);
  }, [availableCategories, filter, query]);

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  const corpus = useMemo(() => new Map(tips.map((t) => [`${t.category}:${t.text}`, tipSearchText(t)])), [tips]);

  const filteredTips = useMemo(() => {
    const nq = normalizedQuery;
    return tips.filter((tip) => {
      if (filter !== 'all' && tip.category !== filter) return false;
      if (!nq) return true;
      const text = corpus.get(`${tip.category}:${tip.text}`) ?? '';
      return matchesQuery(text, nq);
    });
  }, [corpus, filter, normalizedQuery, tips]);

  const visibleTips = useMemo(() => filteredTips.slice(0, visibleCount), [filteredTips, visibleCount]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = { all: 0 };
    for (const cat of availableCategories) acc[cat] = 0;
    if (!normalizedQuery) {
      acc.all = tips.length;
      for (const tip of tips) acc[tip.category] = (acc[tip.category] ?? 0) + 1;
      return acc;
    }
    for (const tip of tips) {
      const text = corpus.get(`${tip.category}:${tip.text}`) ?? '';
      if (!matchesQuery(text, normalizedQuery)) continue;
      acc.all += 1;
      acc[tip.category] = (acc[tip.category] ?? 0) + 1;
    }
    return acc;
  }, [availableCategories, corpus, normalizedQuery, tips]);

  const selectItems = [
    { value: 'all', label: `All Categories (${counts.all})` },
    ...availableCategories.map((category) => ({
      value: category,
      label: `${categoryLabels[category] ?? formatLabel(category)} (${counts[category] ?? 0})`,
    })),
  ];

  const clearSearch = () => {
    setQuery('');
    setFilter('all');
    setVisibleCount(PAGE_SIZE);
    searchRef.current?.focus();
  };

  return (
    <section className="grid min-w-0 gap-4 motion-safe:animate-in motion-safe:fade-in" aria-label="Tips search and results">
      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <label htmlFor="tips-search" className="sr-only">
            Search tips
          </label>
          <InputGroup className="h-12 sm:h-9">
            <InputGroupAddon align="inline-start">
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              id="tips-search"
              name="tips-search"
              type="search"
              placeholder="Search tips…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <InputGroupAddon align="inline-end" className="gap-2">
              <span className="hidden text-sm tabular-nums sm:inline" aria-live="polite" aria-atomic="true">
                {filteredTips.length} tip{filteredTips.length === 1 ? '' : 's'}
              </span>
              <Kbd className="hidden sm:inline-flex" aria-hidden="true">
                /
              </Kbd>
            </InputGroupAddon>
          </InputGroup>
          <span className="mt-2 block text-sm text-muted-foreground tabular-nums sm:hidden" aria-live="polite" aria-atomic="true">
            {filteredTips.length} tip{filteredTips.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="min-w-0">
          <Select
            name="tip-category"
            value={filter}
            onValueChange={(value) => {
              if (!value) return;
              setFilter(value);
              setVisibleCount(PAGE_SIZE);
            }}
            items={selectItems}
          >
            <SelectTrigger
              className="w-full data-[size=default]:h-11 sm:data-[size=default]:h-9"
              aria-label="Filter tips by category"
            >
              <CategoryIcon category={filter} className="text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                <SelectLabel>Tip Categories</SelectLabel>
                {selectItems.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    disabled={counts[item.value] === 0 && filter !== item.value}
                  >
                    <CategoryIcon category={item.value} className="text-muted-foreground" />
                    <span className="flex-1">{item.label}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTips.length === 0 ? (
        <Empty className="min-h-52 gap-3 border p-5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              <h2>No Tips Found</h2>
            </EmptyTitle>
            <EmptyDescription>
              No tips match {query ? <>“{query}”</> : 'the selected category'}. Clear the search and category to
              see every tip.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" variant="outline" onClick={clearSearch}>
              <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
              Clear Search
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <ItemGroup ref={listRef} className="gap-2">
            {visibleTips.map((tip) => {
              const sourceLabel = tipSourceLabel(tip, categoryLabels[tip.category] ?? formatLabel(tip.category));
              return (
              <Item
                key={`${tip.category}:${tip.text}`}
                role="listitem"
                tabIndex={-1}
                variant="outline"
                size="xs"
                className="min-w-0 items-start rounded-xl bg-card outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ItemContent className="min-w-0 gap-1">
                  <ItemDescription className="line-clamp-none text-pretty">
                    <TipText tip={tip} query={query} />
                  </ItemDescription>
                  {tip.availability && (
                    <p className="text-sm leading-5 text-muted-foreground">{highlightText(tip.availability, query)}</p>
                  )}
                </ItemContent>
                <ItemActions className="basis-full flex-wrap items-center justify-start gap-1.5 sm:ml-auto sm:basis-auto sm:justify-end">
                  {hydrated && tip.example && tip.exampleCopyable && (
                    <CopyButton text={tip.example} label={`Copy command: ${tip.example}`} className="size-7" />
                  )}
                  <CategoryBadge category={tip.category} />
                  {sourceLabel && <Badge variant="metadata">{sourceLabel}</Badge>}
                </ItemActions>
              </Item>
              );
            })}
          </ItemGroup>
          {visibleTips.length < filteredTips.length && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  revealedIndex.current = visibleTips.length;
                  setVisibleCount((count) => count + PAGE_SIZE);
                }}
              >
                Show {Math.min(PAGE_SIZE, filteredTips.length - visibleTips.length)} More Tips
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
