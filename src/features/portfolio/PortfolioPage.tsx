import { useTranslation } from 'react-i18next';
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
        eyebrow="Organisation"
        title={__t('ui.portfolio.portfolio_page.portefeuille_de_sites_13kj62k')}
        description={__t(
          'ui.portfolio.portfolio_page.selectionnez_le_site_sur_lequel_vous_souhaitez_t_1pmhaen',
        )}
      />
      <div className="metrics-grid">
        <MetricCard
          label={__t('ui.portfolio.portfolio_page.sites_autorises_kxxnqk')}
          value={allowed.length}
        />
        <MetricCard
          label={__t('ui.portfolio.portfolio_page.contexte_actif_1hf5mac')}
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
        <EmptyState title={__t('ui.portfolio.portfolio_page.aucun_site_autorise_yhfs0w')} />
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
                  ? __t('ui.expression.portfolio.portfolio_page.site_actif_uvd9tt')
                  : __t('ui.expression.portfolio.portfolio_page.disponible_lmh7q8')}
              </span>
              <h2>{site.siteName}</h2>
              <p>{site.siteLocation ?? site.timezone}</p>
            </div>
            <dl className="detail-list">
              <div>
                <dt>{__t('ui.portfolio.portfolio_page.devise_1pl1r6r')}</dt>
                <dd>{site.defaultCurrency}</dd>
              </div>
              <div>
                <dt>{__t('ui.portfolio.portfolio_page.locale_1pfta5z')}</dt>
                <dd>{site.defaultLocale}</dd>
              </div>
              <div>
                <dt>{__t('ui.portfolio.portfolio_page.etat_525179')}</dt>
                <dd>
                  {site.isActive
                    ? __t('ui.expression.portfolio.portfolio_page.actif_1410gao')
                    : __t('ui.expression.portfolio.portfolio_page.inactif_11hqnbx')}
                </dd>
              </div>
            </dl>
            {canViewSummary && summaries[index]?.data ? (
              <div className="site-summary" aria-label={`Synthese ${site.siteName}`}>
                <span>
                  {summaries[index].data.data.waitingTotal}{' '}
                  {__t('ui.portfolio.portfolio_page.en_attente_1fzxwnp')}
                </span>
                <span>
                  {summaries[index].data.data.activeQueues}{' '}
                  {__t('ui.portfolio.portfolio_page.files_actives_nqxf9n')}
                </span>
                <span>
                  {summaries[index].data.data.appointmentsToday}{' '}
                  {__t('ui.portfolio.portfolio_page.rdv_aujourd_hui_xbfs44')}
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
                  ? __t('ui.expression.portfolio.portfolio_page.continuer_sur_ce_site_1iqwc3')
                  : __t('ui.expression.portfolio.portfolio_page.activer_ce_site_7ymtes')}
              </button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
