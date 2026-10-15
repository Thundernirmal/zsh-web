import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCommandCondition, parseShellWords, tipExample, validateCommandSemantics } from './extract-semantics.mjs';

test('capability requirements preserve all/any semantics without shell expressions', () => {
  assert.equal(describeCommandCondition('if (( $+commands[pacman] && $+commands[checkupdates] && $+commands[fakeroot] )); then'), 'Available when pacman, checkupdates, and fakeroot are installed');
  assert.equal(describeCommandCondition('if (( $+commands[dnf] )); then'), 'Available when dnf is installed');
  assert.equal(describeCommandCondition('if (( $+commands[apt] || $+commands[dnf] )); then'), 'Available when apt or dnf is installed');
  assert.equal(describeCommandCondition('if (( ! $+commands[dnf] )); then'), undefined);
  assert.equal(describeCommandCondition('if (( $+commands[apt] && $+commands[dnf] || $+commands[npm] )); then'), undefined);
});

test('registry tokens preserve quoted syntax, empty values and literal hashes', () => {
  assert.deepEqual(parseShellWords(`register 'upkg-plan' "upkg plan [--only <list>]" '' 'echo # literal' # annotation`), ['register', 'upkg-plan', 'upkg plan [--only <list>]', '', 'echo # literal']);
  assert.throws(() => parseShellWords("register 'unfinished"), /Unterminated/);
});
test('semantic validation rejects the audited contradictory fzf floor', () => {
  assert.throws(() => validateCommandSemantics([{ name: 'fbr', availability: 'fzf 0.52.0+', dependencies: 'git and fzf 0.68.0+' }], '0.68.0'), /fbr availability/);
  assert.doesNotThrow(() => validateCommandSemantics([{ name: 'fbr', availability: 'fzf 0.68.0+', dependencies: 'git and fzf 0.68.0+' }], '0.68.0'));
});

test('tip examples capture the runnable command segment', () => {
  const npkg = { name: 'npkg', type: 'function' };
  assert.deepEqual(tipExample('Run npkg search ripgrep to search nixpkgs', npkg), { example: 'npkg search ripgrep', exampleCopyable: true });
  assert.deepEqual(tipExample('Run npkg remove with no arguments to select', npkg), { example: 'npkg remove', exampleCopyable: true });
  assert.deepEqual(tipExample('Use ztheme show custom to inspect; ztheme use custom applies', { name: 'ztheme', type: 'function' }),
    { example: 'ztheme show custom', exampleCopyable: true });
  assert.deepEqual(tipExample('Run bigfiles [path] [count] to rank files', { name: 'bigfiles', type: 'function' }), { example: 'bigfiles [path] [count]' });
  assert.deepEqual(tipExample('Use NE to hide stderr or NUL to hide all output', { name: 'NE', type: 'global_alias' }), { example: 'NE' });
  assert.equal(tipExample('Run npkgx search to fail', npkg), undefined);
  assert.equal(tipExample('Press Ctrl-R to search history', npkg), undefined);
  assert.equal(tipExample('Run npkg search', undefined), undefined);
});

test('tip examples stop before trailing prose connectives', () => {
  assert.deepEqual(tipExample('Run upkg upgrade --sudo --only=apt after resolving APT refresh errors', { name: 'upkg', type: 'function' }),
    { example: 'upkg upgrade --sudo --only=apt', exampleCopyable: true });
  assert.deepEqual(tipExample('Run zdoctor in an interactive shell for a full report', { name: 'zdoctor', type: 'function' }),
    { example: 'zdoctor', exampleCopyable: true });
});
