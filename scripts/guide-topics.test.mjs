import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideNavigationTitle, guideOverview, guidePages, guideTopics, validateGuideSlugs } from '../src/lib/guide-topics.mjs';

test('guide routes reject every unknown id before mapping routes', () => {
  assert.doesNotThrow(() => validateGuideSlugs(guidePages.map((page) => page.slug)));
  assert.throws(() => validateGuideSlugs(['index', 'unexpected', 'nested/extra']), /Unknown guide topics: unexpected, nested\/extra/);
});

test('navigation consumes the original topic records with one overview label override', () => {
  assert.equal(guidePages[0], guideOverview);
  assert.equal(guideNavigationTitle(guideOverview), 'Overview');
  for (const [index, topic] of guideTopics.entries()) {
    assert.equal(guidePages[index + 1], topic);
    assert.equal(guideNavigationTitle(topic), topic.title);
  }
});
