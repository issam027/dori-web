import { useTranslation } from 'react-i18next';
import { Building2, MapPin } from 'lucide-react';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { Card, MetricCard } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { useActiveSite, useSites } from './hooks/useSites';
import { useDashboardSummaries } from '@/features/supervision/hooks/useReports';

export function PortfolioPage() {
  const { t: __t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const { activeSiteId, activate } = useActiveSite();
  const sites = useSites('portfolio');
  const allowed =
    sites.data?.data.items.filter(
      (site) => user?.scope.isGlobal || user?.scope.siteIds.includes(site.siteId),
    ) ?? [];
  const canViewSummary = hasPermission(user, 'report_view');
  const summaries = useDashboardSummaries(
    allowed.map((site) => site.siteId),
    canViewSummary,
  );
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={__t('nav.portfolio')}
        title={__t('portfolio.portfolio.portefeuilleDeSites')}
        description={__t('portfolio.portfolio.selectionnezLeSiteSurLequelVousSouhaitezT')}
      />
      <div className="metrics-grid">
        <MetricCard
          label={__t('portfolio.portfolio.sitesAutorises')}
          value={allowed.length}
          icon={<Building2 />}
        />
        <MetricCard
          label={__t('portfolio.portfolio.contexteActif')}
          icon={<MapPin />}
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
      {sites.isSuccess && allowed.length === 0 ? (
        <EmptyState title={__t('portfolio.portfolio.aucunSiteAutorise')} />
      ) : null}
      <div className="site-grid">
        {allowed.map((site, index) => (
          <Card
            key={site.siteId}
            className={site.siteId === activeSiteId ? 'site-card site-card-active' : 'site-card'}
          >
            <div className="site-card-heading">
              <span
                className={
                  site.siteId === activeSiteId ? 'status-badge status-success' : 'status-badge'
                }
              >
                {site.siteId === activeSiteId
                  ? __t('common.siteActif')
                  : __t('portfolio.portfolio.disponible')}
              </span>
              <h2>{site.siteName}</h2>
              <p>{site.siteLocation ?? site.timezone}</p>
            </div>
            <dl className="detail-list">
              <div>
                <dt>{__t('common.devise')}</dt>
                <dd>{site.defaultCurrency}</dd>
              </div>
              <div>
                <dt>{__t('common.locale')}</dt>
                <dd>{site.defaultLocale}</dd>
              </div>
              <div>
                <dt>{__t('common.etat')}</dt>
                <dd>{site.isActive ? __t('common.active') : __t('common.inactive')}</dd>
              </div>
            </dl>
            {canViewSummary && summaries[index]?.data ? (
              <div
                className="site-summary"
                aria-label={__t('portfolio.siteSummary', { site: site.siteName })}
              >
                <span>
                  {summaries[index].data.data.waitingTotal} {__t('common.enAttente')}
                </span>
                <span>
                  {summaries[index].data.data.activeQueues}{' '}
                  {__t('portfolio.portfolio.filesActives')}
                </span>
                <span>
                  {summaries[index].data.data.appointmentsToday}{' '}
                  {__t('portfolio.portfolio.rdvAujourdHui')}
                </span>
              </div>
            ) : null}
            {user && allowed.length > 1 ? (
              <button
                className={
                  site.siteId === activeSiteId
                    ? 'button button-primary site-select-button'
                    : 'button site-select-button'
                }
                type="button"
                onClick={() => {
                  if (site.siteId !== activeSiteId) {
                    void activate(site.siteId, user.scope);
                  }
                }}
              >
                {site.siteId === activeSiteId
                  ? __t('portfolio.portfolio.continuerSurCeSite')
                  : __t('portfolio.portfolio.activerCeSite')}
              </button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
