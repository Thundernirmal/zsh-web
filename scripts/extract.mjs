import fs from 'fs';
import path from 'path';

const ZSH_DIR = path.join(process.env.HOME, '.config', 'zsh');
const DATA_DIR = path.join(process.cwd(), 'src', 'data');

function extractTips() {
  const content = fs.readFileSync(path.join(ZSH_DIR, '80-tips.zsh'), 'utf-8');
  const tipStrings = [];
  const regex = /"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!match[1].includes('$(( RANDOM % total + 1 ))')) {
      tipStrings.push(match[1]);
    }
  }

  // intelligent merge
  const tipsJsonPath = path.join(DATA_DIR, 'tips.json');
  let existingTips = [];
  if (fs.existsSync(tipsJsonPath)) {
    existingTips = JSON.parse(fs.readFileSync(tipsJsonPath, 'utf8'));
  }

  const newTips = tipStrings.map(text => {
    const existing = existingTips.find(t => t.text === text);
    return existing ? existing : { text, category: 'utility' };
  });

  fs.writeFileSync(tipsJsonPath, JSON.stringify(newTips, null, 2));
}

function extractAliases() {
  const content = fs.readFileSync(path.join(ZSH_DIR, '20-aliases.zsh'), 'utf-8');
  const aliases = [];
  const regex = /alias ([^=]+)='([^']+)'/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    aliases.push({ name: match[1], command: match[2], type: 'alias' });
  }
  return aliases;
}

function extractGlobals() {
  const content = fs.readFileSync(path.join(ZSH_DIR, '70-globals.zsh'), 'utf-8');
  const globals = [];
  const regex = /alias -g ([^=]+)='([^']+)'/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    globals.push({ name: match[1], command: match[2], type: 'global_alias' });
  }
  return globals;
}

function extractFunctions() {
  const content = fs.readFileSync(path.join(ZSH_DIR, '60-functions.zsh'), 'utf-8');
  const funcs = [];
  const lines = content.split('\n');
  let currentComment = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#')) {
      currentComment = line.replace(/^#\s*/, '');
    } else if (line.match(/^[a-zA-Z0-9_-]+\(\) \{/)) {
      const name = line.split('(')[0];
      funcs.push({ name, description: currentComment, type: 'function' });
      currentComment = '';
    } else if (line !== '') {
      currentComment = '';
    }
  }
  return funcs;
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  extractTips();
  
  const aliases = extractAliases();
  const globals = extractGlobals();
  const funcs = extractFunctions();
  
  const extractedCommands = [...aliases, ...globals, ...funcs];
  
  const cmdsJsonPath = path.join(DATA_DIR, 'commands.json');
  let existingCmds = [];
  if (fs.existsSync(cmdsJsonPath)) {
    existingCmds = JSON.parse(fs.readFileSync(cmdsJsonPath, 'utf8'));
  }

  const newCommands = extractedCommands.map(cmd => {
    const existing = existingCmds.find(c => c.name === cmd.name);
    if (existing) {
      return { ...existing, command: cmd.command || existing.command, type: cmd.type }; // Preserve extra rich metadata like description, category, tags
    }
    return cmd;
  });

  fs.writeFileSync(cmdsJsonPath, JSON.stringify(newCommands, null, 2));
}

main();