import type { ShellCommand } from '@/lib/shell-docs';

export type FeatureDetail = {
  usage: string;
  description: string;
  examples: string[];
};

export function commandId(command: ShellCommand): string {
  return `${command.type}:${command.name}`;
}

export function typeVariant(type: string): 'alias' | 'global' | 'function' | 'metadata' {
  if (type === 'alias') return 'alias';
  if (type === 'global_alias') return 'global';
  if (type === 'function') return 'function';
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
  const parts = feature.match(/^(.+?)\s{2,}(.+)$/);
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
  return { features, unmatchedExamples };
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
