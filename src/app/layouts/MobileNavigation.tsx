import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import { navigationRoutes } from '@/app/protected-routes';
import { useSessionStore } from '@/core/auth/session-store';
import { hasAnyPermission } from '@/core/permissions/permissions';
import { Button } from '@/design-system/components/Button';

export function MobileNavigation({ onMore, open }: { onMore: () => void; open: boolean }) {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const location = useLocation();
  const routes = ['/desk', '/my-queues', '/appointments']
    .flatMap((path) => navigationRoutes.filter((route) => route.path === path))
    .filter((route) => hasAnyPermission(user, route.permissions));
  const moreActive = !routes.some((route) => route.path === location.pathname);
  return (
    <nav className="mobile-bottom-nav" aria-label={t('mobile.mobileNavigation')}>
      {routes.map((route) => (
        <NavLink to={route.path} key={route.path}>
          <route.icon aria-hidden="true" />
          <span>{t(route.labelKey)}</span>
        </NavLink>
      ))}
      <Button
        variant="unstyled"
        labelMode="always"
        className={moreActive ? 'active' : ''}
        aria-expanded={open}
        onClick={onMore}
      >
        <MoreHorizontal aria-hidden="true" />
        <span>{t('mobile.more')}</span>
      </Button>
    </nav>
  );
}
