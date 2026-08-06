import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { RotateCcwIcon, SearchIcon, SearchXIcon } from "lucide-react"

import commandsData from "@/data/commands.json"
import { CategoryBadge } from "@/components/CategoryBadge"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Command = {
  name: string
  command?: string
  usage?: string
  description?: string
  type: string
  category?: string
  source?: string
  availability?: string
  examples?: string[]
  features?: string[]
  notes?: string[]
  requires?: string[]
  optional?: string[]
  interactive?: boolean
  plainMode?: boolean
  richOutput?: boolean
}

type Filter = "all" | "alias" | "global_alias" | "function"

const commands = commandsData as Command[]
const validFilters = new Set<Filter>(["all", "alias", "global_alias", "function"])

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function commandId(command: Command) {
  return `${command.type}:${command.name}`
}

function typeVariant(type: string): "alias" | "global" | "function" | "metadata" {
  if (type === "alias") return "alias"
  if (type === "global_alias") return "global"
  if (type === "function") return "function"
  return "metadata"
}

function highlightText(text: string, query: string): ReactNode {
  const normalized = query.trim()
  if (normalized.length < 2) return text

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const splitRegex = new RegExp(`(${escaped})`, "gi")
  const exactRegex = new RegExp(`^${escaped}$`, "i")

  return text.split(splitRegex).map((part, index) =>
    exactRegex.test(part) ? (
      <mark key={`${part}:${index}`} className="rounded-sm bg-primary/20 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

function searchableText(command: Command) {
  return [
    command.name,
    command.command,
    command.usage,
    command.description,
    command.type,
    command.category,
    command.source,
    command.availability,
    ...(command.examples ?? []),
    ...(command.features ?? []),
    ...(command.notes ?? []),
    ...(command.requires ?? []),
    ...(command.optional ?? []),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
}

function matchingDetailSections(command: Command, query: string) {
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
    ["Requirements", command.requires ?? []],
    ["Integrations", command.optional ?? []],
    ["Examples", command.examples ?? []],
    ["Features", command.features ?? []],
    ["Notes", command.notes ?? []],
  ]

  return fields
    .filter(([, values]) => values.some((value) => value?.toLowerCase().includes(normalized)))
    .map(([label]) => label)
}

function DetailList({ title, items, query }: { title: string; items?: string[]; query: string }) {
  if (!items?.length) return null

  return (
    <section className="grid min-w-0 gap-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <ul className="grid gap-1.5 pl-4 text-base leading-6 marker:text-primary">
        {items.map((item) => (
          <li key={`${title}:${item}`}>{highlightText(item, query)}</li>
        ))}
      </ul>
    </section>
  )
}

export default function SearchCommands() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [expanded, setExpanded] = useState<string[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

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
  }, [])

  useEffect(() => {
    if (!isMounted) return
    const url = new URL(window.location.href)

    if (query) url.searchParams.set("q", query)
    else url.searchParams.delete("q")
    if (filter !== "all") url.searchParams.set("type", filter)
    else url.searchParams.delete("type")
    if (expanded[0]) url.searchParams.set("command", expanded[0])
    else url.searchParams.delete("command")

    window.history.replaceState({}, "", url)
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
  const matchesQuery = (command: Command) =>
    normalizedQuery.length === 0 || searchableText(command).includes(normalizedQuery)

  const filteredCommands = useMemo(
    () => commands.filter((command) => matchesQuery(command) && (filter === "all" || command.type === filter)),
    [filter, normalizedQuery],
  )

  const counts = {
    all: commands.filter(matchesQuery).length,
    alias: commands.filter((command) => matchesQuery(command) && command.type === "alias").length,
    global_alias: commands.filter((command) => matchesQuery(command) && command.type === "global_alias").length,
    function: commands.filter((command) => matchesQuery(command) && command.type === "function").length,
  }

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
        <InputGroup className="h-9">
          <InputGroupAddon align="inline-start">
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            id="command-search"
            name="command-search"
            type="search"
            placeholder="Search commands, aliases, options…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <InputGroupAddon align="inline-end" className="gap-2">
            <span className="text-sm tabular-nums" aria-live="polite" aria-atomic="true">
              {filteredCommands.length} result{filteredCommands.length === 1 ? "" : "s"}
            </span>
            <Kbd className="hidden sm:inline-flex" aria-hidden="true">/</Kbd>
          </InputGroupAddon>
        </InputGroup>

        <div className="overflow-x-auto pb-1">
          <ToggleGroup
            value={[filter]}
            onValueChange={(values) => {
              const next = values[0] as Filter | undefined
              if (next) setFilter(next)
            }}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Filter commands by type"
            className="min-w-max"
          >
            {filters.map((item) => (
              <ToggleGroupItem
                key={item.key}
                value={item.key}
                disabled={item.count === 0 && filter !== item.key}
                aria-label={`${item.label}, ${item.count} results`}
              >
                {item.label}
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

            return (
              <AccordionItem key={commandId(command)} value={commandId(command)}>
                <AccordionTrigger className="gap-2 py-3 hover:no-underline">
                  <span className="grid min-w-0 flex-1 gap-1.5 pr-2">
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="font-mono text-base font-semibold text-foreground">{highlightText(command.name, query)}</span>
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
                <AccordionContent className="grid gap-4 border-t pt-3 pb-4">
                  <div className="grid gap-2.5">
                    {command.command && (
                      <div className="grid gap-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Command</h4>
                        <code className="block max-w-full overflow-x-auto rounded-lg border bg-background px-2.5 py-2 text-base leading-6 text-foreground">
                          {highlightText(command.command, query)}
                        </code>
                      </div>
                    )}
                    {command.usage && command.usage !== command.command && (
                      <div className="grid gap-1.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Usage</h4>
                        <code className="block max-w-full overflow-x-auto rounded-lg border bg-background px-2.5 py-2 text-base leading-6 text-foreground">
                          {highlightText(command.usage, query)}
                        </code>
                      </div>
                    )}
                    {command.availability && (
                      <p className="text-base leading-6 text-muted-foreground">{highlightText(command.availability, query)}</p>
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

                  <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <DetailList title="Examples" items={command.examples} query={query} />
                    <DetailList title="Features" items={command.features} query={query} />
                    <DetailList title="Notes" items={command.notes} query={query} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </section>
  )
}
