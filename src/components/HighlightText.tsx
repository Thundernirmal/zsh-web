import type { ReactNode } from 'react';

const regexCache = new Map<string, { split: RegExp; exact: RegExp }>();

function getHighlightRegex(query: string) {
  const key = query.trim().toLowerCase();
  const cached = regexCache.get(key);
  if (cached) return cached;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entry = {
    split: new RegExp(`(${escaped})`, 'gi'),
    exact: new RegExp(`^${escaped}$`, 'i'),
  };
  regexCache.set(key, entry);
  return entry;
}

export function highlightText(text: string, query: string): ReactNode {
  const normalized = query.trim();
  if (normalized.length < 2) return text;

  const { split, exact } = getHighlightRegex(normalized);

  return text.split(split).map((part, index) =>
    exact.test(part) ? (
      <mark key={index} className="rounded-sm bg-primary/20 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
