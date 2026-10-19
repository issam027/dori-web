import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const sourceDirectory = join(process.cwd(), 'src');
const tokenFile = join(sourceDirectory, 'design-system', 'styles', 'tokens.css');

async function cssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? cssFiles(path)
        : Promise.resolve(path.endsWith('.css') ? [path] : []);
    }),
  );
  return nested.flat();
}

const violations = [];
let pixelLines = 0;
let mediaQueries = 0;
for (const file of await cssFiles(sourceDirectory)) {
  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/);
  mediaQueries += lines.filter((line) => line.includes('@media')).length;
  pixelLines += lines.filter((line) => /\b\d+(?:\.\d+)?px\b/.test(line)).length;
  if (file === tokenFile) continue;
  lines.forEach((line, index) => {
    const colors = line.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (colors) {
      violations.push(`${relative(process.cwd(), file)}:${index + 1}: ${colors.join(', ')}`);
    }
  });
}

if (violations.length) {
  console.error('Couleurs hexadécimales interdites hors tokens.css :');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log('Design token audit passed: 0 couleur hexadécimale hors tokens.css.');
}
console.log(`Mesures suivies : ${pixelLines} lignes avec px ; ${mediaQueries} media queries.`);
console.log(
  'Exception documentée : mm et pt de print/documents.css décrivent des dimensions physiques.',
);
