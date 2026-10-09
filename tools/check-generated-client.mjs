import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredGeneratedEntries = [
  join(root, 'src', 'api', 'generated', 'models', 'index.ts'),
  join(root, 'src', 'api', 'generated', 'authentification', 'authentification.ts'),
  join(root, 'src', 'api', 'generated', 'sites', 'sites.ts'),
  join(root, 'src', 'api', 'generated', 'queues', 'queues.ts'),
  join(root, 'src', 'api', 'generated', 'registrations', 'registrations.ts'),
];

const missing = requiredGeneratedEntries.filter((entry) => !existsSync(entry));

if (missing.length > 0) {
  console.error('Client API généré incomplet. Exécutez `npm run api:generate` avant Playwright.');
  missing.forEach((entry) => console.error(`- ${entry}`));
  process.exitCode = 1;
} else {
  console.log('Client API généré disponible pour les tests E2E.');
}
