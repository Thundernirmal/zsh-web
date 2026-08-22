import { gzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Payload and DOM budgets for the static build. Values leave ~15% headroom
// over the current build; tighten them as the site shrinks.
const BUDGETS = {
  'commands/index.html': { rawBytes: 350_000, gzipBytes: 23_000, elements: 1_200 },
  'tips/index.html': { rawBytes: 140_000, gzipBytes: 16_500, elements: 500 },
  'index.html': { rawBytes: 62_000, gzipBytes: 10_500, elements: 350 },
};

const DIST_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

let failures = 0;

for (const [file, budget] of Object.entries(BUDGETS)) {
  const fullPath = path.join(DIST_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`✗ ${file}: missing from dist/ — run npm run build first`);
    failures += 1;
    continue;
  }

  const html = fs.readFileSync(fullPath, 'utf8');
  const rawBytes = Buffer.byteLength(html);
  const gzipBytes = gzipSync(html).length;
  const elements = (html.match(/<[a-zA-Z]/g) ?? []).length;

  for (const metric of ['rawBytes', 'gzipBytes', 'elements']) {
    const measured = { rawBytes, gzipBytes, elements }[metric];
    const limit = budget[metric];
    if (measured > limit) {
      console.error(`✗ ${file} ${metric}: ${measured.toLocaleString()} exceeds budget ${limit.toLocaleString()}`);
      failures += 1;
    } else {
      console.log(`✓ ${file} ${metric}: ${measured.toLocaleString()} / ${limit.toLocaleString()}`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} budget(s) exceeded. Trim the DOM or raise the budgets in scripts/check-budget.mjs deliberately.`);
  process.exit(1);
}
console.log('\nAll payload/DOM budgets met.');
