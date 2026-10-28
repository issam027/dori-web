import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];
const requireText = (path, text, message) => {
  if (!read(path).includes(text)) failures.push(message);
};
const forbidText = (path, text, message) => {
  if (read(path).includes(text)) failures.push(message);
};

forbidText(
  'src/features/onboarding/components/OnboardingWizard.tsx',
  '/settings/users',
  'Le parcours onboarding ne doit pas pointer vers /settings/users.',
);
requireText(
  'src/app/layouts/SidebarAccordion.tsx',
  'navigationRoutes',
  'La sidebar doit utiliser le registre de navigation partagé.',
);
requireText(
  'src/app/layouts/CommandPalette.tsx',
  'navigationRoutes',
  'La palette doit utiliser le registre de navigation partagé.',
);
forbidText(
  'src/features/queue-operations/MyQueuesPage.tsx',
  'File #',
  'Une file ne doit pas être présentée par son UUID.',
);
forbidText(
  'src/features/notes/PersonNotesViewer.tsx',
  '`#${personId}`',
  'Une personne ne doit pas être présentée par son UUID.',
);
forbidText(
  'src/design-system/styles/components/content.css',
  '.queue-desk-card',
  'Les styles du cockpit legacy ne doivent pas revenir.',
);
requireText(
  'src/design-system/components/Modal.tsx',
  'dialog-header-close',
  'Les modales doivent proposer une fermeture accessible dans leur header.',
);

for (const path of [
  'src/features/users/UsersAdminPage.tsx',
  'src/features/translations/TranslationsAdminPage.tsx',
  'src/features/notifications/NotificationsPage.tsx',
  'src/features/queue-operations/MyQueuesPage.tsx',
]) {
  requireText(path, 'error={', `${path} doit exposer explicitement son état d’erreur.`);
  requireText(path, 'empty={', `${path} doit distinguer un résultat vide d’une erreur.`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('UI consistency audit passed.');
