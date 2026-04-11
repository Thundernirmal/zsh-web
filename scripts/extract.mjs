import fs from 'fs';
import path from 'path';

const ZSH_DIR = path.join(process.env.HOME, '.config', 'zsh');
const DATA_DIR = path.join(process.cwd(), 'src', 'data');

function extractTips() {
  const content = fs.readFileSync(path.join(ZSH_DIR, '80-tips.zsh'), 'utf-8');
  const tips = [];
  const regex = /"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!match[1].includes('$(( RANDOM % total + 1 ))')) {
      tips.push(match[1]);
    }
  }
  fs.writeFileSync(path.join(DATA_DIR, 'tips.json'), JSON.stringify(tips, null, 2));
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
  
  const commands = [...aliases, ...globals, ...funcs];
  fs.writeFileSync(path.join(DATA_DIR, 'commands.json'), JSON.stringify(commands, null, 2));
}

main();