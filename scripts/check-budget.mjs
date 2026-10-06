import { routeAssets } from './route-assets.mjs';
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
  'get-started/index.html': { rawBytes: 65_000, gzipBytes: 12_000, elements: 400 },
  'docs/index.html': { rawBytes: 35_000, gzipBytes: 8_000, elements: 320 },
  'docs/maintenance/index.html': { rawBytes: 38_000, gzipBytes: 9_800, elements: 500 },
  'troubleshooting/index.html': { rawBytes: 65_000, gzipBytes: 12_000, elements: 400 },
};

const DIST_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');

// Measured after the reference/guide changes, with approximately 15% headroom.
// Font transfer is already compressed WOFF/WOFF2; all reachable subsets count.
const ASSET_BUDGETS = {
  'index.html': { jsGzip: 9_000, cssGzip: 23_000, fontBytes: 220_000 },
  'commands/index.html': { jsGzip: 162_000, cssGzip: 23_000, fontBytes: 220_000 },
  'tips/index.html': { jsGzip: 148_000, cssGzip: 23_000, fontBytes: 220_000 },
};
// Starlight has a small initial script plus deferred Pagefind UI (~30 KB gzip
// combined). Count both; keep app-route limits unchanged.
const docsAssets = { jsGzip: 35_000, cssGzip: 23_000, fontBytes: 220_000 };
for (const entry of fs.existsSync(path.join(DIST_DIR, 'docs')) ? fs.readdirSync(path.join(DIST_DIR, 'docs'), { withFileTypes: true }) : []) {
  if (entry.isDirectory()) {
    const file = `docs/${entry.name}/index.html`;
    BUDGETS[file] ??= { rawBytes: 55_000, gzipBytes: 12_500, elements: 800 };
    ASSET_BUDGETS[file] = docsAssets;
  }
}
ASSET_BUDGETS['docs/index.html'] = docsAssets;
const detailBudget = { rawBytes: 160_000, gzipBytes: 18_000, elements: 900 };
for (const entry of fs.existsSync(path.join(DIST_DIR, 'commands')) ? fs.readdirSync(path.join(DIST_DIR, 'commands'), { withFileTypes: true }) : []) {
  if (entry.isDirectory()) BUDGETS[`commands/${entry.name}/index.html`] = detailBudget;
}
let failures = 0;

// Pagefind loads its runtime/WASM/index separately when searching. Bound the
// entire generated directory conservatively, including unused UI variants.
function directoryBytes(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((sum, entry) => {
    const file = path.join(directory, entry.name);
    return sum + (entry.isDirectory() ? directoryBytes(file) : fs.statSync(file).size);
  }, 0);
}
const searchDirectory = path.join(DIST_DIR, 'pagefind');
const searchBytes = fs.existsSync(searchDirectory) ? directoryBytes(searchDirectory) : Infinity;
if (searchBytes > 900_000) {
  console.error(`✗ Pagefind generated assets: ${searchBytes} exceeds 900,000 bytes or is missing`);
  failures += 1;
}
console.log(`Pagefind generated assets: ${searchBytes} bytes`);

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

  const assets = routeAssets(DIST_DIR, file);
  const assetBudget = ASSET_BUDGETS[file] ?? { jsGzip: file.startsWith('commands/') ? 102_000 : 8_000, cssGzip: 23_000, fontBytes: 220_000 };
  const metrics = { rawBytes, gzipBytes, elements, ...assets };
  const limits = { ...budget, ...assetBudget };
  for (const metric of Object.keys(metrics)) {
    const measured = metrics[metric];
    const limit = limits[metric];
    if (measured > limit) {
      console.error(`✗ ${file} ${metric}: ${measured.toLocaleString()} exceeds budget ${limit.toLocaleString()}`);
      failures += 1;
    }
  }
  if (!file.startsWith('commands/') || file === 'commands/index.html' || file === 'commands/upkg/index.html') {
    console.log(`${file}: ${JSON.stringify(metrics)}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} budget(s) exceeded. Trim the DOM or raise the budgets in scripts/check-budget.mjs deliberately.`);
  process.exit(1);
}
console.log('\nAll payload/DOM budgets met.');
