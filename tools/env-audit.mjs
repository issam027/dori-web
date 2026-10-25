import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);
const scannedExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const viteBuiltIns = new Set(['BASE_URL', 'DEV', 'MODE', 'PROD', 'SSR']);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name))
        files.push(...(await sourceFiles(join(directory, entry.name))));
    } else if (scannedExtensions.has(extname(entry.name))) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

const example = await readFile(join(root, '.env.example'), 'utf8');
const declared = new Set(
  example
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter(Boolean),
);
const localEnvironment = await readFile(join(root, '.env'), 'utf8').catch(() => null);
const locallyDeclared = localEnvironment
  ? new Set(
      localEnvironment
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
        .filter(Boolean),
    )
  : null;
const used = new Map();
const patterns = [
  /(?:globalThis\.)?process\.env\.([A-Z][A-Z0-9_]*)/g,
  /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
  /\benv\.(VITE_[A-Z0-9_]+)/g,
  /budgetFromEnvironment\(\s*['"]([A-Z][A-Z0-9_]*)['"]/g,
];

for (const file of await sourceFiles(root)) {
  const source = await readFile(file, 'utf8');
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const name = match[1];
      if (!name || viteBuiltIns.has(name)) continue;
      const locations = used.get(name) ?? new Set();
      locations.add(relative(root, file));
      used.set(name, locations);
    }
  }
}

const missing = [...used].filter(([name]) => !declared.has(name));
const missingLocally = locallyDeclared
  ? [...used].filter(([name]) => !locallyDeclared.has(name))
  : [];
if (missing.length || missingLocally.length) {
  for (const [name, locations] of missing) {
    console.error(`${name} manque dans .env.example (utilisée dans ${[...locations].join(', ')})`);
  }
  for (const [name, locations] of missingLocally) {
    console.error(`${name} manque dans .env (utilisée dans ${[...locations].join(', ')})`);
  }
  process.exitCode = 1;
} else {
  console.log(`${used.size} variables d'environnement utilisées et documentées dans .env.example.`);
}
