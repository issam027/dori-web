import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/core/auth/session-store';
import { LocaleSwitcher } from '@/design-system/components/LocaleSwitcher';
import { ThemeSwitcher } from '@/design-system/components/ThemeSwitcher';
import { LogOut, Menu, RefreshCw, UserRound } from 'lucide-react';
import { getUserInitials } from '@/features/users/user-display';
import { Button } from '@/design-system/components/Button';

export function Topbar({
  sites,
  activeSiteId,
  pageHeaderVisible,
  onLogout,
  onOpenCommands,
  onRefresh,
  refreshing,
  onOpenNavigation,
}: {
  sites: readonly { id: number; name: string }[];
  activeSiteId: number | null;
  pageHeaderVisible: boolean;
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
  const initials = user ? getUserInitials(user) : 'D';
  const activeSiteName =
    sites.find((site) => site.id === activeSiteId)?.name ?? __t('common.noActiveSite');
  const routeLabel = location.pathname.startsWith('/settings/')
    ? 'nav.settings'
    : ((
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
          '/settings': 'nav.settings',
          '/admin/users': 'nav.usersAdmin',
          '/onboarding': 'nav.onboarding',
          '/admin/translations': 'nav.translations',
          '/health': 'nav.health',
          '/profile': 'profile.title',
          '/change-password': 'auth.changePassword.changerLeMotDePasse',
        } as Record<string, string>
      )[location.pathname] ?? 'app.name');
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
      <Button
        variant="unstyled"
        className="topbar-icon-button mobile-menu-trigger"
        onClick={onOpenNavigation}
        aria-label={__t('shell.layouts.topbar.ouvrirLeMenu')}
      >
        <Menu aria-hidden="true" />
      </Button>
      <div className={`topbar-title${pageHeaderVisible ? ' is-site-prominent' : ''}`}>
        <div className="topbar-title-site" aria-hidden={!pageHeaderVisible}>
          <h1>{activeSiteName}</h1>
        </div>
        <div className="topbar-title-route" aria-hidden={pageHeaderVisible}>
          <span className="eyebrow">{activeSiteName}</span>
          <h1>{t(routeLabel)}</h1>
        </div>
      </div>
      <div className="topbar-actions">
        <Button
          variant="unstyled"
          className="topbar-icon-button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={refreshing ? t('common.refreshing') : t('common.refreshPage')}
          title={refreshing ? t('common.refreshing') : t('common.refreshPage')}
        >
          <RefreshCw aria-hidden="true" className={refreshing ? 'is-spinning' : undefined} />
        </Button>
        <Button variant="unstyled" className="command-trigger" onClick={onOpenCommands}>
          {t('commands.open')} <kbd>{__t('shell.layouts.topbar.k')}</kbd>
        </Button>
        <ThemeSwitcher />
        <div className="topbar-desktop-account">
          <LocaleSwitcher />
          <Link className="avatar" to="/profile" aria-label={t('profile.title')}>
            {initials}
          </Link>
          <Button onClick={onLogout}>
            <LogOut aria-hidden="true" />
            {t('auth.logout')}
          </Button>
        </div>
        <div className="mobile-account" ref={accountMenuRef}>
          <Button
            variant="unstyled"
            className="topbar-icon-button mobile-account-trigger"
            aria-label={t('profile.title')}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onClick={() => {
              setAccountMenuOpen((current) => !current);
            }}
          >
            <UserRound aria-hidden="true" />
          </Button>
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
              <Button variant="unstyled" labelMode="always" role="menuitem" onClick={onLogout}>
                <LogOut aria-hidden="true" />
                {t('auth.logout')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
