import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateGuideDocs, guideSearchIndex, guideTopics } from './docs-guide.mjs';

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
  const result = generateGuideDocs(guide.replace('Content for Aliases.', '```zsh\n## Not a section\n```\n\n| G | `| grep` | `echo G` |'));
  const basics = result.pages.find((page) => page.slug === 'shell-basics');
  assert.ok(basics.body.includes('## Not a section'));
  assert.ok(basics.body.includes('| G | `\\| grep` | `echo G` |'));
});
