import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCommandCondition, parseShellWords, validateCommandSemantics } from './extract-semantics.mjs';

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
