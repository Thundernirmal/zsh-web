import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RotateCcwIcon, SearchIcon, SearchXIcon } from "lucide-react"

import { CategoryBadge } from "@/components/CategoryBadge"
import { highlightText } from "@/components/HighlightText"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatLabel, type ShellCommand } from "@/lib/shell-docs"

type Filter = "all" | "alias" | "global_alias" | "function"

const validFilters = new Set<Filter>(["all", "alias", "global_alias", "function"])

function commandId(command: ShellCommand) {
  return `${command.type}:${command.name}`
}

function typeVariant(type: string): "alias" | "global" | "function" | "metadata" {
  if (type === "alias") return "alias"
  if (type === "global_alias") return "global"
  if (type === "function") return "function"
  return "metadata"
}

function searchableText(command: ShellCommand) {
  return [
    command.name,
    command.command,
    command.usage,
    command.description,
    command.type,
    command.category,
    command.source,
    command.availability,
    command.dependencies,
    ...meaningfulExamples(command),
    ...searchableFeatures(command),
    ...(command.notes ?? []),
    ...(command.requires ?? []),
    ...(command.optional ?? []),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
}

function matchingDetailSections(command: ShellCommand, query: string) {
  const normalized = query.trim().toLowerCase()
  if (normalized.length < 2) return []

  const summary = [command.name, command.description, command.type, command.category, command.source]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (summary.includes(normalized)) return []

  const fields: Array<[string, Array<string | undefined>]> = [
    ["Command", [command.command]],
    ["Usage", [command.usage]],
    ["Availability", [command.availability]],
    ["Dependencies", [command.dependencies]],
    ["Requirements", command.requires ?? []],
    ["Integrations", command.optional ?? []],
    ["Examples", meaningfulExamples(command)],
    ["Features", searchableFeatures(command)],
    ["Notes", command.notes ?? []],
  ]

  return fields
    .filter(([, values]) => values.some((value) => value?.toLowerCase().includes(normalized)))
    .map(([label]) => label)
}

type FeatureDetail = {
  usage: string
  description: string
  examples: string[]
}

function splitFeature(feature: string) {
  const parts = feature.match(/^(.+?)\s{2,}(.+)$/)

  return parts
    ? { usage: parts[1].trim(), description: parts[2].trim() }
    : { usage: "", description: feature.trim() }
}

function searchableFeatures(command: ShellCommand) {
  return (command.features ?? []).flatMap((feature) => {
    const { usage } = splitFeature(feature)
    return usage ? [feature, `${command.name} ${usage}`] : [feature]
  })
}

function splitExample(example: string) {
  const parts = example.match(/^(.*?)\s+#\s+(.+)$/)

  return parts
    ? { command: parts[1].trim(), annotation: parts[2].trim() }
    : { command: example.trim(), annotation: undefined }
}

function normalizeCommandToken(token: string) {
  return token.replace(/^['"]|['"]$/g, "").replace(/[,;:]$/, "")
}

function literalUsageTokens(usage: string) {
  return usage
    .split(/\s+/)
    .map(normalizeCommandToken)
    .filter((token) => token && !/[<[\]]|\.\.\./.test(token))
}

function exampleArguments(command: ShellCommand, example: string) {
  const { command: exampleCommand } = splitExample(example)
  const tokens = (exampleCommand.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [])
    .map(normalizeCommandToken)

  if (tokens[0] === command.name) {
    tokens.shift()
  }

  return tokens
}

function normalizeInvocation(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function isRedundantStandaloneExample(command: ShellCommand, example: string) {
  const { command: exampleCommand, annotation } = splitExample(example)
  if (annotation) return false

  const normalizedExample = normalizeInvocation(exampleCommand)
  return [command.name, command.command, command.usage]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeInvocation(value) === normalizedExample)
}

function isRedundantFeatureExample(command: ShellCommand, usage: string, example: string) {
  const { annotation } = splitExample(example)
  if (annotation) return false

  const args = exampleArguments(command, example)
  const literals = literalUsageTokens(usage)

  return args.length === literals.length && args.every((arg, index) => arg === literals[index])
}

function featureMatchScore(usage: string, args: string[]) {
  const literals = literalUsageTokens(usage)
  if (literals.length === 0 || args.length === 0) return 0

  let matched = 0
  while (matched < literals.length && literals[matched] === args[matched]) {
    matched += 1
  }

  if (matched === 0) return 0

  return matched * 100 + (matched === literals.length ? 10 : 0)
}

function buildFeatureDetails(command: ShellCommand) {
  const features: FeatureDetail[] = (command.features ?? []).map((feature) => ({
    ...splitFeature(feature),
    examples: [],
  }))
  const unmatchedExamples: string[] = []
  const defaultFeature = command.notes
    ?.map((note) => note.match(/\bdefaults to ([A-Za-z0-9_-]+)/i)?.[1])
    .find(Boolean)

  for (const example of command.examples ?? []) {
    const args = exampleArguments(command, example)
    let bestIndex = -1
    let bestScore = 0

    features.forEach((feature, index) => {
      const score = featureMatchScore(feature.usage, args)
      if (score > bestScore) {
        bestIndex = index
        bestScore = score
      }
    })

    if (bestIndex === -1 && defaultFeature) {
      bestIndex = features.findIndex(
        (feature) => literalUsageTokens(feature.usage)[0] === defaultFeature,
      )
    }

    if (bestIndex >= 0) {
      const feature = features[bestIndex]
      if (!isRedundantFeatureExample(command, feature.usage, example)) {
        feature.examples.push(example)
      }
    } else if (!isRedundantStandaloneExample(command, example)) {
      unmatchedExamples.push(example)
    }
  }

  return { features, unmatchedExamples }
}

function meaningfulExamples(command: ShellCommand) {
  const { features, unmatchedExamples } = buildFeatureDetails(command)
  return [...unmatchedExamples, ...features.flatMap((feature) => feature.examples)]
}

function Example({ example, query }: { example: string; query: string }) {
  const { command, annotation } = splitExample(example)

  return (
    <div className="grid min-w-0 gap-0.5">
      <pre className="detail-code" data-detail-code>
        <code translate="no">{highlightText(command, query)}</code>
      </pre>
      {annotation && (
        <span className="text-pretty text-base leading-6 text-muted-foreground md:text-sm md:leading-5" data-detail-body>
          {highlightText(annotation, query)}
        </span>
      )}
    </div>
  )
}

function FeatureTable({
  id,
  commandName,
  features,
  query,
}: {
  id: string
  commandName: string
  features: FeatureDetail[]
  query: string
}) {
  if (features.length === 0) return null
  const hasFeatureExamples = features.some((feature) => feature.examples.length > 0)

  return (
    <section className="grid min-w-0 gap-2.5" aria-labelledby={`${id}-features`} data-feature-table>
      <div className="grid min-w-0 gap-0.5 sm:grid-cols-[auto_1fr] sm:items-baseline sm:gap-3" data-feature-introduction>
        <h3 id={`${id}-features`} className="detail-section-heading" data-detail-section-heading>
          {hasFeatureExamples ? "Features & Examples" : "Features"}
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
                  <code translate="no">{highlightText(feature.usage, query)}</code>
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
                  <span className="detail-label" data-detail-label>Example</span>
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
            Features and descriptions{hasFeatureExamples ? ", with matching examples" : ""} for {commandName}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-1/4">Usage</TableHead>
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
                      <code translate="no">{highlightText(feature.usage, query)}</code>
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
  )
}

function ExampleList({
  id,
  examples,
  query,
  additional,
}: {
  id: string
  examples: string[]
  query: string
  additional: boolean
}) {
  if (examples.length === 0) return null

  return (
    <section className="grid min-w-0 gap-2.5" aria-labelledby={`${id}-examples`}>
      <div className="grid gap-0.5">
        <h3 id={`${id}-examples`} className="detail-section-heading" data-detail-section-heading>
          {additional ? "Additional Examples" : "Examples"}
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
  )
}

function NotesList({ id, notes, query }: { id: string; notes: string[]; query: string }) {
  if (notes.length === 0) return null

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
  )
}

export default function SearchCommands({ commands }: { commands: ShellCommand[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [expanded, setExpanded] = useState<string[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  /* eslint-disable react-hooks/set-state-in-effect -- URL parameters only exist after Astro hydrates this static page. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextQuery = params.get("q")
    const nextFilter = params.get("type") as Filter | null
    const nextCommand = params.get("command")

    if (nextQuery) setQuery(nextQuery)
    if (nextFilter && validFilters.has(nextFilter)) setFilter(nextFilter)
    if (nextCommand && commands.some((command) => commandId(command) === nextCommand)) {
      setExpanded([nextCommand])
    }
    setIsMounted(true)
  }, [commands])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isMounted) return
    const url = new URL(window.location.href)

    if (query) url.searchParams.set("q", query)
    else url.searchParams.delete("q")
    if (filter !== "all") url.searchParams.set("type", filter)
    else url.searchParams.delete("type")
    if (expanded[0]) url.searchParams.set("command", expanded[0])
    else url.searchParams.delete("command")

    window.history.replaceState(window.history.state, "", url)
  }, [expanded, filter, isMounted, query])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = document.activeElement
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditable) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const matchesQuery = useCallback(
    (command: ShellCommand) =>
      normalizedQuery.length === 0 || searchableText(command).includes(normalizedQuery),
    [normalizedQuery],
  )

  const filteredCommands = useMemo(
    () => commands.filter((command) => matchesQuery(command) && (filter === "all" || command.type === filter)),
    [commands, filter, matchesQuery],
  )

  const counts = useMemo(
    () => ({
      all: commands.filter(matchesQuery).length,
      alias: commands.filter((command) => matchesQuery(command) && command.type === "alias").length,
      global_alias: commands.filter((command) => matchesQuery(command) && command.type === "global_alias").length,
      function: commands.filter((command) => matchesQuery(command) && command.type === "function").length,
    }),
    [commands, matchesQuery],
  )

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: "All", count: counts.all },
    { key: "alias", label: "Aliases", count: counts.alias },
    { key: "global_alias", label: "Globals", count: counts.global_alias },
    { key: "function", label: "Functions", count: counts.function },
  ]

  const clearSearch = () => {
    setQuery("")
    setFilter("all")
    setExpanded([])
    searchRef.current?.focus()
  }

  return (
    <section className="grid min-w-0 gap-4 motion-safe:animate-in motion-safe:fade-in" aria-label="Command search and results">
      <div className="grid gap-2.5">
        <label htmlFor="command-search" className="sr-only">Search commands</label>
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
              {filteredCommands.length} result{filteredCommands.length === 1 ? "" : "s"}
            </span>
            <Kbd className="hidden sm:inline-flex" aria-hidden="true">/</Kbd>
          </InputGroupAddon>
        </InputGroup>
        <span className="text-sm text-muted-foreground tabular-nums sm:hidden" aria-live="polite" aria-atomic="true">
          {filteredCommands.length} result{filteredCommands.length === 1 ? "" : "s"}
        </span>

        <div>
          <ToggleGroup
            value={[filter]}
            onValueChange={(values) => {
              const next = values[0] as Filter | undefined
              if (next) setFilter(next)
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
                aria-label={`${item.label}, ${item.count} ${item.count === 1 ? "result" : "results"}`}
                className="h-11 w-full items-center justify-center gap-1.5 px-3 sm:h-7 sm:w-auto sm:px-2.5"
                data-command-filter={item.key}
              >
                <span data-filter-label>{item.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{item.count}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {filteredCommands.length === 0 ? (
        <Empty className="min-h-52 gap-3 border p-5">
          <EmptyHeader>
            <EmptyMedia variant="icon"><SearchXIcon aria-hidden="true" /></EmptyMedia>
            <EmptyTitle><h2>No Commands Found</h2></EmptyTitle>
            <EmptyDescription>
              No commands match {query ? <>&ldquo;{query}&rdquo;</> : "the selected filter"}. Clear the search and filters to see every command.
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
            const detailsMatches = matchingDetailSections(command, query)
            const detailId = commandId(command).replace(/[^A-Za-z0-9_-]/g, "-")
            const { features, unmatchedExamples } = buildFeatureDetails(command)
            const hasFeatures = features.length > 0
            const displayExamples = unmatchedExamples
            const notes = command.notes ?? []
            const hasReferenceDetails = hasFeatures || displayExamples.length > 0 || notes.length > 0
            const syntaxDetails: Array<{ label: string; value: string }> = []

            if (command.command) {
              syntaxDetails.push({
                label: command.type === "function" ? "Command" : "Expands To",
                value: command.command,
              })
            }
            if (command.usage && command.usage !== command.command) {
              syntaxDetails.push({ label: "Usage", value: command.usage })
            }

            return (
              <AccordionItem key={commandId(command)} value={commandId(command)} data-command={command.name}>
                <AccordionTrigger headingLevel={2} className="gap-2 py-3 hover:no-underline">
                  <span className="grid min-w-0 flex-1 gap-1.5 pr-2">
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span translate="no" className="font-mono text-lg leading-7 font-semibold text-foreground sm:text-base sm:leading-6">{highlightText(command.name, query)}</span>
                      <Badge variant={typeVariant(command.type)}>{formatLabel(command.type)}</Badge>
                      {command.category && <CategoryBadge category={command.category} />}
                      {command.source && <Badge variant="metadata">{formatLabel(command.source)}</Badge>}
                      {detailsMatches.length > 0 && (
                        <Badge variant="outline">Match: {detailsMatches.join(", ")}</Badge>
                      )}
                    </span>
                    {command.description && (
                      <span className="text-base font-normal leading-6 text-muted-foreground">
                        {highlightText(command.description, query)}
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="grid gap-4 pb-4">
                  <Separator />
                  <div className="grid gap-2.5">
                    {syntaxDetails.map((detail, index) => (
                      <Fragment key={detail.label}>
                        {index > 0 && <Separator />}
                        <div className="grid min-w-0 gap-1">
                          <h3 className="detail-section-heading" data-detail-section-heading>
                            {detail.label}
                          </h3>
                          <pre className="detail-code font-semibold" data-detail-code>
                            <code translate="no">{highlightText(detail.value, query)}</code>
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

                  {(command.interactive || command.plainMode || command.richOutput || command.requires?.length || command.optional?.length) && (
                    <div className="flex flex-wrap gap-1.5">
                      {command.interactive && <Badge variant="metadata">Interactive</Badge>}
                      {command.plainMode && <Badge variant="metadata">Plain Mode</Badge>}
                      {command.richOutput && <Badge variant="metadata">Rich Output</Badge>}
                      {command.requires?.map((requirement) => (
                        <Badge key={`${commandId(command)}:requires:${requirement}`} variant="metadata">Requires {formatLabel(requirement)}</Badge>
                      ))}
                      {command.optional?.map((dependency) => (
                        <Badge key={`${commandId(command)}:optional:${dependency}`} variant="metadata">Uses {formatLabel(dependency)} if available</Badge>
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
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </section>
  )
}
