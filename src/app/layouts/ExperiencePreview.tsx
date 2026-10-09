import type { ReactNode } from 'react';

const labels = {
  kiosk: 'Aperçu de la borne tactile',
  display: 'Aperçu de l’écran de salle',
  tracking: 'Aperçu du suivi mobile',
} as const;

export function ExperiencePreview({
  mode,
  children,
}: {
  mode: keyof typeof labels;
  children: ReactNode;
}) {
  return (
    <section className={`experience-preview experience-preview-${mode}`} aria-label={labels[mode]}>
      <div className="experience-preview-stage">{children}</div>
    </section>
  );
}
