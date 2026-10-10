import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const sourceRoot = join(root, 'src');

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

const sourceFiles = filesIn(sourceRoot).filter((path) => ['.ts', '.tsx'].includes(extname(path)));
const authoredFiles = sourceFiles.filter((path) => !path.includes(`${join('api', 'generated')}`));
const failures = [];

function assertNoMatch(paths, pattern, message, ignore = () => false) {
  for (const path of paths) {
    const content = readFileSync(path, 'utf8');
    if (pattern.test(content) && !ignore(path, content)) {
      failures.push(`${message}: ${relative(root, path)}`);
    }
  }
}

const pageFiles = authoredFiles.filter((path) => /Page\.tsx$/.test(path));
// Temporary exceptions must be explicit and can only shrink. Keep this set
// empty once migration is complete so a new direct controller import fails CI.
const generatedControllerImportExceptions = new Set([]);
assertNoMatch(
  pageFiles,
  /\b(?:fetch|axios\.(?:get|post|put|patch|delete)|httpClient\.)\s*\(/,
  'Appel HTTP brut dans un composant de page',
);
assertNoMatch(
  pageFiles,
  /from\s+['"]@\/api\/generated\/(?!models(?:\/|['"]))[^'"]+['"]\s*;?/,
  'Import direct du client Orval dans une page',
  (path) => generatedControllerImportExceptions.has(relative(root, path).replaceAll('\\', '/')),
);
assertNoMatch(
  authoredFiles,
  /\b(?:interface|type)\s+\w*Dto\b/,
  'DTO recopié hors du client généré',
);
assertNoMatch(
  authoredFiles,
  /dangerouslySetInnerHTML|\binnerHTML\s*=|\beval\s*\(/,
  'Injection HTML dynamique interdite',
);
assertNoMatch(
  authoredFiles.filter((path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx')),
  /console\.(?:log|info|warn)\s*\(/,
  'Journal applicatif non contrôlé',
);

const lockPath = join(root, 'package-lock.json');
if (!statSync(lockPath).isFile()) failures.push('package-lock.json absent');
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
if (lock.lockfileVersion < 3) failures.push('package-lock.json doit utiliser lockfileVersion 3');

const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
if (!indexHtml.includes('name="referrer" content="no-referrer"')) {
  failures.push('Politique no-referrer absente');
}

if (failures.length) {
  console.error(`Audit Phase 11 échoué (${String(failures.length)})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Audit Phase 11 réussi sur ${String(authoredFiles.length)} fichiers source.`);
}
