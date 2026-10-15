import type { ShellCommand } from '@/lib/shell-docs';

export type FeatureDetail = {
  usage: string;
  description: string;
  examples: string[];
  aliases?: string[];
};

export function commandId(command: ShellCommand): string {
  return `${command.type}:${command.name}`;
}

export function typeVariant(type: string): 'alias' | 'global' | 'function' | 'metadata' {
  if (type === 'alias') return 'alias';
  if (type === 'global_alias') return 'global';
  if (type === 'function') return 'function';
  // Actions document one subcommand of a parent function; the neutral
  // metadata styling keeps them visually distinct from whole commands.
  return 'metadata';
}

function normalizeCommandToken(token: string): string {
  return token.replace(/^['"]|['"]$/g, '').replace(/[,;:]$/, '');
}

function literalUsageTokens(usage: string): string[] {
  return usage
    .split(/\s+/)
    .map(normalizeCommandToken)
    .filter((token) => token && !/[<[\]]|\.\.\./.test(token));
}

function splitFeature(feature: string) {
  // Long optional-argument syntax can consume the shell help column's padding.
  // Recognize that boundary without treating ordinary prose as command syntax.
  const parts = feature.match(/^(.+?)\s{2,}(.+)$/)
    ?? feature.match(/^([a-z][\w-]*(?:\s+(?:\[[^\]]+\]|<[^>]+>))+)\s+([A-Z].+)$/);
  return parts
    ? { usage: parts[1].trim(), description: parts[2].trim() }
    : { usage: '', description: feature.trim() };
}

function splitExample(example: string) {
  const parts = example.match(/^(.*?)\s+#\s+(.+)$/);
  return parts
    ? { command: parts[1].trim(), annotation: parts[2].trim() }
    : { command: example.trim(), annotation: undefined as string | undefined };
}

function exampleArguments(command: ShellCommand, example: string): string[] {
  const { command: exampleCommand } = splitExample(example);
  const tokens = (exampleCommand.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []).map(
    normalizeCommandToken,
  );
  if (tokens[0] === command.name) tokens.shift();
  return tokens;
}

function normalizeInvocation(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isRedundantStandaloneExample(command: ShellCommand, example: string): boolean {
  const { command: exampleCommand, annotation } = splitExample(example);
  if (annotation) return false;
  const normalizedExample = normalizeInvocation(exampleCommand);
  return [command.name, command.command, command.usage]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeInvocation(value) === normalizedExample);
}

function isRedundantFeatureExample(command: ShellCommand, usage: string, example: string): boolean {
  const { annotation } = splitExample(example);
  if (annotation) return false;
  const args = exampleArguments(command, example);
  const literals = literalUsageTokens(usage);
  return args.length === literals.length && args.every((arg, index) => arg === literals[index]);
}

function featureMatchScore(usage: string, args: string[]): number {
  const literals = literalUsageTokens(usage);
  if (literals.length === 0 || args.length === 0) return 0;
  let matched = 0;
  while (matched < literals.length && literals[matched] === args[matched]) matched += 1;
  if (matched === 0) return 0;
  return matched * 100 + (matched === literals.length ? 10 : 0);
}

function searchableFeatures(command: ShellCommand): string[] {
  return (command.features ?? []).flatMap((feature) => {
    const { usage } = splitFeature(feature);
    return usage ? [feature, `${command.name} ${usage}`] : [feature];
  });
}

export function buildFeatureDetails(command: ShellCommand) {
  const features: FeatureDetail[] = (command.features ?? []).map((feature) => ({
    ...splitFeature(feature),
    examples: [],
  }));
  const unmatchedExamples: string[] = [];
  const defaultFeature = command.notes
    ?.map((note) => note.match(/\bdefaults to ([A-Za-z0-9_-]+)/i)?.[1])
    .find(Boolean);

  for (const example of command.examples ?? []) {
    const args = exampleArguments(command, example);
    let bestIndex = -1;
    let bestScore = 0;
    features.forEach((feature, index) => {
      const score = featureMatchScore(feature.usage, args);
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });
    if (bestIndex === -1 && defaultFeature) {
      bestIndex = features.findIndex(
        (feature) => literalUsageTokens(feature.usage)[0] === defaultFeature,
      );
    }
    if (bestIndex >= 0) {
      const feature = features[bestIndex];
      if (!isRedundantFeatureExample(command, feature.usage, example)) {
        feature.examples.push(example);
      }
    } else if (!isRedundantStandaloneExample(command, example)) {
      unmatchedExamples.push(example);
    }
  }
  const primary = features.filter((feature) => !/^Alias for /i.test(feature.description));
  const retained = [];
  for (const feature of features.filter((item) => /^Alias for /i.test(item.description))) {
    const targetName = feature.description.replace(/^Alias for /i, '').trim();
    const target = primary.find((item) => item.usage.split(/\s+/)[0] === targetName);
    if (!target) { retained.push(feature); continue; }
    target.aliases = [...(target.aliases ?? []), feature.usage];
    target.examples.push(...feature.examples);
  }
  return { features: [...primary, ...retained], unmatchedExamples };
}

function meaningfulExamples(command: ShellCommand): string[] {
  const { features, unmatchedExamples } = buildFeatureDetails(command);
  return [...unmatchedExamples, ...features.flatMap((feature) => feature.examples)];
}

export function searchableText(command: ShellCommand): string {
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
    .join('\n')
    .toLowerCase();
}

export function matchingDetailSections(command: ShellCommand, query: string): string[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];
  const summary = [command.name, command.description, command.type, command.category, command.source]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (summary.includes(normalized)) return [];
  const fields: Array<[string, Array<string | undefined>]> = [
    ['Command', [command.command]],
    ['Usage', [command.usage]],
    ['Availability', [command.availability]],
    ['Dependencies', [command.dependencies]],
    ['Requirements', command.requires ?? []],
    ['Integrations', command.optional ?? []],
    ['Examples', meaningfulExamples(command)],
    ['Features', searchableFeatures(command)],
    ['Notes', command.notes ?? []],
  ];
  return fields
    .filter(([, values]) => values.some((value) => value?.toLowerCase().includes(normalized)))
    .map(([label]) => label);
}

export { splitExample };

export function matchesQuery(text: string, query: string): boolean {
  return query.trim().toLowerCase().split(/\s+/).every((token) => text.includes(token));
}

// Bounded optimal-string-alignment distance (an adjacent swap is one edit);
// returns limit + 1 once the bound is exceeded.
function editDistance(a: string, b: string, limit: number): number {
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMinimum = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) current[j] = Math.min(current[j], before[j - 2] + 1);
      rowMinimum = Math.min(rowMinimum, current[j]);
    }
    if (rowMinimum > limit) return limit + 1;
    before = previous;
    previous = current;
  }
  return previous[b.length];
}

/**
 * Suggest a corrected query when a search finds nothing: each word that
 * appears nowhere in `texts` is replaced by the closest corpus word (one edit
 * for 4–7 letters, two from 8). Returns the suggestion only if it matches.
 */
export function suggestQuery(query: string, texts: string[]): string | undefined {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const vocabulary = [...new Set(texts.flatMap((text) => text.match(/[a-z0-9]+(?:[-.][a-z0-9]+)*/g) ?? []))]
    .filter((word) => word.length >= 3)
    .sort();
  let changed = false;
  const corrected = tokens.map((token) => {
    if (texts.some((text) => text.includes(token))) return token;
    const limit = token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0;
    let best: string | undefined;
    let bestDistance = limit + 1;
    for (const word of vocabulary) {
      if (Math.abs(word.length - token.length) > limit) continue;
      const distance = editDistance(token, word, limit);
      if (distance < bestDistance) {
        best = word;
        bestDistance = distance;
      }
    }
    if (!best) return token;
    changed = true;
    return best;
  });
  const suggestion = corrected.join(' ');
  return changed && texts.some((text) => matchesQuery(text, suggestion)) ? suggestion : undefined;
}
