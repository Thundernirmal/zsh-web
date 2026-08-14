import type { z } from 'astro/zod';
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
