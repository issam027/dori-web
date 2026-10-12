import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

const labelKeys = {
  kiosk: 'experience.preview.kiosk',
  display: 'experience.preview.display',
  tracking: 'experience.preview.tracking',
} as const;

export function ExperiencePreview({
  mode,
  children,
}: {
  mode: keyof typeof labelKeys;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section
      className={`experience-preview experience-preview-${mode}`}
      aria-label={t(labelKeys[mode])}
    >
      <div className="experience-preview-stage">{children}</div>
    </section>
  );
}
