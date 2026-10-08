import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideNavigationTitle, guideOverview, guidePages, guideTopics, validateGuideSlugs } from '../src/lib/guide-topics.mjs';

test('guide routes reject every unknown id before mapping routes', () => {
  assert.doesNotThrow(() => validateGuideSlugs(guidePages.map((page) => page.slug)));
  assert.throws(() => validateGuideSlugs([...guidePages.map((page) => page.slug), 'unexpected', 'nested/extra']), /Unknown guide topics: unexpected, nested\/extra/);
});

test('guide routes reject missing registered pages as well as unknown ids', () => {
  const slugs = guidePages.filter((page) => page.slug !== 'nix').map((page) => page.slug);
  assert.throws(() => validateGuideSlugs(slugs), /Missing guide topics: nix/);
  assert.throws(() => validateGuideSlugs([...slugs, 'extra']), /Unknown guide topics: extra.*Missing guide topics: nix/);
});

test('navigation consumes the original topic records with one overview label override', () => {
  assert.equal(guidePages[0], guideOverview);
  assert.equal(guideNavigationTitle(guideOverview), 'Overview');
  for (const [index, topic] of guideTopics.entries()) {
    assert.equal(guidePages[index + 1], topic);
    assert.equal(guideNavigationTitle(topic), topic.title);
  }
});
