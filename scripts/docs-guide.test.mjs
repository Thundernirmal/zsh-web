import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateGuideDocs, guideSearchIndex } from './docs-guide.mjs';
import { guideTopics } from '../src/lib/guide-topics.mjs';

const guide = '# Guide\n\nIntroduction.\n\n## Contents\n\n[Help](#help-1)\n\n' + guideTopics.flatMap((topic) => topic.sections).map((section) => `## ${section}\n\nContent for ${section}.\n\n### Help\n\n[Install](#setup-and-scope)\n\n`).join('');

test('guide search reads table text naturally while preserving literal shell pipes', () => {
  const entries = guideSearchIndex([{ slug: 'shell-basics', title: 'Shell basics', body: '## Aliases\n\n| Alias | Expansion |\n|---|---|\n| `G` | `\\| grep` |\n\nRead [setup](/docs/installation/).' }]);
  assert.equal(entries[0].url, '/docs/shell-basics/');
  assert.equal(entries[0].text, 'Aliases Alias Expansion G | grep Read setup.');
});

test('docs partition every source section once and preserve duplicate heading links', () => {
  const result = generateGuideDocs(guide);
  assert.equal(result.pages.length, guideTopics.length + 1);
  for (const title of guideTopics.flatMap((topic) => topic.sections)) {
    assert.equal(result.pages.filter((page) => page.body.includes(`Content for ${title}.`)).length, 1);
  }
  assert.equal(result.anchors['help-1'], '/docs/installation/#help-1');
  assert.equal(result.anchors['help-2'], '/docs/shell-basics/#help');
  assert.ok(result.pages.every((page) => !page.body.includes('](#setup-and-scope)')));
  assert.throws(() => generateGuideDocs(guide.replace('## Dependencies', '## New dependencies')), /Dependencies/);
  assert.throws(() => generateGuideDocs(guide + '\n## New topic\nUnknown.'), /Unassigned/);
});

test('code fences do not create guide sections and inline pipes remain table cells', () => {
  const result = generateGuideDocs(guide.replace('Content for Aliases.', '```zsh\n## Not a section\n```\n\n| Alias | Expansion | Example |\n|---|---|---|\n| G | `| grep` | `echo G` |'));
  const basics = result.pages.find((page) => page.slug === 'shell-basics');
  assert.ok(basics.body.includes('## Not a section'));
  assert.ok(basics.body.includes('| G | `\\| grep` | `echo G` |'));
});

test('search text follows Markdown structure without altering shell code', () => {
  const body = '## Read **this**\n\n1. **Fixed path.** Use __care__ and *attention*.\n\n> [Setup](/setup/)\n\n```text\n**/*.js and **/*(D)\n```\n\n`x_y` and `| grep`.';
  assert.equal(guideSearchIndex([{ title: 'Test', slug: 'test', body }])[0].text,
    'Read this Fixed path. Use care and attention. Setup **/*.js and **/*(D) x_y and | grep.');
});

test('fence contents, info strings and indentation follow CommonMark', () => {
  const example = '```zsh\n| `literal | pipe` |\n```not-a-closer\n## Still code\n    ```\n## Still code too\n```\n';
  const result = generateGuideDocs(guide.replace('Content for Aliases.', example));
  assert.ok(result.pages.find((page) => page.slug === 'shell-basics').body.includes(example.trim()));
  assert.ok(!Object.hasOwn(result.anchors, 'still-code'));
  assert.ok(!Object.hasOwn(result.anchors, 'still-code-too'));
});

test('duplicate Contents and literal hash headings produce accurate diagnostics', () => {
  assert.throws(() => generateGuideDocs(guide + '\n## Contents\nDuplicate.'), /duplicate Contents/);
  assert.throws(() => generateGuideDocs(guide + '\n## C#\nUnknown.'), /Unassigned GUIDE.md section: C#/);
});

test('formatted heading text and link destinations use rendered heading slugs', () => {
  const result = generateGuideDocs(guide.replace('Content for Aliases.', '### See [Setup](#setup-and-scope) & `C#`\n\n### See [Setup](#setup-and-scope) & `C#`'));
  assert.equal(result.anchors['see-setup--c'], '/docs/shell-basics/#see-setup--c');
  assert.equal(result.anchors['see-setup--c-1'], '/docs/shell-basics/#see-setup--c-1');
});


test('fragment rewriting does not consult Object.prototype', () => {
  const links = ['constructor', 'toString', 'valueOf', 'hasOwnProperty'].map((key) => `[${key}](#${key})`).join(' ');
  const result = generateGuideDocs(guide.replace('Content for Aliases.', links));
  assert.ok(result.pages.find((page) => page.slug === 'shell-basics').body.includes(links));
});

test('GFM tables without leading pipes preserve code cells and prose remains literal', () => {
  const table = '`| alias` | Expansion\n--- | ---\nG | `| grep`';
  const result = generateGuideDocs(guide.replace('Content for Aliases.', table + '\n\n| Prose `| literal`'));
  const page = result.pages.find((page) => page.slug === 'shell-basics');
  assert.ok(page.body.includes('`\\| alias` | Expansion'));
  assert.ok(page.body.includes('G | `\\| grep`'));
  assert.ok(page.body.includes('| Prose `| literal`'));
  assert.ok(guideSearchIndex([page])[0].text.includes('G | grep'));
});

test('nested headings participate in global and local duplicate slug counters', () => {
  const result = generateGuideDocs(guide.replace('Content for Aliases.', '> ### Help\n\n- ### Help'));
  assert.equal(result.anchors['help-4'], '/docs/shell-basics/#help-2');
  const page = result.pages.find((page) => page.slug === 'nix');
  assert.equal(page.description, guideTopics.find((topic) => topic.slug === 'nix').description);
});

test('prototype-named headings remain valid own-property mappings', () => {
  const result = generateGuideDocs(guide.replace('Content for Aliases.', '### `__proto__`\n\n[Read](#__proto__)'));
  assert.equal(result.anchors['__proto__'], '/docs/shell-basics/#__proto__');
});
