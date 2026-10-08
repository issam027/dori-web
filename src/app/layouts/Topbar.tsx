import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/core/auth/session-store';
import { LocaleSwitcher } from '@/design-system/components/LocaleSwitcher';
import { ThemeSwitcher } from '@/design-system/components/ThemeSwitcher';
import { SiteContextSwitcher, type SiteOption } from './SiteContextSwitcher';

export function Topbar({
  sites,
  activeSiteId,
  onSiteChange,
  onLogout,
  onOpenCommands,
}: {
  sites: readonly SiteOption[];
  activeSiteId: number | null;
  onSiteChange: (siteId: number) => void;
  onLogout: () => void;
  onOpenCommands: () => void;
}) {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const initials = user?.username.slice(0, 2).toUpperCase() ?? 'D';
  return (
    <header className="topbar">
      <SiteContextSwitcher sites={sites} activeSiteId={activeSiteId} onSelect={onSiteChange} />
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
