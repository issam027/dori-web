import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { LocaleSwitcher } from '@/design-system/components/LocaleSwitcher';
import { ThemeSwitcher } from '@/design-system/components/ThemeSwitcher';

export function Topbar({
  sites,
  activeSiteId,
  onLogout,
  onOpenCommands,
}: {
  sites: readonly { id: number; name: string }[];
  activeSiteId: number | null;
  onLogout: () => void;
  onOpenCommands: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const initials = user?.username.slice(0, 2).toUpperCase() ?? 'D';
  const routeLabel =
    (
      {
        '/desk': 'nav.desk',
        '/my-queues': 'nav.myQueues',
        '/appointments': 'nav.appointments',
        '/control-room': 'nav.controlRoom',
        '/portfolio': 'nav.portfolio',
        '/reports': 'nav.reports',
        '/notifications': 'nav.notifications',
        '/kiosk': 'nav.kiosk',
        '/display': 'nav.display',
        '/track': 'nav.tracking',
        '/profile': 'profile.title',
      } as Record<string, string>
    )[location.pathname] ?? 'app.name';
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="eyebrow">
          {sites.find((site) => site.id === activeSiteId)?.name ?? 'Aucun site actif'}
        </span>
        <h1>{t(routeLabel)}</h1>
      </div>
      <div className="topbar-actions">
        <button className="command-trigger" type="button" onClick={onOpenCommands}>
          {t('commands.open')} <kbd>⌘K</kbd>
        </button>
        <LocaleSwitcher />
        <ThemeSwitcher />
        <Link className="avatar" to="/profile" aria-label={t('profile.title')}>
          {initials}
        </Link>
        <button className="button" type="button" onClick={onLogout}>
          {t('auth.logout')}
        </button>
      </div>
    </header>
  );
}
