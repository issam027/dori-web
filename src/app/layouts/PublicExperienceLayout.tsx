import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LocaleSwitcher } from '@/design-system/components/LocaleSwitcher';

export function PublicExperienceLayout({
  mode,
  children,
}: {
  mode: 'public' | 'kiosk' | 'display' | 'tracking';
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={`public-layout public-${mode}`}>
      <header className="public-header">
        <strong>{t('app.name')}</strong>
        {mode !== 'display' ? <LocaleSwitcher /> : null}
      </header>
      <main>{children}</main>
      <footer>
        <Link to="/legal">{t('nav.legal')}</Link>
      </footer>
    </div>
  );
}
