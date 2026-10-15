import type { z } from 'zod';
import type { shellCommandSchema, shellTipSchema } from '@/lib/content-schemas';

export type ShellCommand = z.infer<typeof shellCommandSchema>;
export type ShellTip = z.infer<typeof shellTipSchema>;

export function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function commandHref(command: Pick<ShellCommand, 'id'>) {
  return `/commands/${command.id.replace(/^command-/, '')}/`;
}

/**
 * The source badge for a tip, or undefined when it would only repeat the
 * category label (e.g. "Git" beside "Git") or the command the tip links to.
 */
export function tipSourceLabel(
  tip: Pick<ShellTip, 'source' | 'commandName'>,
  categoryLabel: string,
): string | undefined {
  if (!tip.source) return undefined;
  const source = tip.source.toLowerCase();
  if (categoryLabel.toLowerCase().includes(source) || tip.commandName?.toLowerCase() === source) return undefined;
  return formatLabel(tip.source);
}
