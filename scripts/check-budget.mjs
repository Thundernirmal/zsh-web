import { routeAssets } from './route-assets.mjs';
import { guidePages, guideUrl } from '../src/lib/guide-topics.mjs';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Explicit payload and DOM ceilings for the static build. Measurements vary
// slightly across supported zlib versions; retain headroom when changing routes.
const BUDGETS = {
  'commands/index.html': { rawBytes: 350_000, gzipBytes: 23_000, elements: 1_200 },
  'tips/index.html': { rawBytes: 140_000, gzipBytes: 16_500, elements: 500 },
  'index.html': { rawBytes: 62_000, gzipBytes: 10_500, elements: 350 },
  'get-started/index.html': { rawBytes: 65_000, gzipBytes: 12_000, elements: 400 },
  'docs/index.html': { rawBytes: 35_000, gzipBytes: 8_000, elements: 320 },
  'docs/maintenance/index.html': { rawBytes: 38_000, gzipBytes: 9_800, elements: 500 },
  'troubleshooting/index.html': { rawBytes: 65_000, gzipBytes: 12_000, elements: 400 },
  '404.html': { rawBytes: 30_000, gzipBytes: 6_800, elements: 150 },
};

const DIST_DIR = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'));

// Explicit transfer ceilings. Headroom varies by route; new changes must fit.
// Font transfer is already compressed WOFF/WOFF2; all reachable subsets count.
const ASSET_BUDGETS = {
  'index.html': { jsGzip: 9_000, cssGzip: 23_000, fontBytes: 220_000 },
  'commands/index.html': { jsGzip: 162_000, cssGzip: 23_000, fontBytes: 220_000 },
  'tips/index.html': { jsGzip: 148_000, cssGzip: 23_000, fontBytes: 220_000 },
};
// Docs include shared router navigation, independent entry snapshots and
// request-race recovery. Reserve compression headroom across Node versions;
// the on-demand index remains separately budgeted below.
const docsAssets = { jsGzip: 9_500, cssGzip: 23_000, fontBytes: 220_000 };
for (const topic of guidePages) {
  const file = `${guideUrl(topic.slug).slice(1)}index.html`;
  BUDGETS[file] ??= { rawBytes: 55_000, gzipBytes: 12_500, elements: 800 };
  ASSET_BUDGETS[file] ??= docsAssets;
}
for (const name of fs.existsSync(path.join(DIST_DIR, 'docs')) ? fs.readdirSync(path.join(DIST_DIR, 'docs'), { recursive: true }) : []) {
  if (name.endsWith('.html')) {
    const file = `docs/${name.split(path.sep).join('/')}`;
    BUDGETS[file] ??= { rawBytes: 55_000, gzipBytes: 12_500, elements: 800 };
    ASSET_BUDGETS[file] ??= docsAssets;
  }
}
ASSET_BUDGETS['docs/index.html'] ??= docsAssets;
const detailBudget = { rawBytes: 160_000, gzipBytes: 18_000, elements: 900 };
for (const entry of fs.existsSync(path.join(DIST_DIR, 'commands')) ? fs.readdirSync(path.join(DIST_DIR, 'commands'), { withFileTypes: true }) : []) {
  if (entry.isDirectory()) BUDGETS[`commands/${entry.name}/index.html`] = detailBudget;
}
let failures = 0;

// The source-backed search index is fetched only when a reader enters a query.
for (const [file, limits] of Object.entries({
  'docs-search.json': { rawBytes: 110_000, gzipBytes: 30_000 },
  'tips.json': { rawBytes: 21_000, gzipBytes: 4_500 },
})) {
  const fullPath = path.join(DIST_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`✗ ${file}: missing from dist/`);
    failures += 1;
    continue;
  }
  const bytes = fs.readFileSync(fullPath);
  const metrics = { rawBytes: bytes.length, gzipBytes: gzipSync(bytes).length };
  for (const metric of Object.keys(limits)) {
    if (metrics[metric] > limits[metric]) {
      console.error(`✗ ${file} ${metric}: ${metrics[metric]} exceeds budget ${limits[metric]}`);
      failures += 1;
    }
  }
  console.log(`${file}: ${JSON.stringify(metrics)}`);
}

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

  let assets;
  try { assets = routeAssets(DIST_DIR, file); }
  catch (error) {
    console.error(`✗ ${file}: ${error.message}`);
    failures += 1;
    continue;
  }
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
