import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RotateCcwIcon, SearchIcon, SearchXIcon, XIcon } from 'lucide-react';

import { CategoryBadge, CategoryIcon } from '@/components/CategoryBadge';
import CommandDetails from '@/components/CommandDetails';
import { highlightText } from '@/components/HighlightText';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSlashFocus } from '@/hooks/useSlashFocus';
import { categoryLabels, categoryOrder, type Category } from '@/lib/categories';
import {
  commandId,
  matchingDetailSections,
  matchesQuery,
  searchableText,
  typeVariant,
} from '@/lib/command-search';
import { commandHref, formatLabel, type ShellCommand } from '@/lib/shell-docs';

type Filter = 'all' | ShellCommand['type'];

const validFilters = new Set<Filter>(['all', 'alias', 'global_alias', 'function', 'action']);

interface SearchCommandsProps {
  commands: ShellCommand[];
}

// Removal controls must be real buttons: a clickable span is invisible to
// keyboard users and to assistive tech. Rendered as a badge-styled button with
// a 44px touch target on mobile and an explicit removal name.
function RemovableFilter({
  onRemove,
  removeLabel,
  children,
}: {
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
}) {
  return (
    <Badge
      render={<button type="button" />}
      variant="secondary"
      onClick={onRemove}
      aria-label={removeLabel}
      className="h-11 cursor-pointer gap-1 px-3 hover:bg-destructive/20 sm:h-5 sm:px-2"
    >
      {children}
      <XIcon className="size-3" aria-hidden="true" />
    </Badge>
  );
}

export default function SearchCommands({ commands }: SearchCommandsProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [category, setCategory] = useState<string>('all');
  const [expanded, setExpanded] = useState<string[]>([]);
  const isInitialMount = useRef(true);
  const deepLinkTarget = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useSlashFocus(searchRef, {
    onClear: () => setQuery(''),
    onCloseExpanded: () => setExpanded([]),
  });

  const availableCategories = useMemo(() => {
    const present = Array.from(
      new Set(commands.map((c) => c.category).filter(Boolean) as Category[]),
    );
    const known = categoryOrder.filter((cat) => present.includes(cat));
    const additional = present.filter((cat) => !categoryOrder.includes(cat)).sort();
    return [...known, ...additional];
  }, [commands]);

  /* eslint-disable react-hooks/set-state-in-effect -- URL parameters only exist after Astro hydrates this static page. */
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const params = new URLSearchParams(window.location.search);
      const nextQuery = params.get('q');
      const nextFilter = params.get('type') as Filter | null;
      const nextCategory = params.get('cat');
      const nextCommand = params.get('command');

      if (nextQuery) setQuery(nextQuery);
      if (nextFilter && validFilters.has(nextFilter)) setFilter(nextFilter);
      if (nextCategory && (availableCategories as string[]).includes(nextCategory)) {
        setCategory(nextCategory);
      }
      if (nextCommand && commands.some((command) => commandId(command) === nextCommand)) {
        deepLinkTarget.current = nextCommand;
        setExpanded([nextCommand]);
        const target = commands.find((command) => commandId(command) === nextCommand)!;
        if (nextFilter && nextFilter !== 'all' && target.type !== nextFilter) setFilter('all');
        if (nextCategory && nextCategory !== 'all' && target.category !== nextCategory) setCategory('all');
        if (nextQuery && !matchesQuery(searchableText(target), nextQuery)) setQuery('');
      }
      return;
    }
  /* eslint-enable react-hooks/set-state-in-effect */

    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (filter !== 'all') url.searchParams.set('type', filter);
    else url.searchParams.delete('type');
    if (category !== 'all') url.searchParams.set('cat', category);
    else url.searchParams.delete('cat');
    if (expanded[0]) url.searchParams.set('command', expanded[0]);
    else url.searchParams.delete('command');
    window.history.replaceState(window.history.state, '', url);
  }, [availableCategories, category, commands, expanded, filter, query]);

  useEffect(() => {
    const target = deepLinkTarget.current;
    if (!target || !expanded.includes(target)) return;
    const command = commands.find((item) => commandId(item) === target);
    if (!command) return;
    const frame = requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(`[data-command="${CSS.escape(command.name)}"]`);
      if (!row) return;
      row.querySelector<HTMLElement>('[data-slot="accordion-trigger"]')?.focus({ preventScroll: true });
      row.scrollIntoView({ block: 'start', behavior: 'instant' });
      deepLinkTarget.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [commands, expanded]);

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  const corpus = useMemo(
    () => new Map(commands.map((c) => [commandId(c), searchableText(c)])),
    [commands],
  );

  const filteredCommands = useMemo(() => {
    return commands.filter((command) => {
      if (filter !== 'all' && command.type !== filter) return false;
      if (category !== 'all' && command.category !== category) return false;
      if (normalizedQuery.length === 0) return true;
      const text = corpus.get(commandId(command)) ?? '';
      return matchesQuery(text, normalizedQuery);
    }).sort((a, b) => Number(b.name.toLowerCase() === normalizedQuery) - Number(a.name.toLowerCase() === normalizedQuery));
  }, [category, commands, corpus, filter, normalizedQuery]);

  const counts = useMemo(() => {
    const acc = { all: 0, alias: 0, global_alias: 0, function: 0, action: 0 } as Record<Filter, number> & {
      all: number;
    };
    for (const command of commands) {
      if (category !== 'all' && command.category !== category) continue;
      if (normalizedQuery.length > 0) {
        const text = corpus.get(commandId(command)) ?? '';
        if (!matchesQuery(text, normalizedQuery)) continue;
      }
      acc.all += 1;
      acc[command.type as Filter] = (acc[command.type as Filter] ?? 0) + 1;
    }
    return acc;
  }, [category, commands, corpus, normalizedQuery]);

  const categoryCounts = useMemo(() => {
    const acc: Record<string, number> = { all: 0 };
    for (const cat of availableCategories) acc[cat] = 0;
    for (const command of commands) {
      if (filter !== 'all' && command.type !== filter) continue;
      if (normalizedQuery.length > 0) {
        const text = corpus.get(commandId(command)) ?? '';
        if (!matchesQuery(text, normalizedQuery)) continue;
      }
      acc.all += 1;
      if (command.category) {
        acc[command.category] = (acc[command.category] ?? 0) + 1;
      }
    }
    return acc;
  }, [availableCategories, commands, corpus, filter, normalizedQuery]);

  const categorySelectItems = [
    { value: 'all', label: `All Categories (${categoryCounts.all})` },
    ...availableCategories.map((cat) => ({
      value: cat,
      label: `${categoryLabels[cat] ?? formatLabel(cat)} (${categoryCounts[cat] ?? 0})`,
    })),
  ];

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'alias', label: 'Aliases', count: counts.alias },
    { key: 'global_alias', label: 'Globals', count: counts.global_alias },
    { key: 'function', label: 'Functions', count: counts.function },
    { key: 'action', label: 'Actions', count: counts.action },
  ];

  const clearSearch = () => {
    setQuery('');
    setFilter('all');
    setCategory('all');
    setExpanded([]);
    searchRef.current?.focus();
  };

  const hasActiveFilters = query.trim().length > 0 || filter !== 'all' || category !== 'all';

  return (
    <section
      className="grid min-w-0 gap-4 motion-safe:animate-in motion-safe:fade-in"
      aria-label="Command search and results"
    >
      <div className="grid gap-2.5">
        <label htmlFor="command-search" className="sr-only">
          Search commands
        </label>
        <InputGroup className="h-12 sm:h-9">
          <InputGroupAddon align="inline-start">
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            id="command-search"
            name="command-search"
            type="search"
            placeholder="Search commands…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <InputGroupAddon align="inline-end" className="gap-2">
            <span className="hidden text-sm tabular-nums sm:inline" aria-live="polite" aria-atomic="true">
              {filteredCommands.length} result{filteredCommands.length === 1 ? '' : 's'}
            </span>
            <Kbd className="hidden sm:inline-flex" aria-hidden="true">
              /
            </Kbd>
          </InputGroupAddon>
        </InputGroup>
        <span className="text-sm text-muted-foreground tabular-nums sm:hidden" aria-live="polite" aria-atomic="true">
          {filteredCommands.length} result{filteredCommands.length === 1 ? '' : 's'}
        </span>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <ToggleGroup
            value={[filter]}
            onValueChange={(values) => {
              const next = values[0] as Filter | undefined;
              if (next) setFilter(next);
            }}
            variant="outline"
            size="sm"
            spacing={2}
            aria-label="Filter commands by type"
            className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-fit sm:gap-1"
          >
            {filters.map((item) => (
              <ToggleGroupItem
                key={item.key}
                value={item.key}
                disabled={item.count === 0 && filter !== item.key}
                aria-label={`${item.label}, ${item.count} ${item.count === 1 ? 'result' : 'results'}`}
                className="h-11 w-full items-center justify-center gap-1.5 px-3 sm:h-7 sm:w-auto sm:px-2.5"
                data-command-filter={item.key}
              >
                <span data-filter-label>{item.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{item.count}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="w-full sm:w-60">
            <Select
              name="command-category"
              value={category}
              onValueChange={(value) => {
                if (!value) return;
                setCategory(value);
              }}
              items={categorySelectItems}
            >
              <SelectTrigger
                className="w-full data-[size=default]:h-11 sm:data-[size=default]:h-7 text-xs"
                aria-label="Filter commands by category"
              >
                <CategoryIcon category={category} className="text-muted-foreground size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  <SelectLabel>Command Categories</SelectLabel>
                  {categorySelectItems.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      disabled={categoryCounts[item.value] === 0 && category !== item.value}
                    >
                      <CategoryIcon category={item.value} className="text-muted-foreground size-3.5" />
                      <span className="flex-1">{item.label}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Active:</span>
            {query.trim().length > 0 && (
              <RemovableFilter
                onRemove={() => setQuery('')}
                removeLabel={`Remove query filter: ${query.trim()}`}
              >
                Query: “{query.trim()}”
              </RemovableFilter>
            )}
            {filter !== 'all' && (
              <RemovableFilter
                onRemove={() => setFilter('all')}
                removeLabel={`Remove type filter: ${filters.find((f) => f.key === filter)?.label}`}
              >
                Type: {filters.find((f) => f.key === filter)?.label}
              </RemovableFilter>
            )}
            {category !== 'all' && (
              <RemovableFilter
                onRemove={() => setCategory('all')}
                removeLabel={`Remove category filter: ${categoryLabels[category] ?? formatLabel(category)}`}
              >
                Category: {categoryLabels[category] ?? formatLabel(category)}
              </RemovableFilter>
            )}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clearSearch}
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset all
            </Button>
          </div>
        )}
      </div>

      {filteredCommands.length === 0 ? (
        <Empty className="min-h-52 gap-3 border p-5">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>
              <h2>No Commands Found</h2>
            </EmptyTitle>
            <EmptyDescription>
              No commands match {query ? <>“{query}”</> : 'the selected filter'}. Clear the search and
              filters to see every command.
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
        <Accordion
          value={expanded}
          onValueChange={setExpanded}
          hiddenUntilFound
          className="overflow-hidden rounded-xl border bg-card px-2 sm:px-3"
        >
          {filteredCommands.map((command) => {
            const detailsMatches = matchingDetailSections(command, query);
            return (
              <AccordionItem key={commandId(command)} value={commandId(command)} data-command={command.name} className="scroll-mt-32">
                <div className="flex items-start gap-1 sm:gap-2 [&>h2]:min-w-0 [&>h2]:flex-1">
                  <AccordionTrigger headingLevel={2} className="gap-2 py-3 hover:no-underline [&_[data-slot=accordion-trigger-icon]]:mt-1.5 sm:[&_[data-slot=accordion-trigger-icon]]:mt-1">
                    <span className="grid min-w-0 flex-1 gap-1.5 pr-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span
                          translate="no"
                          className="font-mono text-lg leading-7 font-semibold text-foreground sm:text-base sm:leading-6"
                        >
                          {highlightText(command.name, query)}
                        </span>
                        <Badge variant={typeVariant(command.type)}>{formatLabel(command.type)}</Badge>
                        {command.category && <CategoryBadge category={command.category} />}
                        {detailsMatches.length > 0 && (
                          <Badge variant="outline">Match: {detailsMatches.join(', ')}</Badge>
                        )}
                      </span>
                      {command.description && (
                        <span className="text-base font-normal leading-6 text-muted-foreground">
                          {highlightText(command.description, query)}
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <a
                    className="mt-1 inline-flex h-11 shrink-0 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground underline-offset-4 transition-colors before:content-['Docs_↗'] hover:bg-muted hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:mt-3 sm:h-6 sm:px-2.5 sm:before:content-['Reference_↗']"
                    href={commandHref(command)}
                    aria-label={`Read ${command.name} reference`}
                    title={`Read ${command.name} reference`}
                  />
                </div>
                {/* Detail bodies mount on expand: keeps the static HTML and DOM
                    budget flat regardless of catalogue size. */}
                {expanded.includes(commandId(command)) && (
                  <AccordionContent className="grid gap-4 pb-4">
                    <CommandDetails command={command} query={query} />
                  </AccordionContent>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </section>
  );
}
