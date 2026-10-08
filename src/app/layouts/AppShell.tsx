import { useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { clearSession, changeActiveSite } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { useScopeStore } from '@/core/scope/scope-store';
import { sitesControllerFindSites } from '@/api/generated/sites/sites';
import { CommandPalette } from './CommandPalette';
import { SidebarAccordion } from './SidebarAccordion';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
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

  return (
    <div className="app-shell">
      <SidebarAccordion />
      <div className="app-column">
        <Topbar
          sites={sites}
          activeSiteId={activeSiteId}
          onSiteChange={(siteId) => {
            if (user) void changeActiveSite(queryClient, siteId, user.scope);
          }}
          onLogout={() => {
            void clearSession(queryClient);
          }}
          onOpenCommands={() => {
            setCommandsOpen(true);
          }}
        />
        <main className="app-content">{children}</main>
      </div>
      <CommandPalette open={commandsOpen} onOpenChange={setCommandsOpen} />
    </div>
  );
}
