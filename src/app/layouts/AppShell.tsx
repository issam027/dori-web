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
import { AppErrorBoundary } from '@/app/AppErrorBoundary';

const sidebarPreferenceKey = 'dori.sidebar.collapsed';

function mediaMatches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t: __t } = useTranslation();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const location = useLocation();
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => sessionStorage.getItem(sidebarPreferenceKey) === 'true',
  );
  const [mediumViewport, setMediumViewport] = useState(() =>
    mediaMatches('(min-width: 621px) and (max-width: 900px)'),
  );
  const [mobileViewport, setMobileViewport] = useState(() => mediaMatches('(max-width: 620px)'));
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
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
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mediumQuery = window.matchMedia('(min-width: 621px) and (max-width: 900px)');
    const mobileQuery = window.matchMedia('(max-width: 620px)');
    const synchronize = () => {
      setMediumViewport(mediumQuery.matches);
      setMobileViewport(mobileQuery.matches);
      if (!mobileQuery.matches) setMobileNavigationOpen(false);
    };
    mediumQuery.addEventListener('change', synchronize);
    mobileQuery.addEventListener('change', synchronize);
    return () => {
      mediumQuery.removeEventListener('change', synchronize);
      mobileQuery.removeEventListener('change', synchronize);
    };
  }, []);
  const requiresSite = !['/portfolio', '/profile', '/change-password'].includes(location.pathname);
  const effectiveSidebarCollapsed = mobileViewport ? false : mediumViewport || sidebarCollapsed;

  return (
    <div className={`app-shell${effectiveSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <SidebarAccordion
        siteCount={sites.length}
        collapsed={effectiveSidebarCollapsed}
        mobileOpen={mobileNavigationOpen}
        onToggleCollapsed={() => {
          setSidebarCollapsed((current) => {
            const next = !current;
            sessionStorage.setItem(sidebarPreferenceKey, String(next));
            return next;
          });
        }}
        onCloseMobile={() => {
          setMobileNavigationOpen(false);
        }}
      />
      {mobileNavigationOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label={__t('ui.shell.layouts.app_shell.fermer_le_menu_1fo6hqo')}
          onClick={() => {
            setMobileNavigationOpen(false);
          }}
        />
      ) : null}
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
          onOpenNavigation={() => {
            setMobileNavigationOpen(true);
          }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void queryClient.invalidateQueries({ refetchType: 'active' }).finally(() => {
              setRefreshing(false);
            });
          }}
        />
        <main className="app-content">
          <AppErrorBoundary variant="embedded" resetKey={location.pathname}>
            {requiresSite && activeSiteId === null && !sitesQuery.isLoading ? (
              <div className="site-required-card">
                <EmptyState
                  title={__t('ui.shell.layouts.app_shell.choisissez_un_site_actif_w5t05i')}
                  description={__t(
                    'ui.shell.layouts.app_shell.selectionnez_le_site_sur_lequel_vous_souhaitez_t_umf4sj',
                  )}
                  action={
                    <Link className="button button-primary" to="/portfolio">
                      {__t('ui.shell.layouts.app_shell.ouvrir_le_portefeuille_de_sites_1jrlgpe')}
                    </Link>
                  }
                />
              </div>
            ) : (
              children
            )}
          </AppErrorBoundary>
        </main>
      </div>
      <CommandPalette open={commandsOpen} onOpenChange={setCommandsOpen} />
    </div>
  );
}
