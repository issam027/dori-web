import type { ReactNode } from 'react';

const previewCopy = {
  kiosk: {
    eyebrow: 'Aperçu matériel',
    title: 'Borne libre-service',
    description: 'Prévisualisez le parcours tel qu’il sera présenté sur la borne du site.',
    status: 'Borne connectée',
    viewport: 'Écran tactile',
  },
  display: {
    eyebrow: 'Salle d’attente',
    title: 'Affichage TV',
    description: 'Contrôlez l’affichage public synchronisé, sans donnée personnelle.',
    status: 'Écran connecté',
    viewport: 'Format 16:9',
  },
  tracking: {
    eyebrow: 'Expérience usager',
    title: 'Suivi mobile du ticket',
    description: 'Testez le suivi sécurisé d’un ticket depuis un téléphone mobile.',
    status: 'Aperçu interactif',
    viewport: 'Format mobile',
  },
} as const;

export function ExperiencePreview({
  mode,
  children,
}: {
  mode: keyof typeof previewCopy;
  children: ReactNode;
}) {
  const copy = previewCopy[mode];
  return (
    <div className={`page-stack experience-preview experience-preview-${mode}`}>
      <header className="page-header experience-preview-header">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <span className="status-badge status-success">
          <span className="dot" aria-hidden="true" />
          {copy.status}
        </span>
      </header>
      <section className="experience-preview-frame" aria-label={`${copy.title} — ${copy.viewport}`}>
        <div className="experience-preview-toolbar">
          <span className="preview-lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <strong>{copy.viewport}</strong>
          <span>Prévisualisation</span>
        </div>
        <div className="experience-preview-stage">{children}</div>
      </section>
    </div>
  );
}
