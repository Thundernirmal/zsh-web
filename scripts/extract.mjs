import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.ZSH_CONFIG_DIR && !process.env.HOME) {
  throw new Error('HOME is not set and ZSH_CONFIG_DIR is not configured. Set ZSH_CONFIG_DIR to your zsh config directory.');
}
const ZSH_DIR = process.env.ZSH_CONFIG_DIR
  ? path.resolve(process.env.ZSH_CONFIG_DIR)
  : path.join(process.env.HOME, '.config', 'zsh');
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(SCRIPT_DIR, '..', 'src', 'data');

const GUIDE_SOURCE = 'GUIDE.md';
const ALIASES_SOURCE = '20-aliases.zsh';
const FZF_SOURCE = '40-fzf.zsh';
const ZOXIDE_SOURCE = '30-zoxide.zsh';
// Loader files sourced eagerly by init.zsh; each delegates to a lazily loaded
// catalogue under lib/. The catalogues hold the real registrations/bodies.
const FUNCTIONS_LOADER_SOURCE = '60-functions.zsh';
const HELP_LOADER_SOURCE = '65-help.zsh';
const TIPS_LOADER_SOURCE = '80-tips.zsh';

const FUNCTIONS_SOURCE = 'lib/functions-catalogue.zsh';
const CGM_SOURCE = '62-cgm.zsh';
const HELP_SOURCE = 'lib/help-catalogue.zsh';
const GLOBALS_SOURCE = '70-globals.zsh';
const TIPS_SOURCE = 'lib/tips-catalogue.zsh';
const AUTOLOAD_FUNCTIONS_DIR = 'functions';
const FUNCTION_SOURCES = [FUNCTIONS_SOURCE, CGM_SOURCE, HELP_SOURCE, TIPS_SOURCE];
const SOURCE_FILES = [
  GUIDE_SOURCE,
  ALIASES_SOURCE,
  FZF_SOURCE,
  ZOXIDE_SOURCE,
  FUNCTIONS_LOADER_SOURCE,
  HELP_LOADER_SOURCE,
  TIPS_LOADER_SOURCE,
  ...FUNCTION_SOURCES,
  GLOBALS_SOURCE,
];
const CHECK_ONLY = process.argv.includes('--check');
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== '--check');

if (unknownArguments.length > 0) {
  throw new Error(`Unknown extractor argument${unknownArguments.length === 1 ? '' : 's'}: ${unknownArguments.join(', ')}`);
}

// Single authoritative floor for every fuzzy picker: 40-fzf.zsh hard-blocks
// older builds, so availability text must quote the same version it enforces.
function extractFzfMinVersion() {
  const source = readSource(FZF_SOURCE);
  const match = source.match(/typeset\s+-gr\s+_FZF_MIN_VERSION='([0-9]+\.[0-9]+\.[0-9]+)'/);

  if (!match) {
    throw new Error(`${FZF_SOURCE}: could not read the _FZF_MIN_VERSION declaration`);
  }

  return match[1];
}

const FZF_MIN_VERSION = extractFzfMinVersion();
const FZF_MIN_LABEL = `fzf ${FZF_MIN_VERSION}+`;

const HELP_CHECK_AVAILABILITY = {
  zoxide: 'Available when zoxide is installed',
  'zoxide-fzf': `Available when zoxide is installed and ${FZF_MIN_LABEL} is ready`,
  peek: 'Available when bat or cat is installed',
  disk: 'Available when GNU find and du are installed',
  'file-search': 'Available when fd, fdfind, or GNU find is installed',
  'text-search': 'Available when ripgrep or grep is installed',
  git: 'Available when git is installed',
  'git-fzf': `Available when git is installed and ${FZF_MIN_LABEL} is ready`,
  curl: 'Available when curl is installed',
  'process-fzf': `Available when ps is installed and ${FZF_MIN_LABEL} is ready`,
  'fan-profile': 'Available on a supported Linux laptop profile interface',
  ss: 'Available when ss is installed',
  'secret-tool': 'Available when secret-tool and a Secret Service provider are available',
  'package-manager': 'Available when at least one supported package manager is installed',
  nix: 'Available when nix is installed',
  grep: 'Available when grep is installed',
  less: 'Available when less is installed',
  wc: 'Available when wc is installed',
  head: 'Available when head is installed',
  tail: 'Available when tail is installed',
};

const FUNCTION_DOC_HELPERS = {
  upkg: '_upkg_usage',
  npkg: '_npkg_usage',
  cgm: '_cgm_usage',
  ztheme: '_ztheme_usage',
  zhelp: '_zsh_help_usage',
};

const TIP_CATEGORY_RULES = [
  { category: 'security', pattern: /\bcgm\b|credential|secret service/ },
  { category: 'pipe', pattern: /\bpipe\b|stderr|stdout|\bnul\b|\bne\b|wc -l/ },
  { category: 'globbing', pattern: /glob|glob_dots|numeric_glob_sort|extended_glob|\*\(d\)|dotfiles/ },
  { category: 'history', pattern: /\bhistory\b|hist_ignore_space|ctrl\+r/ },
  { category: 'nix', pattern: /\bnpkg\b|\bnix\b|\bnixpkgs\b/ },
  { category: 'packages', pattern: /\bupkg\b|package managers?|outdated packages|arch-family|aur updates?|flatpak|\bnpm\b/ },
  { category: 'network', pattern: /\bports\b|\bmyip\b|\bweather\b|\bheaders\b|https|http/ },
  { category: 'git', pattern: /\bgit(?:count)?\b|\bglog\b|\bgpr\b|\bgun\b|\bgcount\b|\bcroot\b|\bfbr\b|\bgs\b|\bgd\b|\bgaa?\b|\bgco\b|\bgb\b/ },
  { category: 'process', pattern: /\bfkill\b|process(?:es)?|sigterm|sigkill|send a signal/ },
  { category: 'fzf', pattern: /ctrl\+t|alt\+c|\bzi\b|fuzzy|selected file path/ },
  { category: 'navigation', pattern: /auto_cd|director(?:y|ies)|directory stack|pushd|popd|dirs -v|previous directory|\bcd\b|\bll\b|\blt\b|move up|go up|\bz\s+</ },
  { category: 'search', pattern: /\bff\b|\bft\b|todo|search (?:text|file contents)|find files?/ },
  { category: 'viewing', pattern: /\bpeek\b|preview a file|file preview/ },
  { category: 'shell', pattern: /\bzhelp\b|spell-correction|completion|case-insensitive|press tab|shell/ },
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function sourcePath(fileName) {
  return path.join(ZSH_DIR, fileName);
}

function readSource(fileName) {
  return fs.readFileSync(sourcePath(fileName), 'utf8');
}

function getMissingSourceFiles() {
  return SOURCE_FILES.filter((fileName) => !fs.existsSync(sourcePath(fileName)));
}

function ensureSourceFilesAvailable() {
  const missingFiles = getMissingSourceFiles();

  if (missingFiles.length === 0) {
    return;
  }

  const missingPaths = missingFiles.map((fileName) => sourcePath(fileName)).join(', ');
  throw new Error(`Zsh source files not found: ${missingPaths}`);
}

function serializeJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'item';
}

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function writeJson(filePath, contents) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, contents);
  fs.renameSync(tmpPath, filePath);
}

function isCurrentJson(filePath, contents) {
  return fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === contents;
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

function normalizeCategory(category) {
  return category.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseShellWords(line) {
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

function extractHelpCatalogue() {
  const records = [];

  for (const [index, rawLine] of readSource(HELP_SOURCE).split('\n').entries()) {
    const line = rawLine.trim();

    if (!line.startsWith('_zsh_help_register ')) {
      continue;
    }

    const words = parseShellWords(line);

    if (words.length !== 9) {
      throw new Error(`${HELP_SOURCE}:${index + 1}: expected 8 catalogue fields, found ${words.length - 1}`);
    }

    const [, name, category, summary, usage, example, dependencies, kind, check] = words;

    if (kind !== 'alias' && kind !== 'function') {
      throw new Error(`${HELP_SOURCE}:${index + 1}: unsupported command kind ${kind}`);
    }

    if (check !== 'none' && !HELP_CHECK_AVAILABILITY[check]) {
      throw new Error(`${HELP_SOURCE}:${index + 1}: unsupported availability check ${check}`);
    }

    records.push({
      name,
      category: normalizeCategory(category),
      description: summary,
      usage,
      example,
      dependencies,
      kind,
      check,
    });
  }

  if (records.length === 0) {
    throw new Error(`${HELP_SOURCE}: no _zsh_help_register records found`);
  }

  const uniqueRecords = dedupeBy(records, (record) => record.name);
  if (uniqueRecords.length !== records.length) {
    throw new Error(`${HELP_SOURCE}: duplicate command catalogue entries found`);
  }

  return records;
}

function validateGuideCoverage(catalogue) {
  const guide = readSource(GUIDE_SOURCE);
  const missing = catalogue
    .map((record) => record.name)
    .filter((name) => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return !new RegExp('`' + escapedName + '(?:`|\\s)').test(guide);
    });

  if (missing.length > 0) {
    throw new Error(`${GUIDE_SOURCE}: missing command documentation for ${missing.join(', ')}`);
  }
}

function cleanDocItem(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('--')) {
    return trimmed;
  }

  return trimmed.replace(/^(?:[-*]\s+|\d+\.\s+)/, '').trim();
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

    if (currentSection && sections.has(currentSection)) {
      sections.get(currentSection).push(cleanDocItem(text));
    }
  }

  return sections;
}

function conditionHasCommand(condition, command) {
  return condition.includes(`command -v ${command}`) || condition.includes(`$+commands[${command}]`);
}

function conditionHasFunction(condition, functionName) {
  return condition.includes(`$+functions[${functionName}]`);
}

function conditionHasFzfReadyState(condition) {
  return condition.includes('_FZF_STATE') && /==\s*ready/.test(condition);
}

function conditionRequiresFzf(condition) {
  return conditionHasCommand(condition, 'fzf') || conditionHasFzfReadyState(condition);
}

function packageManagersInCondition(condition) {
  return ['paru', 'pacman', 'apt', 'dnf', 'brew', 'flatpak', 'nix', 'npm']
    .filter((manager) => conditionHasCommand(condition, manager));
}

function isPackageManagerCondition(condition) {
  return packageManagersInCondition(condition).length > 1;
}

function formatList(values) {
  if (values.length < 2) {
    return values[0] ?? '';
  }

  return `${values.slice(0, -1).join(', ')}, or ${values.at(-1)}`;
}

function describeCondition(condition) {
  if (!condition) {
    return undefined;
  }

  if (condition.includes('/sys/firmware/acpi/platform_profile') || condition.includes('fan_boost_mode')) {
    return 'Available on a supported Linux laptop profile interface';
  }

  if (conditionHasFunction(condition, 'cgm')) {
    return 'Available when cgm is loaded through secret-tool';
  }

  if (isPackageManagerCondition(condition)) {
    const managers = packageManagersInCondition(condition);
    return `Available when ${formatList(managers)} is installed`;
  }

  if (conditionHasCommand(condition, 'nix') && conditionHasCommand(condition, 'jq') && conditionRequiresFzf(condition)) {
    return conditionHasFzfReadyState(condition)
      ? 'Available when nix and jq are installed and fzf is ready'
      : 'Available when nix, jq, and fzf are installed';
  }

  if (conditionHasCommand(condition, 'nix') && conditionHasCommand(condition, 'jq')) {
    return 'Available when nix and jq are installed';
  }

  if (conditionHasCommand(condition, 'nix')) {
    return 'Available when nix is installed';
  }

  if (conditionHasCommand(condition, 'zoxide') && conditionRequiresFzf(condition)) {
    return conditionHasFzfReadyState(condition)
      ? 'Available when zoxide is installed and fzf is ready'
      : 'Available when zoxide and fzf are installed';
  }

  if (conditionHasCommand(condition, 'zoxide')) {
    return 'Available when zoxide is installed';
  }

  if (conditionHasFzfReadyState(condition) && condition.includes('interactive')) {
    return 'Available when fzf is ready in an interactive shell';
  }

  if (conditionHasFzfReadyState(condition)) {
    return 'Available when fzf is ready';
  }

  if (conditionHasCommand(condition, 'fzf') && condition.includes('interactive')) {
    return 'Available when fzf is installed in an interactive shell';
  }

  const globalAliasMatch = condition.match(/\$\{\+\s*galiases\[([A-Za-z])\]\s*\}/);
  if (globalAliasMatch) {
    return `Available when the ${globalAliasMatch[1]} global alias is defined`;
  }

  if (condition.includes('alias lt')) {
    return 'Available when the lt alias is available';
  }

  // Fallback: avoid leaking raw shell syntax; keep human-readable and short
  const cleaned = condition
    .replace(/^if\s+/, '')
    .replace(/;?\s*then$/, '')
    .replace(/^\(\(|\)\)$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned ? `Requires: ${cleaned}` : 'Conditional';
}

function inferTipSource(condition, text) {
  const lowerText = text.toLowerCase();

  if (conditionHasFunction(condition, 'cgm') || lowerText.includes('cgm ')) return 'cgm';
  if (isPackageManagerCondition(condition) || lowerText.includes('upkg')) return 'upkg';
  if (conditionHasCommand(condition, 'nix') || lowerText.includes('npkg')) return 'npkg';
  if (conditionHasCommand(condition, 'zoxide')) return 'zoxide';
  if (conditionRequiresFzf(condition)) return 'fzf';
  if (condition.includes('alias lt')) return 'navigation';
  if (lowerText.includes('zhelp')) return 'help';
  if (/\b(?:g, l, or w|ne\b|nul\b)/.test(lowerText)) return 'globals';
  if (/\bgit(?:count)?\b|\bglog\b|\bgpr\b|\bgun\b|\bcroot\b/.test(lowerText)) return 'git';
  if (lowerText.includes('fanprofile')) return 'system';

  return 'core';
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

function inferFunctionDependencies(body) {
  const requires = [];
  const optional = [];
  const requiredRegexes = [
    /if\s+!\s+command -v ([A-Za-z0-9._+-]+)\b/g,
    /command -v ([A-Za-z0-9._+-]+)[^\n]*\|\|[^\n]*(?:required|return 1)/g,
  ];
  const optionalRegex = /(?:if|elif)\s+command -v ([A-Za-z0-9._+-]+)\b/g;
  const ignored = new Set(['command', 'git', 'curl', 'ss', 'find', 'grep', 'diff']);
  const lines = body.split('\n');
  const caseStack = [];
  const caseRanges = [];
  let offset = 0;

  for (const line of lines) {
    if (/^\s*case\b.*\bin\b/.test(line)) {
      caseStack.push(offset);
    } else if (/^\s*esac\b/.test(line)) {
      const start = caseStack.pop();
      if (start !== undefined) {
        caseRanges.push({ start, end: offset + line.length });
      }
    }
    offset += line.length + 1;
  }

  while (caseStack.length > 0) {
    const start = caseStack.pop();
    caseRanges.push({ start, end: body.length });
  }

  const isInsideCaseStatement = (index) =>
    caseRanges.some((range) => index >= range.start && index <= range.end);

  for (const regex of requiredRegexes) {
    let match = regex.exec(body);

    while (match) {
      const dependency = match[1];

      if (!ignored.has(dependency)) {
        if (isInsideCaseStatement(match.index)) {
          optional.push(dependency);
        } else {
          requires.push(dependency);
        }
      }
      match = regex.exec(body);
    }
  }

  let match = optionalRegex.exec(body);

  while (match) {
    const dependency = match[1];
    if (!ignored.has(dependency) && !requires.includes(dependency)) {
      optional.push(dependency);
    }
    match = optionalRegex.exec(body);
  }

  if (/\b_zsh_require_fzf\b/.test(body) && !requires.includes('fzf')) {
    requires.push('fzf');
  }

  return {
    requires: uniqueList(requires),
    optional: uniqueList(optional),
  };
}

function extractFunctionDefinitions(content) {
  const lines = content.split('\n');
  const definitions = [];
  const conditionStack = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      continue;
    }

    if (trimmed.startsWith('if ')) {
      conditionStack.push(trimmed);
      continue;
    }

    if (trimmed === 'fi') {
      conditionStack.pop();
      continue;
    }

    const match = trimmed.match(/^(?:function\s+)?([A-Za-z0-9_-]+)(?:\(\))?\s*\{(.*)$/);

    if (!match) {
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
      condition: conditionStack.at(-1) ?? '',
    });

    index = cursor - 1;
  }

  return definitions;
}

function extractFunctionDocumentation(name, definition, docIndex) {
  const helperName = FUNCTION_DOC_HELPERS[name];
  const helper = helperName ? docIndex.get(helperName) : undefined;
  const helperSections = helper ? parsePrintedSections(helper.body) : new Map();
  const inspectedBody = [definition.body, helper?.body].filter(Boolean).join('\n');
  const dependencies = inferFunctionDependencies(inspectedBody);
  const features = [
    ...(helperSections.get('commands') ?? []),
    ...(helperSections.get('options') ?? []),
  ];
  const notes = [
    ...(helperSections.get('flags') ?? []).map((entry) => `Flag: ${entry}`),
    ...(helperSections.get('supported manager ids') ?? []).map((entry) => `Manager: ${entry}`),
    ...(helperSections.get('notes') ?? []),
  ];

  if (name === 'gitcount') {
    notes.push('Alias gcount points to gitcount for compatibility');
  }

  return {
    examples: maybeList(helperSections.get('examples') ?? []),
    features: maybeList(features),
    notes: maybeList(notes),
    requires: maybeList(dependencies.requires),
    optional: maybeList(dependencies.optional),
    interactive: inspectedBody.includes('requires an interactive terminal') || undefined,
    // References to UI helpers describe rendering, not a selectable mode: the
    // command styles output in rich terminals and degrades to plain otherwise.
    terminalAdaptive:
      (inspectedBody.includes('_ui_plain_mode') || inspectedBody.includes('_ui_title_line')) ||
      undefined,
  };
}

function extractAliases() {
  const aliases = [];

  for (const rawLine of readSource(ALIASES_SOURCE).split('\n')) {
    const line = rawLine.trim();
    const match = line.match(/^alias(?:\s+--)?\s+([^=]+)=(['"])(.*)\2$/);

    if (!match) {
      continue;
    }

    aliases.push({
      name: match[1].trim(),
      command: match[3],
      type: 'alias',
      source: ALIASES_SOURCE,
    });
  }

  // Keep first definition when aliases are redefined conditionally (ls/ll/la fallback chain)
  return dedupeBy(aliases, (alias) => alias.name);
}

function extractGlobals() {
  const globals = [];

  for (const rawLine of readSource(GLOBALS_SOURCE).split('\n')) {
    const line = rawLine.trim();
    const match = line.match(/^alias\s+-g\s+([^=]+)=(['"])(.*)\2$/);

    if (!match) {
      continue;
    }

    globals.push({
      name: match[1].trim(),
      command: match[3],
      type: 'global_alias',
      source: GLOBALS_SOURCE,
    });
  }

  return dedupeBy(globals, (globalAlias) => globalAlias.name);
}

function extractFunctions() {
  const functions = [];

  for (const source of FUNCTION_SOURCES) {
    const content = readSource(source);
    const definitions = extractFunctionDefinitions(content);
    const docIndex = new Map(definitions.map((definition) => [definition.name, definition]));

    for (const definition of definitions) {
      if (definition.name.startsWith('_')) {
        continue;
      }

      functions.push({
        name: definition.name,
        type: 'function',
        source,
        docs: extractFunctionDocumentation(definition.name, definition, docIndex),
      });
    }
  }

  for (const name of extractAutoloadNames()) {
    const source = path.join(AUTOLOAD_FUNCTIONS_DIR, name);
    const filePath = sourcePath(source);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Autoloaded Zsh function not found: ${filePath}`);
    }

    if (name.startsWith('_')) {
      continue;
    }

    const definitions = extractFunctionDefinitions(readSource(source));
    const docIndex = new Map(definitions.map((definition) => [definition.name, definition]));
    const definition = docIndex.get(name);

    if (!definition) {
      throw new Error(`${source}: no function definition found for ${name}`);
    }

    functions.push({
      name,
      type: 'function',
      source,
      docs: extractFunctionDocumentation(name, definition, docIndex),
    });
  }

  return dedupeBy(functions, (command) => command.name);
}

function extractAutoloadNames() {
  const names = [];
  const declarationSources = [
    // Autoload declarations live in the eager loader files; catalogue bodies
    // may also declare their own helpers.
    FUNCTIONS_LOADER_SOURCE,
    ...FUNCTION_SOURCES,
  ];

  for (const source of declarationSources) {
    for (const rawLine of readSource(source).split('\n')) {
      const match = rawLine.match(/\bautoload\s+(.+)$/);

      if (!match) {
        continue;
      }

      names.push(...parseShellWords(match[1]).filter((word) => !word.startsWith('-')));
    }
  }

  return uniqueList(names);
}

function getImplementations() {
  const implementations = [
    ...extractAliases(),
    ...extractGlobals(),
    ...extractFunctions(),
    { name: 'z', type: 'function', source: ZOXIDE_SOURCE },
    { name: 'zi', type: 'function', source: ZOXIDE_SOURCE },
  ];
  const byName = new Map();

  for (const implementation of implementations) {
    if (byName.has(implementation.name)) {
      throw new Error(`Multiple implementations found for command ${implementation.name}`);
    }
    byName.set(implementation.name, implementation);
  }

  return byName;
}

function buildCommands(catalogue) {
  const implementations = getImplementations();
  const catalogueNames = new Set(catalogue.map((record) => record.name));
  const undocumented = [...implementations.keys()].filter((name) => !catalogueNames.has(name));

  if (undocumented.length > 0) {
    throw new Error(`${HELP_SOURCE}: missing catalogue entries for ${undocumented.join(', ')}`);
  }

  return catalogue.map((help) => {
    const implementation = implementations.get(help.name);

    if (!implementation) {
      throw new Error(`${HELP_SOURCE}: no implementation source found for ${help.name}`);
    }

    const implementationKind = implementation.type === 'global_alias' ? 'alias' : implementation.type;
    if (implementationKind !== help.kind) {
      throw new Error(
        `${HELP_SOURCE}: ${help.name} is registered as ${help.kind}, but ${implementation.source} defines ${implementationKind}`,
      );
    }

    const docs = implementation.docs ?? {};
    const examples = maybeList([...(docs.examples ?? []), help.example]);
    return {
      name: help.name,
      command: implementation.type === 'function' ? help.usage : implementation.command,
      usage: help.usage,
      description: help.description,
      type: implementation.type,
      category: help.category,
      source: implementation.source,
      availability: HELP_CHECK_AVAILABILITY[help.check],
      dependencies: help.dependencies === 'none' ? undefined : help.dependencies,
      examples,
      features: docs.features,
      notes: docs.notes,
      requires: docs.requires,
      optional: docs.optional,
      interactive: docs.interactive,
      terminalAdaptive: docs.terminalAdaptive,
    };
  });
}

// Availability and dependency strings quote the same shell floor; anything
// else reproduces the contradictory guidance this check exists to prevent.
function validateCommandSemantics(commands) {
  for (const command of commands) {
    for (const field of ['availability', 'dependencies']) {
      const value = command[field];
      if (!value) {
        continue;
      }

      const quotedFloors = value.match(/fzf\s+\d+\.\d+(?:\.\d+)?\+/g) ?? [];
      const mismatched = quotedFloors.filter((label) => label !== FZF_MIN_LABEL);
      if (mismatched.length > 0) {
        throw new Error(
          `${HELP_SOURCE}: ${command.name} ${field} quotes ${mismatched.join(', ')}; the authoritative floor is ${FZF_MIN_LABEL} from ${FZF_SOURCE}`,
        );
      }
    }
  }
}

function parseTipLiteral(text) {
  const words = parseShellWords(text.trim());
  return words.length === 1 ? words[0] : undefined;
}

// Base-pool tips sit outside every condition, so the pool alone cannot vouch
// for them. The catalogue phrases actions as "Run <command> …" or
// "Use <command> …"; when that exact token is a catalogue command, the tip's
// action needs what the command needs. Mentions elsewhere in the tip text
// (piped targets, alternatives) are deliberately ignored.
function referencedCommandAvailability(text, availabilityByName) {
  const action = text.match(/^(?:Run|Use)\s+(\S+)/);
  return action ? availabilityByName.get(action[1]) : undefined;
}

function extractTips(availabilityByName) {
  const tipRecords = [];
  let inTipPool = false;
  const conditionStack = [];

  const addTip = (text) => {
    const condition = conditionStack.join(' && ');
    // Conditional pools already gate their tips on real runtime checks; only
    // unconditional tips need the referenced command's requirements.
    const commandAvailability =
      conditionStack.length === 0 ? referencedCommandAvailability(text, availabilityByName) : undefined;

    tipRecords.push({
      text,
      category: inferTipCategory(text),
      source: inferTipSource(condition, text),
      availability: commandAvailability ?? describeCondition(condition) ?? 'Always available',
    });
  };

  for (const [index, rawLine] of readSource(TIPS_SOURCE).split('\n').entries()) {
    const raw = rawLine;
    const line = raw.trim();

    if (/^\s*if\b/.test(raw)) {
      conditionStack.push(line);
      continue;
    }
    if (/^\s*elif\b/.test(raw) && conditionStack.length > 0) {
      conditionStack[conditionStack.length - 1] = line;
      continue;
    }
    if (/^\s*else\b/.test(raw)) {
      continue;
    }
    if (/^\s*fi\b/.test(raw) || line.startsWith('fi')) {
      conditionStack.pop();
      continue;
    }

    const inlineTipMatch = line.match(/^_zsh_tip_pool\+?=\((.+)\)$/);
    if (inlineTipMatch) {
      const tip = parseTipLiteral(inlineTipMatch[1]);
      if (!tip) {
        throw new Error(`${TIPS_SOURCE}:${index + 1}: could not parse inline tip`);
      }
      addTip(tip);
      continue;
    }

    if (line === '_zsh_tip_pool=(' || line === '_zsh_tip_pool+=(') {
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

    if (!line || line.startsWith('#')) {
      continue;
    }

    const tip = parseTipLiteral(line);
    if (!tip) {
      throw new Error(`${TIPS_SOURCE}:${index + 1}: could not parse tip literal`);
    }
    addTip(tip);
  }

  if (tipRecords.length === 0) {
    throw new Error(`${TIPS_SOURCE}: no tips found`);
  }

  const uniqueTips = dedupeBy(tipRecords, (tip) => tip.text);
  if (uniqueTips.length !== tipRecords.length) {
    throw new Error(`${TIPS_SOURCE}: duplicate tips found`);
  }

  return tipRecords;
}

function main() {
  ensureSourceFilesAvailable();

  const catalogue = extractHelpCatalogue();
  validateGuideCoverage(catalogue);

  const commands = buildCommands(catalogue);
  validateCommandSemantics(commands);
  const availabilityByName = new Map(
    commands.filter((command) => command.availability).map((command) => [command.name, command.availability]),
  );
  const tips = extractTips(availabilityByName);
  // Stable IDs: commands by slug(name), tips by hash(text) — survives catalogue reorder
  const seenCommandIds = new Set();
  const contentCommands = [...commands]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((command) => {
      const base = slugify(command.name);
      const slug = base === 'item' ? `item-${hashString(command.name).slice(0, 6)}` : base;
      let id = `command-${slug}`;
      let suffix = 2;
      while (seenCommandIds.has(id)) {
        id = `command-${slug}-${suffix++}`;
      }
      seenCommandIds.add(id);
      return { id, ...command };
    });
  const seenTipIds = new Set();
  const contentTips = [...tips]
    .sort((a, b) => a.text.localeCompare(b.text))
    .map((tip) => {
      let id = `tip-${hashString(tip.text).slice(0, 8)}`;
      let suffix = 2;
      while (seenTipIds.has(id)) {
        id = `tip-${hashString(`${tip.text}:${suffix++}`).slice(0, 8)}`;
      }
      seenTipIds.add(id);
      return { id, ...tip };
    });

  const outputs = [
    { filePath: path.join(DATA_DIR, 'commands.json'), contents: serializeJson(contentCommands) },
    { filePath: path.join(DATA_DIR, 'tips.json'), contents: serializeJson(contentTips) },
  ];

  if (CHECK_ONLY) {
    const staleFiles = outputs
      .filter(({ filePath, contents }) => !isCurrentJson(filePath, contents))
      .map(({ filePath }) => path.relative(process.cwd(), filePath));

    if (staleFiles.length > 0) {
      throw new Error(`Generated data is stale: ${staleFiles.join(', ')}. Run npm run sync.`);
    }

    console.log(`[extract] Verified ${commands.length} commands and ${tips.length} tips against ${ZSH_DIR}.`);
    return;
  }

  ensureDataDir();
  for (const { filePath, contents } of outputs) {
    writeJson(filePath, contents);
  }

  console.log(`[extract] Synced ${commands.length} commands and ${tips.length} tips from ${ZSH_DIR}.`);
}

main();
