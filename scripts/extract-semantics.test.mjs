import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCommandCondition, parseShellWords, splitGuide, validateCommandSemantics } from './extract-semantics.mjs';

test('capability requirements preserve all/any semantics without shell expressions', () => {
  assert.equal(describeCommandCondition('if (( $+commands[pacman] && $+commands[checkupdates] && $+commands[fakeroot] )); then'), 'Available when pacman, checkupdates, and fakeroot are installed');
  assert.equal(describeCommandCondition('if (( $+commands[dnf] )); then'), 'Available when dnf is installed');
  assert.equal(describeCommandCondition('if (( $+commands[apt] || $+commands[dnf] )); then'), 'Available when apt or dnf is installed');
  assert.equal(describeCommandCondition('if (( ! $+commands[dnf] )); then'), undefined);
  assert.equal(describeCommandCondition('if (( $+commands[apt] && $+commands[dnf] || $+commands[npm] )); then'), undefined);
});

test('guide pages retain reference anchors and every maintenance instruction', () => {
  const guide = '# Guide\n\n[Maintenance](#maintenance-and-verification)\n\n## Usage\n\nExample\n\n## Maintenance and verification\n\n### Checks\n\nRun checks.\n';
  const pages = splitGuide(guide);
  assert.match(pages.reference, /\[Maintenance\]\(#maintenance-and-verification\)/);
  assert.match(pages.reference, /\[Read maintenance and verification instructions\]\(\/docs\/maintenance\/\)/);
  assert.equal(pages.maintenance, '# Maintenance and verification\n\n## Checks\n\nRun checks.\n');
  assert.doesNotMatch(pages.reference, /Run checks/);
  assert.throws(() => splitGuide('# Missing section'), /missing the maintenance section/);
  const withModules = guide.replace('## Usage', '## Module layout\n\nModule table.\n\n## Usage');
  const modulePages = splitGuide(withModules);
  assert.match(modulePages.reference, /\[Read the module layout\]\(\/docs\/maintenance\/#module-layout\)/);
  assert.doesNotMatch(modulePages.reference, /Module table/);
  assert.match(modulePages.maintenance, /## Module layout\n\nModule table/);
  assert.match(modulePages.reference, /## Usage\n\nExample/);
  const pipePages = splitGuide(guide.replace('Example', '| G | `| grep` | `echo text G` |\n| NE | `2>/dev/null` | `echo NE` |'));
  assert.ok(pipePages.reference.includes('| G | `\\| grep` | `echo text G` |'));
  assert.ok(pipePages.reference.includes('| NE | `2>/dev/null` | `echo NE` |'));
});

test('registry tokens preserve quoted syntax, empty values and literal hashes', () => {
  assert.deepEqual(parseShellWords(`register 'upkg-plan' "upkg plan [--only <list>]" '' 'echo # literal' # annotation`), ['register', 'upkg-plan', 'upkg plan [--only <list>]', '', 'echo # literal']);
  assert.throws(() => parseShellWords("register 'unfinished"), /Unterminated/);
});
test('semantic validation rejects the audited contradictory fzf floor', () => {
  assert.throws(() => validateCommandSemantics([{ name: 'fbr', availability: 'fzf 0.52.0+', dependencies: 'git and fzf 0.68.0+' }], '0.68.0'), /fbr availability/);
  assert.doesNotThrow(() => validateCommandSemantics([{ name: 'fbr', availability: 'fzf 0.68.0+', dependencies: 'git and fzf 0.68.0+' }], '0.68.0'));
});
