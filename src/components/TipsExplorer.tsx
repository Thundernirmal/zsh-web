import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RotateCcwIcon, SearchIcon, SearchXIcon } from "lucide-react"

import { CategoryBadge, CategoryIcon } from "@/components/CategoryBadge"
import { highlightText } from "@/components/HighlightText"
import { Badge } from "@/components/ui/badge"
import { categoryLabels, categoryOrder, type Category } from "@/lib/categories"
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
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup } from "@/components/ui/item"
import { Kbd } from "@/components/ui/kbd"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatLabel, type ShellTip } from "@/lib/shell-docs"

const PAGE_SIZE = 24



export default function TipsExplorer({ tips }: { tips: ShellTip[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isMounted, setIsMounted] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const availableCategories = useMemo(() => {
    const present = Array.from(new Set(tips.map((tip) => tip.category as Category)))
    const known = categoryOrder.filter((category) => present.includes(category))
    const additional = present.filter((category) => !categoryOrder.includes(category as Category)).sort()

    return [...known, ...additional]
  }, [tips])

  /* eslint-disable react-hooks/set-state-in-effect -- URL parameters only exist after Astro hydrates this static page. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextQuery = params.get("q")
    const nextFilter = params.get("cat")

    if (nextQuery) setQuery(nextQuery)
    if (nextFilter && (availableCategories as string[]).includes(nextFilter)) setFilter(nextFilter)
    setIsMounted(true)
  }, [availableCategories])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isMounted) return
    const url = new URL(window.location.href)

    if (query) url.searchParams.set("q", query)
    else url.searchParams.delete("q")
    if (filter !== "all") url.searchParams.set("cat", filter)
    else url.searchParams.delete("cat")

    window.history.replaceState(window.history.state, "", url)
  }, [filter, isMounted, query])

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

  const matchesQuery = useCallback(
    (tip: ShellTip) => {
      const normalized = query.trim().toLowerCase()
      if (!normalized) return true
      return [tip.text, tip.category, tip.source, tip.availability]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized))
    },
    [query],
  )

  const filteredTips = useMemo(
    () => tips.filter((tip) => matchesQuery(tip) && (filter === "all" || tip.category === filter)),
    [filter, matchesQuery, tips],
  )
  const visibleTips = filteredTips.slice(0, visibleCount)

  const counts = useMemo(() => {
    const categoryCounts: Record<string, number> = { all: tips.filter(matchesQuery).length }
    for (const category of availableCategories) {
      categoryCounts[category] = tips.filter((tip) => tip.category === category && matchesQuery(tip)).length
    }
    return categoryCounts
  }, [availableCategories, matchesQuery, tips])

  const selectItems = [
    { value: "all", label: `All Categories (${counts.all})` },
    ...availableCategories.map((category) => ({
      value: category,
      label: `${categoryLabels[category] ?? formatLabel(category)} (${counts[category]})`,
    })),
  ]

  const clearSearch = () => {
    setQuery("")
    setFilter("all")
    setVisibleCount(PAGE_SIZE)
    searchRef.current?.focus()
  }

  return (
    <section className="grid min-w-0 gap-4 motion-safe:animate-in motion-safe:fade-in" aria-label="Tips search and results">
      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <label htmlFor="tips-search" className="sr-only">Search tips</label>
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
                setQuery(event.target.value)
                setVisibleCount(PAGE_SIZE)
              }}
              autoComplete="off"
              spellCheck={false}
            />
            <InputGroupAddon align="inline-end" className="gap-2">
              <span className="hidden text-sm tabular-nums sm:inline" aria-live="polite" aria-atomic="true">
                {filteredTips.length} tip{filteredTips.length === 1 ? "" : "s"}
              </span>
              <Kbd className="hidden sm:inline-flex" aria-hidden="true">/</Kbd>
            </InputGroupAddon>
          </InputGroup>
          <span className="mt-2 block text-sm text-muted-foreground tabular-nums sm:hidden" aria-live="polite" aria-atomic="true">
            {filteredTips.length} tip{filteredTips.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="min-w-0">
          <Select
            name="tip-category"
            value={filter}
            onValueChange={(value) => {
              if (!value) return
              setFilter(value)
              setVisibleCount(PAGE_SIZE)
            }}
            items={selectItems}
          >
            <SelectTrigger className="w-full data-[size=default]:h-11 sm:data-[size=default]:h-9" aria-label="Filter tips by category">
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
            <EmptyMedia variant="icon"><SearchXIcon aria-hidden="true" /></EmptyMedia>
            <EmptyTitle><h2>No Tips Found</h2></EmptyTitle>
            <EmptyDescription>
              No tips match {query ? <>&ldquo;{query}&rdquo;</> : "the selected category"}. Clear the search and category to see every tip.
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
          <ItemGroup className="gap-2">
            {visibleTips.map((tip) => (
              <Item
                key={`${tip.category}:${tip.text}`}
                role="listitem"
                variant="outline"
                size="xs"
                className="min-w-0 items-start bg-card"
              >
                <ItemContent className="min-w-0 gap-1">
                  <ItemDescription className="line-clamp-none text-pretty">
                    {highlightText(tip.text, query)}
                  </ItemDescription>
                  {tip.availability && (
                    <p className="text-sm leading-5 text-muted-foreground">{highlightText(tip.availability, query)}</p>
                  )}
                </ItemContent>
                <ItemActions className="basis-full flex-wrap justify-start gap-1.5 sm:ml-auto sm:basis-auto sm:justify-end">
                  <CategoryBadge category={tip.category} />
                  {tip.source && <Badge variant="metadata">{formatLabel(tip.source)}</Badge>}
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
          {visibleTips.length < filteredTips.length && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Show {Math.min(PAGE_SIZE, filteredTips.length - visibleTips.length)} More Tips
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
