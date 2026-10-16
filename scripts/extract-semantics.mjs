export function describeCommandCondition(condition) {
  const expression = condition.trim()
    .replace(/^if\s+\(\(\s*/, '')
    .replace(/\s*\)\)\s*;?\s*then$/, '');
  if (!/^\$\+commands\[[\w.+-]+\](?:\s*(?:&&|\|\|)\s*\$\+commands\[[\w.+-]+\])*$/.test(expression)) return undefined;
  const names = [...expression.matchAll(/\$\+commands\[([\w.+-]+)\]/g)].map((match) => match[1]);
  const any = expression.includes('||');
  if (any && expression.includes('&&')) return undefined;
  const joined = names.length < 2 ? names[0]
    : names.length === 2 ? names.join(any ? ' or ' : ' and ')
      : `${names.slice(0, -1).join(', ')}, ${any ? 'or' : 'and'} ${names.at(-1)}`;
  return `Available when ${joined} ${any || names.length === 1 ? 'is' : 'are'} installed`;
}

export function parseShellWords(line) {
  const words = [];
  let current = '';
  let quote = null;
  let started = false;

  const pushCurrent = () => {
    if (!started) {
      return;
    }

    words.push(current);
    current = '';
    started = false;
  };

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (quote === "'") {
      if (char === "'") {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (quote === '"') {
      if (char === '"') {
        quote = null;
      } else if (char === '\\' && index + 1 < line.length) {
        index += 1;
        current += line[index];
      } else {
        current += char;
      }
      continue;
    }

    if (/\s/.test(char)) {
      pushCurrent();
      continue;
    }

    if (char === '#') {
      if (!started) {
        break;
      }
      current += char;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      started = true;
      continue;
    }

    if (char === '\\' && index + 1 < line.length) {
      index += 1;
      current += line[index];
      started = true;
      continue;
    }

    current += char;
    started = true;
  }

  if (quote) {
    throw new Error(`Unterminated ${quote} quote in: ${line}`);
  }

  pushCurrent();
  return words;
}

export function validateCommandSemantics(commands, fzfMinimum) {
  for (const command of commands) {
    for (const field of ['availability', 'dependencies']) {
      const value = command[field];
      if (!value) {
        continue;
      }

      const quotedFloors = value.match(/fzf\s+\d+\.\d+(?:\.\d+)?\+/g) ?? [];
      const mismatched = quotedFloors.filter((label) => label !== `fzf ${fzfMinimum}+`);
      if (mismatched.length > 0) {
        throw new Error(
          `${command.name} ${field} quotes ${mismatched.join(', ')}; the authoritative floor is fzf ${fzfMinimum}+`,
        );
      }
    }
  }
}

// Required positional arguments in a usage line: top-level <placeholders>
// outside any [optional] group.
function requiredArguments(usage) {
  let depth = 0;
  let count = 0;
  for (const [token] of usage.matchAll(/\[|\]|<[^>]+>/g)) {
    if (token === '[') depth += 1;
    else if (token === ']') depth -= 1;
    else if (depth === 0) count += 1;
  }
  return count;
}

// Whether a tip's example can run as written. It must supply every required
// argument of the command's usage (and, for a subcommand, of that feature's
// usage), and must not spell a placeholder in capitals (`DIR` for `<dir>`).
// Values of options that take an argument (`--destination <dir>`) are not
// positional; everything after `--` is.
function isCompleteInvocation(example, command) {
  const usage = command.type === 'alias' ? (command.usage ?? '') : (command.command ?? command.usage ?? '');
  const featureUsages = (command.features ?? []).map((feature) => feature.split(/\s{2,}/)[0]);
  const syntax = [usage, ...featureUsages, ...(command.notes ?? [])].join('\n');
  const placeholders = new Set([...syntax.matchAll(/<([^<>]+)>|\[([^[\]<>]+)\]/g)]
    .flatMap((match) => (match[1] ?? match[2]).split(/[|\s]+/))
    .map((word) => word.replace(/\.{3}$/, '').toLowerCase())
    .filter((word) => /^[a-z][a-z0-9_-]*$/.test(word)));
  const valueOptions = new Set([...syntax.matchAll(/(?:^|[\s[])(--?[A-Za-z][\w-]*)\s+<[^>]+>/gm)].map((match) => match[1]));
  const words = example.split(/\s+/).slice(1);
  const positionals = [];
  let optionsEnded = false;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (/^[A-Z][A-Z0-9_]*$/.test(word) && placeholders.has(word.toLowerCase())) return false;
    if (optionsEnded || !word.startsWith('-') || word === '-') positionals.push(word);
    else if (word === '--') optionsEnded = true;
    else if (valueOptions.has(word)) {
      const value = words[++index];
      if (value === undefined || (/^[A-Z][A-Z0-9_]*$/.test(value) && placeholders.has(value.toLowerCase()))) return false;
    }
  }
  let required = requiredArguments(usage);
  const subcommand = positionals[0] && featureUsages.find((feature) => feature.split(/\s+/)[0] === positionals[0]);
  if (subcommand) required = Math.max(required, 1 + requiredArguments(subcommand.split(/\s+/).slice(1).join(' ')));
  return positionals.length >= required;
}

// The runnable part of a "Run …"/"Use …" tip: the words after the verb up to
// the first connective or semicolon, which must begin with the tip's command.
// Copy is offered only for complete, concrete invocations: no
// <placeholder>/[optional] syntax, no global aliases (which only work after
// another command), and every required argument supplied.
export function tipExample(text, command) {
  if (!command) return undefined;
  const segment = text.match(/^(?:Run|Use)\s+(.+?)(?:\s+(?:to|for|before|after|with|when|while|in|if|until|instead|or|and|then)\b|;|$)/)?.[1]?.trim();
  if (!segment || (segment !== command.name && !segment.startsWith(`${command.name} `))) return undefined;
  const copyable = command.type !== 'global_alias' && !/[<[]/.test(segment) && isCompleteInvocation(segment, command);
  return { example: segment, ...(copyable ? { exampleCopyable: true } : {}) };
}
