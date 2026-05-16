import fs from 'fs';
import path from 'path';

const ZSH_DIR = path.join(process.env.HOME, '.config', 'zsh');
const DATA_DIR = path.join(process.cwd(), 'src', 'data');

const TIPS_SOURCE = '80-tips.zsh';
const ALIASES_SOURCE = '20-aliases.zsh';
const GLOBALS_SOURCE = '70-globals.zsh';
const FUNCTIONS_SOURCE = '60-functions.zsh';
const SOURCE_FILES = [ALIASES_SOURCE, FUNCTIONS_SOURCE, GLOBALS_SOURCE, TIPS_SOURCE];
const REQUIRE_SOURCES = process.argv.includes('--required');

const KNOWN_ALIAS_METADATA = {
  ls: {
    category: 'navigation',
    description: 'List directory contents with icons and colors',
  },
  ll: {
    category: 'navigation',
    description: 'Long listing with hidden files and grouped directories',
  },
  la: {
    category: 'navigation',
    description: 'List all files including hidden ones',
  },
  lt: {
    category: 'navigation',
    description: 'Tree view up to 3 levels deep with grouped directories',
  },
  '..': {
    category: 'navigation',
    description: 'Go up one directory level',
  },
  '...': {
    category: 'navigation',
    description: 'Go up two directory levels',
  },
  '....': {
    category: 'navigation',
    description: 'Go up three directory levels',
  },
  '-': {
    category: 'navigation',
    description: 'Return to the previous directory',
  },
  mkdir: {
    category: 'safety',
    description: 'Create directories including parent paths automatically',
  },
  cp: {
    category: 'safety',
    description: 'Copy files with interactive confirmation and verbose output',
  },
  mv: {
    category: 'safety',
    description: 'Move files with interactive confirmation and verbose output',
  },
  rm: {
    category: 'safety',
    description: 'Remove files with interactive confirmation and verbose output',
  },
  cat: {
    category: 'viewing',
    description: 'Display file contents with syntax highlighting and line numbers',
  },
  grep: {
    category: 'viewing',
    description: 'Search text with colorized output',
  },
  diff: {
    category: 'viewing',
    description: 'Compare files with colorized output',
  },
  ports: {
    category: 'network',
    description: 'Show all listening ports and their processes',
  },
  myip: {
    category: 'network',
    description: 'Display your public IP address',
  },
  weather: {
    category: 'network',
    description: 'Show the current weather forecast',
  },
  glog: {
    category: 'git',
    description: 'Show a compact git history graph',
  },
  gpr: {
    category: 'git',
    description: 'Pull with rebase for a cleaner git history',
  },
  gun: {
    category: 'git',
    description: 'Undo the last commit while keeping changes staged',
  },
  gcount: {
    category: 'git',
    description: 'Count commits per author',
  },
};

const KNOWN_GLOBAL_METADATA = {
  G: {
    category: 'pipe',
    description: 'Pipe to grep — use anywhere in a command',
  },
  L: {
    category: 'pipe',
    description: 'Pipe to less — use anywhere in a command',
  },
  W: {
    category: 'pipe',
    description: 'Count lines — use anywhere in a command',
  },
  H: {
    category: 'pipe',
    description: 'Show first lines — use anywhere in a command',
  },
  T: {
    category: 'pipe',
    description: 'Show last lines — use anywhere in a command',
  },
  NE: {
    category: 'pipe',
    description: 'Suppress stderr output',
  },
  NUL: {
    category: 'pipe',
    description: 'Suppress all output (stdout and stderr)',
  },
};

const KNOWN_FUNCTION_METADATA = {
  extract: {
    category: 'utility',
    command: 'extract <archive>',
    description: 'Extract any supported archive format automatically',
  },
  mkcd: {
    category: 'navigation',
    command: 'mkcd <dir>',
    description: 'Create a directory and cd into it in one step',
  },
  ff: {
    category: 'search',
    command: 'ff <pattern> [path]',
    description: 'Find files by name recursively — uses fd when available',
  },
  ft: {
    category: 'search',
    command: 'ft <text> [path]',
    description: 'Find text in files — uses ripgrep when available, falls back to grep',
  },
  fkill: {
    category: 'process',
    command: 'fkill [signal]',
    description: 'Fuzzy-select and kill a running process',
  },
  headers: {
    category: 'network',
    command: 'headers <url>',
    description: 'Follow redirects and print HTTP response headers',
  },
  peek: {
    category: 'viewing',
    command: 'peek <file>',
    description: 'Preview a file quickly — uses bat when available',
  },
  dusage: {
    category: 'utility',
    command: 'dusage [path] [count]',
    description: 'Show disk usage summary for the largest items in a directory',
  },
  bigfiles: {
    category: 'utility',
    command: 'bigfiles [path] [count]',
    description: 'Find the largest files recursively in a directory tree',
  },
  fanprofile: {
    category: 'utility',
    command: 'fanprofile',
    description: 'Show the current laptop performance profile',
  },
  croot: {
    category: 'git',
    command: 'croot',
    description: 'Jump to the root of the current git repository',
  },
  path: {
    category: 'utility',
    command: 'path',
    description: 'Print each PATH entry on its own line',
  },
  fbr: {
    category: 'git',
    command: 'fbr',
    description: 'Fuzzy-pick and checkout a git branch from local or remote refs',
  },
  gitcount: {
    category: 'git',
    command: 'gitcount',
    description: 'Show contributor counts for the current repo history',
  },
  ports: {
    category: 'network',
    command: 'ports',
    description: 'Show listening ports and owning processes',
  },
  myip: {
    category: 'network',
    command: 'myip',
    description: 'Show public IP address over HTTPS',
  },
  npkg: {
    category: 'nix',
    command: 'npkg <subcommand>',
    description: 'Nix package manager wrapper — add, remove, find, search, upgrade, and more',
  },
  upkg: {
    category: 'packages',
    command: 'upkg [command]',
    description: 'Unified package update/check wrapper across supported managers',
  },
};

const TIP_CATEGORY_RULES = [
  { category: 'pipe', pattern: /global alias|pipes|stderr|stdout|\/dev\/null/ },
  { category: 'globbing', pattern: /glob|glob_dots|numeric_glob_sort|extended_glob|dotfiles/ },
  { category: 'history', pattern: /\bhistory\b|hist_ignore_space|ctrl\+r history/ },
  { category: 'fzf', pattern: /zoxide|ctrl\+r|ctrl\+t|alt\+c|interactive zoxide|fuzzy search your command history/ },
  { category: 'nix', pattern: /\bnpkg\b|\bnix\b|\bnixpkgs\b/ },
  { category: 'packages', pattern: /\bupkg\b|package managers|outdated packages|arch-family|aur updates?|flatpak|\bnpm\b/ },
  { category: 'network', pattern: /\bports\b|\bmyip\b|\bweather\b|\bheaders\b|https|http/ },
  { category: 'git', pattern: /\bgit\b|\bglog\b|\bgpr\b|\bgun\b|\bgcount\b|\bcroot\b|\bfbr\b|\bgs\b|\bgd\b|\bgaa?\b|\bgco\b|\bgb\b/ },
  { category: 'navigation', pattern: /auto_cd|directory|pushd|popd|dirs -v|previous directory|\bcd\b|\bll\b|\blt\b|go up/ },
  { category: 'search', pattern: /\bff\b|\bft\b|\bfkill\b|todo|search text|find files/ },
  { category: 'shell', pattern: /spell-correction|completion|case-insensitive|shell/ },
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function sourcePath(fileName) {
  return path.join(ZSH_DIR, fileName);
}

function getMissingSourceFiles() {
  return SOURCE_FILES.filter((fileName) => !fs.existsSync(sourcePath(fileName)));
}

function ensureSourceFilesAvailable() {
  const missingFiles = getMissingSourceFiles();

  if (missingFiles.length === 0) {
    return true;
  }

  const missingPaths = missingFiles.map((fileName) => sourcePath(fileName)).join(', ');
  const message = `Zsh source files not found: ${missingPaths}`;

  if (REQUIRE_SOURCES) {
    throw new Error(message);
  }

  console.warn(`[extract] ${message}. Using committed src/data/*.json as-is.`);
  return false;
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function dedupeBy(records, getKey) {
  const seen = new Set();

  return records.filter((record) => {
    const key = getKey(record);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toSentenceCase(text) {
  if (!text) {
    return '';
  }

  const trimmed = text.trim().replace(/\.$/, '');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function trimList(values) {
  return values.filter(Boolean).map((value) => value.trim()).filter(Boolean);
}

function uniqueList(values) {
  return Array.from(new Set(trimList(values)));
}

function maybeList(values) {
  const items = uniqueList(values);
  return items.length > 0 ? items : undefined;
}

function cleanDocItem(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('--')) {
    return trimmed;
  }

  return trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
}

function parsePrintedSections(body) {
  const sections = new Map();
  let currentSection = null;

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    const match = line.match(/^print\s+(['"])(.*)\1$/);

    if (!match) {
      continue;
    }

    const text = match[2];

    if (!text.trim()) {
      currentSection = null;
      continue;
    }

    if (/^[A-Z][A-Za-z /-]+:$/.test(text)) {
      currentSection = text.slice(0, -1).toLowerCase();
      if (!sections.has(currentSection)) {
        sections.set(currentSection, []);
      }
      continue;
    }

    if (!currentSection || !sections.has(currentSection)) {
      continue;
    }

    sections.get(currentSection).push(cleanDocItem(text));
  }

  return sections;
}

function extractUsageLine(body) {
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    const match = line.match(/^(?:echo|print(?:\s+-u\d+)?(?:\s+-r\s+--)?|print)\s+(['"])Usage:\s*(.+?)\1$/);

    if (match) {
      return match[2].trim();
    }
  }

  return undefined;
}

function describeCondition(condition) {
  if (!condition) {
    return undefined;
  }

  if (isPackageManagerCondition(condition)) {
    return 'Available when at least one supported package manager is installed';
  }

  if (condition.includes('command -v nix') && condition.includes('command -v jq') && condition.includes('command -v fzf')) {
    return 'Available when nix, jq, and fzf are installed';
  }

  if (condition.includes('command -v nix') && condition.includes('command -v jq')) {
    return 'Available when nix and jq are installed';
  }

  if (condition.includes('command -v nix')) {
    return 'Available when nix is installed';
  }

  if (condition.includes('command -v zoxide')) {
    return 'Available when zoxide is installed';
  }

  if (condition.includes('command -v fzf') && condition.includes('interactive')) {
    return 'Available when fzf is installed in an interactive shell';
  }

  if (condition.includes('alias gs') && condition.includes('alias gco')) {
    return 'Available when the OMZ git plugin aliases are loaded';
  }

  if (condition.includes('alias lt')) {
    return 'Available when the lt alias is available';
  }

  return toSentenceCase(condition.replace(/^if\s+/, '').replace(/;?\s*then$/, ''));
}

function isPackageManagerCondition(condition) {
  return condition.includes('command -v paru') ||
    condition.includes('command -v pacman') ||
    condition.includes('command -v apt') ||
    condition.includes('command -v dnf') ||
    condition.includes('command -v brew') ||
    condition.includes('command -v flatpak') ||
    condition.includes('command -v npm');
}

function inferTipSource(condition, text) {
  const lowerText = text.toLowerCase();

  if (!condition) {
    if (lowerText.includes('git')) return 'git';
    if (lowerText.includes('global alias')) return 'globals';
    return 'core';
  }

  if (condition.includes('command -v zoxide')) return 'zoxide';
  if (condition.includes('command -v fzf') && condition.includes('interactive')) return 'fzf';
  if (isPackageManagerCondition(condition)) return 'upkg';
  if (condition.includes('command -v nix')) return 'npkg';
  if (condition.includes('alias gs') && condition.includes('alias gco')) return 'git-plugin';
  if (condition.includes('alias lt')) return 'navigation';

  return 'core';
}

function inferFunctionRequirements(body) {
  const dependencies = [];
  const regex = /command -v ([A-Za-z0-9._+-]+)/g;
  const ignored = new Set(['command', 'git', 'curl', 'ss', 'find', 'grep', 'diff']);
  let match = regex.exec(body);

  while (match) {
    const dependency = match[1];
    if (!ignored.has(dependency)) {
      dependencies.push(dependency);
    }
    match = regex.exec(body);
  }

  return uniqueList(dependencies);
}

function extractFunctionDefinitions(content) {
  const lines = content.split('\n');
  const definitions = [];
  const conditionStack = [];
  let pendingComments = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      pendingComments.push(trimmed.replace(/^#\s*/, ''));
      continue;
    }

    if (trimmed.startsWith('if ')) {
      conditionStack.push(trimmed);
      continue;
    }

    if (trimmed === 'fi') {
      conditionStack.pop();
      pendingComments = [];
      continue;
    }

    const match = trimmed.match(/^(?:function\s+)?([A-Za-z0-9_-]+)(?:\(\))?\s*\{(.*)$/);

    if (!match) {
      if (trimmed !== '') {
        pendingComments = [];
      }
      continue;
    }

    const name = match[1];
    const inlineBody = match[2].trim();
    let depth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
    const bodyLines = [];
    let cursor = index + 1;

    if (inlineBody) {
      const body = inlineBody.endsWith('}') ? inlineBody.slice(0, -1).trim() : inlineBody;
      if (body) {
        bodyLines.push(body);
      }
    }

    while (cursor < lines.length && depth > 0) {
      const bodyLine = lines[cursor];
      depth += (bodyLine.match(/\{/g) ?? []).length - (bodyLine.match(/\}/g) ?? []).length;

      if (depth > 0) {
        bodyLines.push(bodyLine);
      }

      cursor += 1;
    }

    definitions.push({
      name,
      body: bodyLines.join('\n'),
      comment: pendingComments.join(' '),
      condition: conditionStack[conditionStack.length - 1] ?? '',
    });

    pendingComments = [];
    index = cursor - 1;
  }

  return definitions;
}

function buildFunctionDocIndex(content) {
  return new Map(extractFunctionDefinitions(content).map((definition) => [definition.name, definition]));
}

function extractFunctionDocumentation(name, definition, docIndex) {
  const metadata = KNOWN_FUNCTION_METADATA[name] ?? {};
  const docs = {
    usage: extractUsageLine(definition.body) ?? metadata.command,
    availability: describeCondition(definition.condition),
    examples: [],
    features: [],
    notes: [],
    requires: inferFunctionRequirements(definition.body),
    interactive: definition.body.includes('requires an interactive terminal'),
    plainMode: definition.body.includes('_ui_plain_mode'),
    richOutput: definition.body.includes('_ui_title_line'),
  };

  const helperName = name === 'upkg' ? '_upkg_usage' : name === 'npkg' ? '_npkg_usage' : null;

  if (helperName && docIndex.has(helperName)) {
    const helperSections = parsePrintedSections(docIndex.get(helperName).body);
    docs.usage = extractUsageLine(docIndex.get(helperName).body) ?? docs.usage;
    docs.features = helperSections.get('commands') ?? [];
    docs.examples = helperSections.get('examples') ?? [];
    docs.notes = [
      ...(helperSections.get('flags') ?? []).map((entry) => `Flag: ${entry}`),
      ...(helperSections.get('supported manager ids') ?? []).map((entry) => `Manager: ${entry}`),
      ...(helperSections.get('notes') ?? []),
    ];
  }

  if (name === 'gitcount') {
    docs.notes.push('Alias gcount points to gitcount for compatibility');
  }

  return {
    usage: docs.usage,
    availability: docs.availability,
    examples: maybeList(docs.examples),
    features: maybeList(docs.features),
    notes: maybeList(docs.notes),
    requires: maybeList(docs.requires),
    interactive: docs.interactive || undefined,
    plainMode: docs.plainMode || undefined,
    richOutput: docs.richOutput || undefined,
  };
}

function inferTipCategory(text) {
  const lower = text.toLowerCase();

  for (const rule of TIP_CATEGORY_RULES) {
    if (rule.pattern.test(lower)) {
      return rule.category;
    }
  }

  return 'utility';
}

function inferAliasCategory(name, command, section) {
  if (KNOWN_ALIAS_METADATA[name]) {
    return KNOWN_ALIAS_METADATA[name].category;
  }

  const lower = `${section} ${name} ${command}`.toLowerCase();

  if (lower.includes('git')) return 'git';
  if (lower.includes('network')) return 'network';
  if (lower.includes('view')) return 'viewing';
  if (lower.includes('safety')) return 'safety';
  if (lower.includes('navigation') || lower.startsWith('shared aliases') || command.startsWith('cd ')) return 'navigation';

  return 'utility';
}

function describeAlias(name, command, section) {
  if (KNOWN_ALIAS_METADATA[name]) {
    return KNOWN_ALIAS_METADATA[name].description;
  }

  const category = inferAliasCategory(name, command, section);

  if (category === 'git') return `Git shortcut for ${command}`;
  if (category === 'network') return `Network shortcut for ${command}`;
  if (category === 'viewing') return `Viewing shortcut for ${command}`;
  if (category === 'safety') return `Safer shortcut for ${command}`;
  if (category === 'navigation') return `Navigation shortcut for ${command}`;

  return `Alias for ${command}`;
}

function describeGlobalAlias(name, command) {
  if (KNOWN_GLOBAL_METADATA[name]) {
    return KNOWN_GLOBAL_METADATA[name].description;
  }

  if (command.startsWith('| ')) {
    return `Pipe to ${command.slice(2)} — use anywhere in a command`;
  }

  if (command.includes('/dev/null') && command.includes('2>&1')) {
    return 'Suppress all output (stdout and stderr)';
  }

  if (command.includes('2>/dev/null')) {
    return 'Suppress stderr output';
  }

  return `Global alias for ${command}`;
}

function inferFunctionCategory(name, comment) {
  if (KNOWN_FUNCTION_METADATA[name]) {
    return KNOWN_FUNCTION_METADATA[name].category;
  }

  const lower = `${name} ${comment}`.toLowerCase();

  if (lower.includes('nix')) return 'nix';
  if (lower.includes('git')) return 'git';
  if (lower.includes('http') || lower.includes('url') || lower.includes('network') || lower.includes('port') || lower.includes('ip')) return 'network';
  if (lower.includes('kill') || lower.includes('process')) return 'process';
  if (lower.includes('preview') || lower.includes('view') || lower.includes('file')) return 'viewing';
  if (lower.includes('search') || lower.includes('find') || lower.includes('grep')) return 'search';
  if (lower.includes('directory') || lower.includes('cd') || lower.includes('path') || lower.includes('navigation')) return 'navigation';

  return 'utility';
}

function describeFunction(name, comment) {
  if (KNOWN_FUNCTION_METADATA[name]) {
    return KNOWN_FUNCTION_METADATA[name].description;
  }

  if (comment) {
    return toSentenceCase(comment);
  }

  return `Custom function ${name}`;
}

function inferFunctionCommand(name) {
  return KNOWN_FUNCTION_METADATA[name]?.command ?? name;
}

function mergeTips(existingTips, extractedTips) {
  const existingByText = new Map(existingTips.map((tip) => [tip.text, tip]));
  const extractedByText = new Map(extractedTips.map((tip) => [tip.text, tip]));
  const mergedTips = [];

  for (const existing of existingTips) {
    const extracted = extractedByText.get(existing.text);

    if (!extracted) {
      continue;
    }

    mergedTips.push({
      ...existing,
      ...extracted,
      category: extracted.category ?? existing.category,
    });
  }

  for (const tip of extractedTips) {
    if (!existingByText.has(tip.text)) {
      mergedTips.push(tip);
    }
  }

  return mergedTips;
}

function mergeCommands(existingCommands, extractedCommands) {
  const existingByName = new Map(existingCommands.map((command) => [command.name, command]));
  const extractedByName = new Map(extractedCommands.map((command) => [command.name, command]));
  const mergedCommands = [];

  for (const existing of existingCommands) {
    const extracted = extractedByName.get(existing.name);

    if (!extracted) {
      continue;
    }

    mergedCommands.push({
      ...existing,
      ...extracted,
      command: extracted.command ?? existing.command,
      description: extracted.description ?? existing.description,
      category: extracted.category ?? existing.category,
      source: extracted.source,
      type: extracted.type,
    });
  }

  for (const command of extractedCommands) {
    if (!existingByName.has(command.name)) {
      mergedCommands.push(command);
    }
  }

  return mergedCommands;
}

function extractTips() {
  const content = fs.readFileSync(sourcePath(TIPS_SOURCE), 'utf-8');
  const tipRecords = [];
  let inTipPool = false;
  const conditionStack = [];

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    if (line.startsWith('if ')) {
      conditionStack.push(line);
      continue;
    }

    if (line === 'fi') {
      conditionStack.pop();
      continue;
    }

    if (line.startsWith('_zsh_tip_pool=(') || line.startsWith('_zsh_tip_pool+=(')) {
      inTipPool = true;
      continue;
    }

    if (inTipPool && line === ')') {
      inTipPool = false;
      continue;
    }

    if (!inTipPool) {
      continue;
    }

    const match = line.match(/^"(.+)"$/);
    if (match) {
      const text = match[1];
      const condition = conditionStack[conditionStack.length - 1] ?? '';

      tipRecords.push({
        text,
        category: inferTipCategory(text),
        source: inferTipSource(condition, text),
        availability: describeCondition(condition) ?? 'Always available',
      });
    }
  }

  const extractedTips = dedupeBy(
    tipRecords,
    (tip) => tip.text,
  );

  const tipsJsonPath = path.join(DATA_DIR, 'tips.json');
  const existingTips = readJsonArray(tipsJsonPath);
  const mergedTips = mergeTips(existingTips, extractedTips);

  writeJson(tipsJsonPath, mergedTips);
}

function extractAliases() {
  const content = fs.readFileSync(sourcePath(ALIASES_SOURCE), 'utf-8');
  const aliases = [];
  let currentSection = '';

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    if (line.startsWith('#')) {
      currentSection = line.replace(/^#\s*/, '');
      continue;
    }

    const match = line.match(/^alias(?:\s+--)?\s+([^=]+)='([^']+)'$/);
    if (!match) {
      continue;
    }

    const name = match[1].trim();
    const command = match[2];

    aliases.push({
      name,
      command,
      description: describeAlias(name, command, currentSection),
      type: 'alias',
      category: inferAliasCategory(name, command, currentSection),
      source: ALIASES_SOURCE,
    });
  }

  return dedupeBy(aliases, (alias) => alias.name);
}

function extractGlobals() {
  const content = fs.readFileSync(sourcePath(GLOBALS_SOURCE), 'utf-8');
  const globals = [];

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    const match = line.match(/^alias -g ([^=]+)='([^']+)'$/);

    if (!match) {
      continue;
    }

    const name = match[1].trim();
    const command = match[2];

    globals.push({
      name,
      command,
      description: describeGlobalAlias(name, command),
      type: 'global_alias',
      category: KNOWN_GLOBAL_METADATA[name]?.category ?? 'pipe',
      source: GLOBALS_SOURCE,
    });
  }

  return dedupeBy(globals, (globalAlias) => globalAlias.name);
}

function extractFunctions() {
  const content = fs.readFileSync(sourcePath(FUNCTIONS_SOURCE), 'utf-8');
  const docIndex = buildFunctionDocIndex(content);
  const funcs = [];
  const definitions = extractFunctionDefinitions(content);

  for (const definition of definitions) {
    const { name, comment } = definition;

    if (name.startsWith('_')) {
      continue;
    }

    funcs.push({
      name,
      command: inferFunctionCommand(name),
      description: describeFunction(name, comment),
      type: 'function',
      category: inferFunctionCategory(name, comment),
      source: FUNCTIONS_SOURCE,
      ...extractFunctionDocumentation(name, definition, docIndex),
    });
  }

  return dedupeBy(funcs, (func) => func.name);
}

function main() {
  ensureDataDir();

  if (!ensureSourceFilesAvailable()) {
    return;
  }

  extractTips();

  const extractedCommands = [
    ...extractAliases(),
    ...extractGlobals(),
    ...extractFunctions(),
  ];

  const commandsJsonPath = path.join(DATA_DIR, 'commands.json');
  const existingCommands = readJsonArray(commandsJsonPath);
  const mergedCommands = mergeCommands(existingCommands, extractedCommands);

  writeJson(commandsJsonPath, mergedCommands);
}

main();
