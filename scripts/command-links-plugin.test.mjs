import assert from 'node:assert/strict';
import test from 'node:test';

import { commandLinkTargets, resolveCommandLink } from '../src/lib/command-links-plugin.mjs';

const commands = [
  { id: 'command-upkg', name: 'upkg', type: 'function', command: 'upkg [command]' },
  { id: 'command-upkg-plan', name: 'upkg-plan', type: 'action', command: 'upkg plan [--only <list>]' },
  { id: 'command-ll', name: 'll', type: 'alias', command: 'lsd -l' },
  { id: 'command-cat', name: 'cat', type: 'alias', command: 'bat' },
  { id: 'command-item-a3d4a7', name: '..', type: 'alias', command: 'cd ..' },
  { id: 'command-g', name: 'G', type: 'global_alias', command: '| grep' },
];

test('guide command links cover functions, actions and distinctive aliases only', () => {
  const targets = commandLinkTargets(commands);
  assert.equal(resolveCommandLink('upkg', targets), '/commands/upkg/');
  assert.equal(resolveCommandLink(' upkg search ripgrep ', targets), '/commands/upkg/');
  assert.equal(resolveCommandLink('upkg plan --only apt', targets), '/commands/upkg-plan/');
  assert.equal(resolveCommandLink('ll', targets), '/commands/ll/');
  for (const text of ['cat', '..', 'G', '~/.config/zsh', 'upkgs', '']) {
    assert.equal(resolveCommandLink(text, targets), undefined, text);
  }
});
