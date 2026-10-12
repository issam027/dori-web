import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/core/auth/session-store';
import { LocaleSwitcher } from '@/design-system/components/LocaleSwitcher';
import { ThemeSwitcher } from '@/design-system/components/ThemeSwitcher';
import { LogOut, Menu, RefreshCw, UserRound } from 'lucide-react';

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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const initials = user?.username.slice(0, 2).toUpperCase() ?? 'D';
  const routeLabel =
    (
      {
        '/desk': 'nav.desk',
        '/my-queues': 'nav.myQueues',
        '/persons': 'nav.persons',
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
  useEffect(() => {
    if (!accountMenuOpen) return;
    const close = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
    };
  }, [accountMenuOpen]);
  return (
    <header className="topbar">
      <button
        className="topbar-icon-button mobile-menu-trigger"
        type="button"
        onClick={onOpenNavigation}
        aria-label={__t('shell.layouts.topbar.ouvrirLeMenu')}
      >
        <Menu aria-hidden="true" />
      </button>
      <div className="topbar-title">
        <span className="eyebrow">
          {sites.find((site) => site.id === activeSiteId)?.name ?? __t('common.noActiveSite')}
        </span>
        <h1>{t(routeLabel)}</h1>
      </div>
      <div className="topbar-actions">
        <button
          className="topbar-icon-button"
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={refreshing ? t('common.refreshing') : t('common.refreshPage')}
          title={refreshing ? t('common.refreshing') : t('common.refreshPage')}
        >
          <RefreshCw aria-hidden="true" className={refreshing ? 'is-spinning' : undefined} />
        </button>
        <button className="command-trigger" type="button" onClick={onOpenCommands}>
          {t('commands.open')} <kbd>{__t('shell.layouts.topbar.k')}</kbd>
        </button>
        <ThemeSwitcher />
        <div className="topbar-desktop-account">
          <LocaleSwitcher />
          <Link className="avatar" to="/profile" aria-label={t('profile.title')}>
            {initials}
          </Link>
          <button className="button" type="button" onClick={onLogout}>
            <LogOut aria-hidden="true" />
            {t('auth.logout')}
          </button>
        </div>
        <div className="mobile-account" ref={accountMenuRef}>
          <button
            className="topbar-icon-button mobile-account-trigger"
            type="button"
            aria-label={t('profile.title')}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onClick={() => {
              setAccountMenuOpen((current) => !current);
            }}
          >
            <UserRound aria-hidden="true" />
          </button>
          {accountMenuOpen ? (
            <div className="mobile-account-menu" role="menu">
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => {
                  setAccountMenuOpen(false);
                }}
              >
                <span className="avatar" aria-hidden="true">
                  {initials}
                </span>
                {t('profile.title')}
              </Link>
              <div className="mobile-account-language">
                <span>{t('locale.label')}</span>
                <LocaleSwitcher />
              </div>
              <button type="button" role="menuitem" onClick={onLogout}>
                <LogOut aria-hidden="true" />
                {t('auth.logout')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
