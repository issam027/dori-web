import { gzipSync } from 'node:zlib';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const distDirectory = join(process.cwd(), 'dist');
const assetsDirectory = join(distDirectory, 'assets');
const reportPath = join(distDirectory, 'bundle-report.json');

function budgetFromEnvironment(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} doit être un entier strictement positif.`);
  }
  return value;
}

const budgets = {
  initialJsGzip: budgetFromEnvironment('BUNDLE_INITIAL_JS_GZIP_BUDGET', 125_000),
  initialCssGzip: budgetFromEnvironment('BUNDLE_INITIAL_CSS_GZIP_BUDGET', 36_000),
  secondaryJsGzip: budgetFromEnvironment('BUNDLE_SECONDARY_JS_GZIP_BUDGET', 45_000),
  minimumPageChunks: budgetFromEnvironment('BUNDLE_MINIMUM_PAGE_CHUNKS', 15),
};

const html = await readFile(join(distDirectory, 'index.html'), 'utf8');
const entryMatch = html.match(/<script[^>]+src="\/assets\/([^"]+\.js)"/);
const cssMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="\/assets\/([^"]+\.css)"/);
if (!entryMatch?.[1] || !cssMatch?.[1]) {
  throw new Error("Impossible d'identifier les assets initiaux dans dist/index.html.");
}

const assetNames = (await readdir(assetsDirectory)).filter((name) => /\.(?:js|css)$/.test(name));
const assets = await Promise.all(
  assetNames.map(async (name) => {
    const path = join(assetsDirectory, name);
    const content = await readFile(path);
    return {
      name,
      bytes: (await stat(path)).size,
      gzipBytes: gzipSync(content).byteLength,
      kind: name.endsWith('.js') ? 'js' : 'css',
    };
  }),
);
assets.sort((left, right) => right.gzipBytes - left.gzipBytes);

const entry = assets.find(({ name }) => name === entryMatch[1]);
const stylesheet = assets.find(({ name }) => name === cssMatch[1]);
if (!entry || !stylesheet) throw new Error('Asset initial absent de dist/assets.');

const secondaryJavaScript = assets.filter(({ kind, name }) => kind === 'js' && name !== entry.name);
const largestSecondary = secondaryJavaScript[0];
const pageChunks = secondaryJavaScript.filter(({ name }) =>
  /(?:Page|AdminPage)-[^/]+\.js$/.test(name),
);

const checks = [
  {
    metric: 'initialJsGzip',
    actual: entry.gzipBytes,
    budget: budgets.initialJsGzip,
    passed: entry.gzipBytes <= budgets.initialJsGzip,
  },
  {
    metric: 'initialCssGzip',
    actual: stylesheet.gzipBytes,
    budget: budgets.initialCssGzip,
    passed: stylesheet.gzipBytes <= budgets.initialCssGzip,
  },
  {
    metric: 'secondaryJsGzip',
    actual: largestSecondary?.gzipBytes ?? 0,
    budget: budgets.secondaryJsGzip,
    passed: (largestSecondary?.gzipBytes ?? 0) <= budgets.secondaryJsGzip,
  },
  {
    metric: 'pageChunks',
    actual: pageChunks.length,
    budget: budgets.minimumPageChunks,
    passed: pageChunks.length >= budgets.minimumPageChunks,
  },
];

const report = {
  generatedAt: new Date().toISOString(),
  budgets,
  initial: { javascript: entry, stylesheet },
  largestSecondaryJavaScript: largestSecondary ?? null,
  pageChunks: pageChunks.map(({ name, bytes, gzipBytes }) => ({ name, bytes, gzipBytes })),
  checks,
  assets,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

for (const check of checks) {
  const comparison = check.metric === 'pageChunks' ? '>=' : '<=';
  console.log(
    `${check.passed ? 'PASS' : 'FAIL'} ${check.metric}: ${check.actual} ${comparison} ${check.budget}`,
  );
}
console.log(`Rapport écrit dans ${reportPath}`);

if (checks.some(({ passed }) => !passed)) process.exitCode = 1;
