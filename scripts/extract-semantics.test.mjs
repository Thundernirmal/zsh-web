import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseShellWords, validateCommandSemantics } from './extract-semantics.mjs';

test('registry tokens preserve quoted syntax, empty values and literal hashes', () => {
  assert.deepEqual(parseShellWords(`register 'upkg-plan' "upkg plan [--only <list>]" '' 'echo # literal' # annotation`), ['register', 'upkg-plan', 'upkg plan [--only <list>]', '', 'echo # literal']);
  assert.throws(() => parseShellWords("register 'unfinished"), /Unterminated/);
});
test('semantic validation rejects the audited contradictory fzf floor', () => {
  assert.throws(() => validateCommandSemantics([{ name: 'fbr', availability: 'fzf 0.52.0+', dependencies: 'git and fzf 0.68.0+' }], '0.68.0'), /fbr availability/);
  assert.doesNotThrow(() => validateCommandSemantics([{ name: 'fbr', availability: 'fzf 0.68.0+', dependencies: 'git and fzf 0.68.0+' }], '0.68.0'));
});
