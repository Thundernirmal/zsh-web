import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { routeAssets } from './route-assets.mjs';

test('route assets traverse shared chunks and fonts once and reject missing assets', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'route-assets-'));
  try {
    fs.mkdirSync(path.join(dist, '_astro'));
    fs.writeFileSync(path.join(dist, 'index.html'), '<script src="/_astro/main.js"></script><link href="/_astro/site.css">');
    const main = 'import "./shared.js"; import("./shared.js");';
    const shared = 'export const version = 1;';
    const css = '@font-face{src:url(/_astro/text.woff2)}';
    fs.writeFileSync(path.join(dist, '_astro/main.js'), main);
    fs.writeFileSync(path.join(dist, '_astro/shared.js'), shared);
    fs.writeFileSync(path.join(dist, '_astro/site.css'), css);
    fs.writeFileSync(path.join(dist, '_astro/text.woff2'), 'font');
    assert.deepEqual(routeAssets(dist, 'index.html'), {
      jsGzip: gzipSync(main).length + gzipSync(shared).length,
      cssGzip: gzipSync(css).length, fontBytes: 4,
    });
    fs.unlinkSync(path.join(dist, '_astro/shared.js'));
    assert.throws(() => routeAssets(dist, 'index.html'), /ENOENT/);
  } finally { fs.rmSync(dist, { recursive: true, force: true }); }
});
