import type { ReactNode } from 'react';

export function highlightText(text: string, query: string): ReactNode {
  const normalized = query.trim();
  if (normalized.length < 2) return text;

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const splitRegex = new RegExp(`(${escaped})`, 'gi');
  const exactRegex = new RegExp(`^${escaped}$`, 'i');

  return text.split(splitRegex).map((part, index) =>
    exactRegex.test(part) ? (
      <mark key={`${part}:${index}`} className="rounded-sm bg-primary/20 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
