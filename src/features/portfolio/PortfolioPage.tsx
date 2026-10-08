import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsControllerGetDashboardSummary } from '@/api/generated/reports/reports';
import { sitesControllerFindSites } from '@/api/generated/sites/sites';
import { changeActiveSite } from '@/core/auth/session-actions';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';

export function PortfolioPage() {
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const activeSiteId = useScopeStore((state) => state.activeSiteId);
  const sites = useQuery({
    queryKey: ['sites', 'portfolio'],
    queryFn: () => sitesControllerFindSites({ page: 1, pageSize: 100 }),
  });
  const allowed =
    sites.data?.data.items.filter(
      (site) => user?.scope.isGlobal || user?.scope.siteIds.includes(site.siteId),
    ) ?? [];
  const canViewSummary = hasPermission(user, 'report_view');
  const summaries = useQueries({
    queries: allowed.map((site) => ({
      queryKey: ['reports', 'dashboard-summary', site.siteId],
      queryFn: () => reportsControllerGetDashboardSummary({ siteId: site.siteId }),
      enabled: canViewSummary,
    })),
  });
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Organisation"
        title="Portefeuille de sites"
        description="Sélectionnez le site sur lequel vous souhaitez travailler."
      />
      <div className="metrics-grid">
        <MetricCard label="Sites autorisés" value={allowed.length} />
        <MetricCard
          label="Contexte actif"
          value={allowed.find((site) => site.siteId === activeSiteId)?.siteName ?? '—'}
        />
      </div>
      {sites.isError ? (
        <ErrorState
          onRetry={() => {
            void sites.refetch();
          }}
        />
      ) : null}
      {sites.isSuccess && allowed.length === 0 ? <EmptyState title="Aucun site autorisé" /> : null}
      <div className="site-grid">
        {allowed.map((site, index) => (
          <Card
            key={site.siteId}
            className={site.siteId === activeSiteId ? 'site-card site-card-active' : 'site-card'}
          >
            <div>
              <p className="eyebrow">{site.siteType}</p>
              <h2>{site.siteName}</h2>
              <p>{site.siteLocation ?? site.timezone}</p>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Devise</dt>
                <dd>{site.defaultCurrency}</dd>
              </div>
              <div>
                <dt>Locale</dt>
                <dd>{site.defaultLocale}</dd>
              </div>
              <div>
                <dt>État</dt>
                <dd>{site.isActive ? 'Actif' : 'Inactif'}</dd>
              </div>
            </dl>
            {canViewSummary && summaries[index]?.data ? (
              <div className="site-summary" aria-label={`Synthese ${site.siteName}`}>
                <span>{summaries[index].data.data.waitingTotal} en attente</span>
                <span>{summaries[index].data.data.activeQueues} files actives</span>
                <span>{summaries[index].data.data.appointmentsToday} RDV aujourd'hui</span>
              </div>
            ) : null}
            {user && user.scope.siteIds.length > 1 ? (
              <button
                className="button button-primary"
                type="button"
                disabled={site.siteId === activeSiteId}
                onClick={() => {
                  void changeActiveSite(queryClient, site.siteId, user.scope);
                }}
              >
                {site.siteId === activeSiteId ? 'Site actif' : 'Activer ce site'}
              </button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
