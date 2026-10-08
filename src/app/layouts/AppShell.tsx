import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { clearSession, changeActiveSite } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { sitesControllerFindSites } from '@/api/generated/sites/sites';
import { CommandPalette } from './CommandPalette';
import { SidebarAccordion } from './SidebarAccordion';
import { Topbar } from './Topbar';
import { EmptyState } from '@/design-system/components/FeedbackState';

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const location = useLocation();
  const [commandsOpen, setCommandsOpen] = useState(false);
  const sitesQuery = useQuery({
    queryKey: ['sites', 'context-switcher'],
    queryFn: () => sitesControllerFindSites({ page: 1, pageSize: 100 }),
    enabled: Boolean(user && (user.scope.isGlobal || user.scope.siteIds.length > 0)),
  });
  const sites = useMemo(
    () =>
      sitesQuery.data?.data.items
        .filter((site) => user?.scope.isGlobal || user?.scope.siteIds.includes(site.siteId))
        .map((site) => ({ id: site.siteId, name: site.siteName })) ??
      user?.scope.siteIds.map((id) => ({ id, name: t('site.fallback', { id }) })) ??
      [],
    [sitesQuery.data, t, user],
  );
  useEffect(() => {
    const onlySite = sites.length === 1 ? sites[0] : undefined;
    if (!user || activeSiteId !== null || !onlySite) return;
    void changeActiveSite(queryClient, onlySite.id, user.scope);
  }, [activeSiteId, queryClient, sites, user]);
  const requiresSite = !['/portfolio', '/profile', '/change-password'].includes(location.pathname);

  return (
    <div className="app-shell">
      <SidebarAccordion siteCount={sites.length} />
      <div className="app-column">
        <Topbar
          sites={sites}
          activeSiteId={activeSiteId}
          onLogout={() => {
            void clearSession(queryClient);
          }}
          onOpenCommands={() => {
            setCommandsOpen(true);
          }}
        />
        <main className="app-content">
          {requiresSite && activeSiteId === null && !sitesQuery.isLoading ? (
            <div className="site-required-card">
              <EmptyState
                title="Choisissez un site actif"
                description="Sélectionnez le site sur lequel vous souhaitez travailler depuis votre portefeuille."
                action={
                  <Link className="button button-primary" to="/portfolio">
                    Ouvrir le portefeuille de sites
                  </Link>
                }
              />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <CommandPalette open={commandsOpen} onOpenChange={setCommandsOpen} />
    </div>
  );
}
