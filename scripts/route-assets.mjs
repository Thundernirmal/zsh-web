import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

// Follow local imports, island entrypoints, stylesheets and CSS font URLs.
// Count all reachable fonts (including unicode subsets) conservatively;
// browsers usually request fewer font files for a particular page's text.
export function routeAssets(dist, entry) {
  const seen = new Set();
  const totals = { jsGzip: 0, cssGzip: 0, fontBytes: 0 };
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const bytes = fs.readFileSync(file);
    const extension = path.extname(file);
    if (extension === '.js') totals.jsGzip += gzipSync(bytes).length;
    if (extension === '.css') totals.cssGzip += gzipSync(bytes).length;
    if (/^\.woff2?$/.test(extension)) { totals.fontBytes += bytes.length; return; }
    for (const match of bytes.toString().matchAll(/["'(]((?:\/_astro\/|\.\.?\/)[^"'()\s<>]+?\.(?:js|css|woff2?))(?:\?[^"'()\s<>]*)?["')]/g)) {
      const reference = match[1];
      const target = reference.startsWith('/') ? path.join(dist, reference) : path.resolve(path.dirname(file), reference);
      if (!target.startsWith(`${dist}${path.sep}`)) throw new Error(`Asset escapes dist: ${reference}`);
      visit(target);
    }
  }
  visit(path.join(dist, entry));
  return totals;
}
