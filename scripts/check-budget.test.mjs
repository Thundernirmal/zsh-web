import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { guideTopics } from './docs-guide.mjs';

test('budget gate rejects a missing mapped topic even when dist omits its directory', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-budget-'));
  try {
    const files = ['404.html', 'index.html', 'commands/index.html', 'tips/index.html', 'get-started/index.html', 'troubleshooting/index.html', 'docs/index.html', ...guideTopics.map((topic) => `docs/${topic.slug}/index.html`)];
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(dist, file)), { recursive: true });
      fs.writeFileSync(path.join(dist, file), '<html><body>Small fixture.</body></html>');
    }
    fs.writeFileSync(path.join(dist, 'docs-search.json'), '[]');
    fs.writeFileSync(path.join(dist, 'tips.json'), '[]');
    const script = fileURLToPath(new URL('./check-budget.mjs', import.meta.url));
    assert.equal(spawnSync(process.execPath, [script, dist], { encoding: 'utf8' }).status, 0);
    fs.rmSync(path.join(dist, 'docs/themes'), { recursive: true });
    const result = spawnSync(process.execPath, [script, dist], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /docs\/themes\/index.html: missing from dist/);
    fs.writeFileSync(path.join(dist, 'tips.json'), 'x'.repeat(21_001));
    fs.unlinkSync(path.join(dist, '404.html'));
    const guarded = spawnSync(process.execPath, [script, dist], { encoding: 'utf8' });
    assert.equal(guarded.status, 1);
    assert.match(guarded.stderr, /tips.json rawBytes/);
    assert.match(guarded.stderr, /404.html: missing from dist/);
  } finally { fs.rmSync(dist, { recursive: true, force: true }); }
});
