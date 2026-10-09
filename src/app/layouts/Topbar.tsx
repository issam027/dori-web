import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { LocaleSwitcher } from '@/design-system/components/LocaleSwitcher';
import { ThemeSwitcher } from '@/design-system/components/ThemeSwitcher';
import { Menu, RefreshCw } from 'lucide-react';

export function Topbar({
  sites,
  activeSiteId,
  onLogout,
  onOpenCommands,
  onRefresh,
  refreshing,
  onOpenNavigation,
}: {
  sites: readonly { id: number; name: string }[];
  activeSiteId: number | null;
  onLogout: () => void;
  onOpenCommands: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onOpenNavigation: () => void;
}) {
  const { t: __t } = useTranslation();
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
      <button
        className="topbar-icon-button mobile-menu-trigger"
        type="button"
        onClick={onOpenNavigation}
        aria-label={__t('ui.shell.layouts.topbar.ouvrir_le_menu_q76zys')}
      >
        <Menu aria-hidden="true" />
      </button>
      <div className="topbar-title">
        <span className="eyebrow">
          {sites.find((site) => site.id === activeSiteId)?.name ??
            __t('ui.expression.shell.layouts.topbar.aucun_site_actif_hmb19')}
        </span>
        <h1>{t(routeLabel)}</h1>
      </div>
      <div className="topbar-actions">
        <button
          className="topbar-icon-button"
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={refreshing ? 'Actualisation en cours' : 'Actualiser la page'}
          title={refreshing ? 'Actualisation en cours' : 'Actualiser la page'}
        >
          <RefreshCw aria-hidden="true" className={refreshing ? 'is-spinning' : undefined} />
        </button>
        <button className="command-trigger" type="button" onClick={onOpenCommands}>
          {t('commands.open')} <kbd>{__t('ui.shell.layouts.topbar.k_1f6nlc4')}</kbd>
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
