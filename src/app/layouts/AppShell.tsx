import { MOBILE_QUERY } from '@/shared/useMediaQuery';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { clearSession } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { CommandPalette } from './CommandPalette';
import { SidebarAccordion } from './SidebarAccordion';
import { Topbar } from './Topbar';
import { MobileNavigation } from './MobileNavigation';
import { EmptyState } from '@/design-system/components/FeedbackState';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { useActiveSite, useSite, useSites } from '@/features/portfolio/hooks/useSites';
import { routeRequiresActiveSite } from './site-context-rules';
import { storageKeys } from '@/core/storage/storage-keys';
import { useScopeStore } from '@/core/scope/scope-store';
import { Button } from '@/design-system/components/Button';
import { IntraDeploymentStatusBanner } from '@/features/edge-installations/IntraDeploymentStatusBanner';

const sidebarPreferenceKey = storageKeys.session.sidebarCollapsed;

function mediaMatches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const { activeSiteId, activate } = useActiveSite();
  const location = useLocation();
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => sessionStorage.getItem(sidebarPreferenceKey) === 'true',
  );
  const [mediumViewport, setMediumViewport] = useState(() =>
    mediaMatches('(min-width: 621px) and (max-width: 900px)'),
  );
  const [mobileViewport, setMobileViewport] = useState(() => mediaMatches(MOBILE_QUERY));
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const closeMobileNavigation = useCallback(() => {
    setMobileNavigationOpen(false);
  }, []);
  const [pageHeaderVisible, setPageHeaderVisible] = useState(false);
  const [pageTitle, setPageTitle] = useState<string>();
  const appContentRef = useRef<HTMLElement>(null);
  const activeSitesQuery = useSites('context-switcher');
  const accessibleSitesQuery = useSites('portfolio', true, true);
  const activeSiteQuery = useSite(activeSiteId);
  const accessibleSites = useMemo(() => {
    const items = accessibleSitesQuery.data?.data.items ?? [];
    return items.filter(
      (site) => user?.scope.isGlobal || user?.scope.siteIds.includes(site.siteId),
    );
  }, [accessibleSitesQuery.data, user]);
  const activeAccessibleSites = useMemo(() => {
    const items = activeSitesQuery.data?.data.items ?? [];
    return items.filter(
      (site) => user?.scope.isGlobal || user?.scope.siteIds.includes(site.siteId),
    );
  }, [activeSitesQuery.data, user]);
  const sites = useMemo(() => {
    const scoped = activeAccessibleSites.map((site) => ({
      id: site.siteId,
      name: site.siteName,
    }));
    const active = activeSiteQuery.data?.data;
    return active && !scoped.some((site) => site.id === active.siteId)
      ? [{ id: active.siteId, name: active.siteName }, ...scoped]
      : scoped;
  }, [activeAccessibleSites, activeSiteQuery.data]);
  useEffect(() => {
    const onlySite = activeAccessibleSites.length === 1 ? activeAccessibleSites[0] : undefined;
    if (!user || activeSiteId !== null || !onlySite) return;
    useScopeStore.getState().setActiveSite(onlySite.siteId, user.scope);
    void activate(onlySite.siteId, user.scope);
  }, [activate, activeAccessibleSites, activeSiteId, user]);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mediumQuery = window.matchMedia('(min-width: 621px) and (max-width: 900px)');
    const mobileQuery = window.matchMedia(MOBILE_QUERY);
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
  useEffect(() => {
    const content = appContentRef.current;
    if (!content || typeof IntersectionObserver !== 'function') return;

    let observedHeader: Element | null = null;
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        setPageHeaderVisible(Boolean(entry?.isIntersecting));
      },
      { rootMargin: '-74px 0px 0px' },
    );
    const observePageHeader = () => {
      const pageHeader = content.querySelector('.page-header');
      const nextTitle = pageHeader?.querySelector('h1')?.textContent.trim();
      setPageTitle(nextTitle || undefined);
      if (pageHeader !== observedHeader) {
        visibilityObserver.disconnect();
        observedHeader = pageHeader;
        setPageHeaderVisible(Boolean(pageHeader));
        if (pageHeader) visibilityObserver.observe(pageHeader);
      }
    };
    const contentObserver = new MutationObserver(observePageHeader);

    observePageHeader();
    contentObserver.observe(content, { childList: true, subtree: true, characterData: true });
    return () => {
      contentObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [location.pathname]);
  const requiresSite = routeRequiresActiveSite(location.pathname);
  const effectiveSidebarCollapsed = mobileViewport ? false : mediumViewport || sidebarCollapsed;

  return (
    <div className={`app-shell${effectiveSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <SidebarAccordion
        portfolioAvailable={accessibleSites.length > 1}
        collapsed={effectiveSidebarCollapsed}
        mobileOpen={mobileNavigationOpen}
        onToggleCollapsed={() => {
          setSidebarCollapsed((current) => {
            const next = !current;
            sessionStorage.setItem(sidebarPreferenceKey, String(next));
            return next;
          });
        }}
        onCloseMobile={closeMobileNavigation}
      />
      {mobileNavigationOpen ? (
        <Button
          variant="unstyled"
          className="sidebar-backdrop"
          type="button"
          aria-label={t('common.fermerLeMenu')}
          onClick={() => {
            setMobileNavigationOpen(false);
          }}
        />
      ) : null}
      <div className="app-column">
        <Topbar
          sites={sites}
          activeSiteId={activeSiteId}
          pageHeaderVisible={pageHeaderVisible}
          pageTitle={pageTitle}
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
        <IntraDeploymentStatusBanner />
        <main ref={appContentRef} className="app-content">
          <AppErrorBoundary variant="embedded" resetKey={location.pathname}>
            {requiresSite && activeSiteId === null && !activeSiteQuery.isLoading ? (
              <div className="site-required-card">
                <EmptyState
                  title={t('shell.layouts.appShell.choisissezUnSiteActif')}
                  description={t(
                    'shell.layouts.appShell.selectionnezLeSiteSurLequelVousSouhaitezT',
                  )}
                  action={
                    <Link className="button button-primary" to="/portfolio">
                      {t('shell.layouts.appShell.ouvrirLePortefeuilleDeSites')}
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
      <MobileNavigation
        open={mobileNavigationOpen}
        onMore={() => {
          setMobileNavigationOpen(true);
        }}
      />
      <CommandPalette open={commandsOpen} onOpenChange={setCommandsOpen} />
    </div>
  );
}
