import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RotateCcwIcon, SearchIcon, SearchXIcon, XIcon } from 'lucide-react';

import { CategoryBadge, CategoryIcon } from '@/components/CategoryBadge';
import { CopyButton } from '@/components/CopyButton';
import { highlightText } from '@/components/HighlightText';
import { SyntaxCode } from '@/components/SyntaxCode';
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
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSlashFocus } from '@/hooks/useSlashFocus';
import { categoryLabels, categoryOrder, type Category } from '@/lib/categories';
import {
  buildFeatureDetails,
  commandId,
  matchingDetailSections,
  searchableText,
  splitExample,
  type FeatureDetail,
  typeVariant,
} from '@/lib/command-search';
import { formatLabel, type ShellCommand } from '@/lib/shell-docs';

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

function Example({ example, query }: { example: string; query: string }) {
  const { command, annotation } = splitExample(example);
  return (
    <div className="group/example grid min-w-0 gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <pre className="detail-code flex-1" data-detail-code>
          <SyntaxCode code={command} query={query} />
        </pre>
        <CopyButton
          text={command}
          label="Copy example"
          className="size-7 shrink-0 opacity-70 group-hover/example:opacity-100 transition-opacity"
        />
      </div>
      {annotation && (
        <span
          className="text-pretty text-base leading-6 text-muted-foreground md:text-sm md:leading-5"
          data-detail-body
        >
          {highlightText(annotation, query)}
        </span>
      )}
    </div>
  );
}

function FeatureTable({
  id,
  commandName,
  features,
  query,
}: {
  id: string;
  commandName: string;
  features: FeatureDetail[];
  query: string;
}) {
  if (features.length === 0) return null;
  const hasFeatureExamples = features.some((feature) => feature.examples.length > 0);

  return (
    <section className="grid min-w-0 gap-2.5" aria-labelledby={`${id}-features`} data-feature-table>
      <div
        className="grid min-w-0 gap-0.5 sm:grid-cols-[auto_1fr] sm:items-baseline sm:gap-3"
        data-feature-introduction
      >
        <h3 id={`${id}-features`} className="detail-section-heading" data-detail-section-heading>
          {hasFeatureExamples ? 'Features & Examples' : 'Features'}
        </h3>
        {hasFeatureExamples && (
          <p className="detail-body text-muted-foreground" data-detail-body>
            Examples appear only where they add useful detail.
          </p>
        )}
      </div>
      <dl className="grid md:hidden">
        {features.map((feature, index) => (
          <div
            key={`${feature.usage}:${feature.description}`}
            className="grid min-w-0 gap-1.5 pt-3 first:pt-0"
            data-feature-row
          >
            {feature.usage ? (
              <dt>
                <pre className="detail-code font-semibold" data-detail-code>
                  <SyntaxCode code={feature.usage} query={query} />
                </pre>
              </dt>
            ) : (
              <dt className="detail-label">General Feature</dt>
            )}
            <dd className="grid min-w-0 gap-2.5">
              <p className="detail-body" data-detail-body>
                {highlightText(feature.description, query)}
              </p>
              {feature.examples.length > 0 && (
                <div className="grid min-w-0 gap-1.5">
                  <span className="detail-label" data-detail-label>
                    Example
                  </span>
                  <div className="grid min-w-0 gap-2">
                    {feature.examples.map((example) => (
                      <Example key={example} example={example} query={query} />
                    ))}
                  </div>
                </div>
              )}
            </dd>
            {index < features.length - 1 && <Separator className="mt-1" />}
          </div>
        ))}
      </dl>
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableCaption className="sr-only">
            Features and descriptions{hasFeatureExamples ? ', with matching examples' : ''} for{' '}
            {commandName}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-1/4">
                Usage
              </TableHead>
              <TableHead scope="col">Description</TableHead>
              {hasFeatureExamples && <TableHead scope="col" className="w-1/3">Example</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={`${feature.usage}:${feature.description}`}>
                <TableHead scope="row" className="h-auto align-top whitespace-normal py-2">
                  {feature.usage ? (
                    <pre className="detail-code font-semibold">
                      <SyntaxCode code={feature.usage} query={query} />
                    </pre>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableHead>
                <TableCell className="align-top whitespace-normal text-pretty leading-6">
                  {highlightText(feature.description, query)}
                </TableCell>
                {hasFeatureExamples && (
                  <TableCell className="align-top whitespace-normal">
                    {feature.examples.length > 0 ? (
                      <div className="grid min-w-0 gap-2">
                        {feature.examples.map((example) => (
                          <Example key={example} example={example} query={query} />
                        ))}
                      </div>
                    ) : (
                      <span className="sr-only">No example documented</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function ExampleList({
  id,
  examples,
  query,
  additional,
}: {
  id: string;
  examples: string[];
  query: string;
  additional: boolean;
}) {
  if (examples.length === 0) return null;
  return (
    <section className="grid min-w-0 gap-2.5" aria-labelledby={`${id}-examples`}>
      <div className="grid gap-0.5">
        <h3 id={`${id}-examples`} className="detail-section-heading" data-detail-section-heading>
          {additional ? 'Additional Examples' : 'Examples'}
        </h3>
        {additional && (
          <p className="detail-body text-muted-foreground" data-detail-body>
            General workflows that are not tied to one feature.
          </p>
        )}
      </div>
      <ul className="grid">
        {examples.map((example, index) => (
          <li key={example} className="grid gap-2 pt-2.5 first:pt-0">
            <Example example={example} query={query} />
            {index < examples.length - 1 && <Separator />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotesList({ id, notes, query }: { id: string; notes: string[]; query: string }) {
  if (notes.length === 0) return null;
  return (
    <section className="grid min-w-0 gap-2.5" aria-labelledby={`${id}-notes`}>
      <h3 id={`${id}-notes`} className="detail-section-heading" data-detail-section-heading>
        Notes
      </h3>
      <ul className="grid">
        {notes.map((note, index) => (
          <li key={note} className="detail-body grid gap-2 pt-2.5 first:pt-0" data-detail-body>
            <span className="min-w-0">{highlightText(note, query)}</span>
            {index < notes.length - 1 && <Separator />}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SearchCommands({ commands }: SearchCommandsProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [category, setCategory] = useState<string>('all');
  const [expanded, setExpanded] = useState<string[]>([]);
  const isInitialMount = useRef(true);
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
        setExpanded([nextCommand]);
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

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  const corpus = useMemo(
    () => new Map(commands.map((c) => [commandId(c), searchableText(c)])),
    [commands],
  );

  const detailsMap = useMemo(
    () => new Map(commands.map((c) => [commandId(c), buildFeatureDetails(c)])),
    [commands],
  );

  const filteredCommands = useMemo(() => {
    return commands.filter((command) => {
      if (filter !== 'all' && command.type !== filter) return false;
      if (category !== 'all' && command.category !== category) return false;
      if (normalizedQuery.length === 0) return true;
      const text = corpus.get(commandId(command)) ?? '';
      return text.includes(normalizedQuery);
    });
  }, [category, commands, corpus, filter, normalizedQuery]);

  const counts = useMemo(() => {
    const acc = { all: 0, alias: 0, global_alias: 0, function: 0, action: 0 } as Record<Filter, number> & {
      all: number;
    };
    for (const command of commands) {
      if (category !== 'all' && command.category !== category) continue;
      if (normalizedQuery.length > 0) {
        const text = corpus.get(commandId(command)) ?? '';
        if (!text.includes(normalizedQuery)) continue;
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
        if (!text.includes(normalizedQuery)) continue;
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
            const detailId = commandId(command).replace(/[^A-Za-z0-9_-]/g, '-');
            const { features, unmatchedExamples } = detailsMap.get(commandId(command)) ?? {
              features: [],
              unmatchedExamples: [],
            };
            const hasFeatures = features.length > 0;
            const displayExamples = unmatchedExamples;
            const notes = command.notes ?? [];
            const hasReferenceDetails = hasFeatures || displayExamples.length > 0 || notes.length > 0;
            // Function syntax is a placeholder template, not a runnable command:
            // the prominent copy action must hand over a concrete example
            // instead, and only fall back to an explicitly labeled template copy.
            const firstRunnableExample = command.examples?.length
              ? splitExample(command.examples[0]).command
              : undefined;
            const syntaxDetails: Array<{
              label: string;
              value: string;
              copyText: string;
              copyLabel: string;
            }> = [];
            if (command.command) {
              if ((command.type === 'function' || command.type === 'action')) {
                syntaxDetails.push({
                  label: 'Syntax',
                  value: command.command,
                  copyText: firstRunnableExample ?? command.command,
                  copyLabel: firstRunnableExample
                    ? `Copy example: ${firstRunnableExample}`
                    : 'Copy syntax template',
                });
              } else {
                syntaxDetails.push({
                  label: 'Expands To',
                  value: command.command,
                  copyText: command.command,
                  copyLabel: 'Copy expansion',
                });
              }
            }
            if (command.usage && command.usage !== command.command) {
              syntaxDetails.push({
                label: 'Usage',
                value: command.usage,
                copyText: command.usage,
                copyLabel: 'Copy usage',
              });
            }
            return (
              <AccordionItem key={commandId(command)} value={commandId(command)} data-command={command.name}>
                <AccordionTrigger headingLevel={2} className="gap-2 py-3 hover:no-underline">
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
                      {command.source && <Badge variant="metadata">{formatLabel(command.source)}</Badge>}
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
                {/* Detail bodies mount on expand: keeps the static HTML and DOM
                    budget flat regardless of catalogue size. */}
                {expanded.includes(commandId(command)) && (
                  <AccordionContent className="grid gap-4 pb-4">
                  <Separator />
                  <div className="grid gap-2.5">
                    {syntaxDetails.map((detail, index) => (
                      <Fragment key={detail.label}>
                        {index > 0 && <Separator />}
                        <div className="grid min-w-0 gap-1">
                          <div className="flex items-center justify-between">
                            <h3 className="detail-section-heading" data-detail-section-heading>
                              {detail.label}
                            </h3>
                            <CopyButton
                              text={detail.copyText}
                              label={detail.copyLabel}
                              className="size-7 shrink-0"
                            />
                          </div>
                          <pre className="detail-code font-semibold" data-detail-code>
                            <SyntaxCode code={detail.value} query={query} />
                          </pre>
                        </div>
                      </Fragment>
                    ))}
                    {(command.availability || command.dependencies) && (
                      <dl className="grid min-w-0 gap-x-4 gap-y-1.5 text-base leading-7 sm:grid-cols-[7rem_minmax(0,1fr)] sm:text-sm sm:leading-6">
                        {command.availability && (
                          <Fragment>
                            <dt className="font-medium text-muted-foreground">Availability</dt>
                            <dd className="min-w-0 text-pretty text-foreground">
                              {highlightText(command.availability, query)}
                            </dd>
                          </Fragment>
                        )}
                        {command.dependencies && (
                          <Fragment>
                            <dt className="font-medium text-muted-foreground">Dependencies</dt>
                            <dd className="min-w-0 text-pretty text-foreground">
                              {highlightText(command.dependencies, query)}
                            </dd>
                          </Fragment>
                        )}
                      </dl>
                    )}
                  </div>

                  {(command.interactive ||
                    command.terminalAdaptive ||
                    command.requires?.length ||
                    command.optional?.length) && (
                    <div className="flex flex-wrap gap-1.5">
                      {command.interactive && (
                        <Badge variant="metadata" title="Must run in an interactive shell">
                          Interactive terminal
                        </Badge>
                      )}
                      {command.terminalAdaptive && (
                        <Badge
                          variant="metadata"
                          title="Styled output when the terminal supports it; plain output otherwise"
                        >
                          Adapts to terminal
                        </Badge>
                      )}
                      {command.requires?.map((requirement) => (
                        <Badge key={`${commandId(command)}:requires:${requirement}`} variant="metadata">
                          Requires {formatLabel(requirement)}
                        </Badge>
                      ))}
                      {command.optional?.map((dependency) => (
                        <Badge key={`${commandId(command)}:optional:${dependency}`} variant="metadata">
                          Uses {formatLabel(dependency)} if available
                        </Badge>
                      ))}
                    </div>
                  )}

                  {hasReferenceDetails && (
                    <div className="grid min-w-0 gap-5">
                      {hasFeatures && (
                        <FeatureTable
                          id={detailId}
                          commandName={command.name}
                          features={features}
                          query={query}
                        />
                      )}
                      {hasFeatures && displayExamples.length > 0 && <Separator />}
                      <ExampleList
                        id={detailId}
                        examples={displayExamples}
                        query={query}
                        additional={hasFeatures}
                      />
                      {(hasFeatures || displayExamples.length > 0) && notes.length > 0 && <Separator />}
                      <NotesList id={detailId} notes={notes} query={query} />
                    </div>
                  )}
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
