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
