import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearSession } from '@/core/auth/session-actions';
import { LocaleSwitcher } from '@/design-system/components/LocaleSwitcher';

export function PublicExperienceLayout({
  mode,
  children,
}: {
  mode: 'public' | 'kiosk' | 'display' | 'tracking';
  children: ReactNode;
}) {
  const { t: __t } = useTranslation();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoutStarted = useRef(false);
  const disconnectRequested =
    (mode === 'kiosk' || mode === 'display' || mode === 'tracking') &&
    new URLSearchParams(location.search).get('deco')?.toLowerCase() === 'true';
  const origin = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    if (!disconnectRequested || logoutStarted.current) return;
    logoutStarted.current = true;
    void clearSession(queryClient).finally(() => {
      void navigate('/login', { replace: true });
    });
  }, [disconnectRequested, navigate, queryClient]);

  if (disconnectRequested) {
    return (
      <div className={`public-layout public-${mode}`}>
        <main className="experience-logout" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <strong>
            {__t('ui.shell.layouts.public_experience_layout.deconnexion_de_l_appareil_1tsww9p')}
          </strong>
        </main>
      </div>
    );
  }

  return (
    <div className={`public-layout public-${mode}`}>
      {mode !== 'display' ? (
        <header className="public-header">
          <strong>{t('app.name')}</strong>
          <LocaleSwitcher />
        </header>
      ) : null}
      <main>{children}</main>
      {mode !== 'display' ? (
        <footer>
          <Link to="/legal" state={{ from: origin }}>
            {t('nav.legal')}
          </Link>
        </footer>
      ) : null}
    </div>
  );
}
