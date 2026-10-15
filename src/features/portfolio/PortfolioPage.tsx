import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, Building2, MapPin, Plus, Power } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { SiteResponseDto } from '@/api/generated/models';
import { queryKeys } from '@/api/client/query-keys';
import { useSessionStore } from '@/core/auth/session-store';
import { clearActiveSiteContext } from '@/core/auth/session-actions';
import { hasPermission } from '@/core/permissions/permissions';
import { notifyError } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { ConfirmDialog } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { useActiveSite, useSites } from './hooks/useSites';
import { useDashboardSummaries } from '@/features/supervision/hooks/useReports';
import { deactivateSite, reactivateSite } from './api/sites-api';

type SiteFilter = 'active' | 'inactive' | 'all';

export function PortfolioPage() {
  const { t: __t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useSessionStore((state) => state.user);
  const { activeSiteId, activate } = useActiveSite();
  const canViewSummary = hasPermission(user, 'report_view');
  const canCreate = hasPermission(user, 'site_create');
  const canDeactivate = hasPermission(user, 'site_delete');
  const canReactivate = hasPermission(user, 'site_edit');
  const canManageSiteState = canDeactivate || canReactivate;
  const sites = useSites('portfolio', true, canManageSiteState);
  const [filter, setFilter] = useState<SiteFilter>('active');
  const [selectedSite, setSelectedSite] = useState<SiteResponseDto>();
  const [pending, setPending] = useState(false);
  const allowed =
    sites.data?.data.items.filter(
      (site) => user?.scope.isGlobal || user?.scope.siteIds.includes(site.siteId),
    ) ?? [];
  const activeSites = allowed.filter((site) => site.isActive);
  const inactiveSites = allowed.filter((site) => !site.isActive);
  const displayedSites = canManageSiteState
    ? allowed.filter((site) =>
        filter === 'all' ? true : filter === 'active' ? site.isActive : !site.isActive,
      )
    : activeSites;
  const summarySiteIds = activeSites.map((site) => site.siteId);
  const summaries = useDashboardSummaries(summarySiteIds, canViewSummary);
  const summariesBySite = new Map(
    summarySiteIds.map((siteId, index) => [siteId, summaries[index]?.data]),
  );
  const changeSiteState = async () => {
    if (!selectedSite) return;
    const activating = !selectedSite.isActive;
    setPending(true);
    try {
      if (activating) await reactivateSite(selectedSite.siteId);
      else await deactivateSite(selectedSite.siteId);
      if (!activating && selectedSite.siteId === activeSiteId) {
        await clearActiveSiteContext(queryClient);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sites.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.queues.all }),
      ]);
      notify({
        tone: 'success',
        title: activating ? __t('portfolio.siteReactivated') : __t('portfolio.siteDeactivated'),
        message: selectedSite.siteName,
      });
      setSelectedSite(undefined);
    } catch (error) {
      notifyError(error);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="page-stack portfolio-page">
      <PageHeader
        eyebrow={__t('nav.portfolio')}
        title={__t('portfolio.portfolio.portefeuilleDeSites')}
        description={__t('portfolio.portfolio.selectionnezLeSiteSurLequelVousSouhaitezT')}
        actions={
          canCreate ? (
            <Link className="button button-primary" to="/onboarding">
              <Plus aria-hidden="true" /> {__t('portfolio.createSite')}
            </Link>
          ) : null
        }
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
      {canManageSiteState ? (
        <Card className="portfolio-filter-card">
          <div>
            <strong>{__t('portfolio.displaySites')}</strong>
            <small>{__t('portfolio.displaySitesHint')}</small>
          </div>
          <div
            className="portfolio-status-filter"
            role="group"
            aria-label={__t('portfolio.displaySites')}
          >
            {(
              [
                ['active', __t('portfolio.activeSites'), activeSites.length],
                ['inactive', __t('portfolio.inactiveSites'), inactiveSites.length],
                ['all', __t('portfolio.allSites'), allowed.length],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? 'is-active' : ''}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                }}
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      {sites.isError ? (
        <ErrorState
          onRetry={() => {
            void sites.refetch();
          }}
        />
      ) : null}
      {sites.isSuccess && displayedSites.length === 0 ? (
        <EmptyState
          title={
            canManageSiteState && filter === 'inactive'
              ? __t('portfolio.noInactiveSites')
              : __t('portfolio.portfolio.aucunSiteAutorise')
          }
        />
      ) : null}
      <div className="site-grid">
        {displayedSites.map((site) => (
          <Card
            key={site.siteId}
            className={`${site.siteId === activeSiteId ? 'site-card site-card-active' : 'site-card'}${site.isActive ? '' : ' site-card-inactive'}${site.isActive && canDeactivate ? ' site-card-has-deactivate' : ''}`}
          >
            {site.isActive && canDeactivate ? (
              <button
                className="button button-small site-deactivate-button"
                type="button"
                title={__t('portfolio.deactivateSite')}
                aria-label={__t('portfolio.deactivateSiteNamed', { site: site.siteName })}
                onClick={() => {
                  setSelectedSite(site);
                }}
              >
                <Archive aria-hidden="true" />
                <span>{__t('portfolio.deactivateSite')}</span>
              </button>
            ) : null}
            <div className="site-card-heading">
              <div className="site-card-statuses">
                <span
                  className={`status-badge ${site.isActive ? 'status-success' : 'status-warning'}`}
                >
                  {site.isActive ? __t('common.active') : __t('common.inactive')}
                </span>
                {site.siteId === activeSiteId ? (
                  <span className="status-badge status-info">
                    {__t('portfolio.currentContext')}
                  </span>
                ) : null}
              </div>
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
            {canViewSummary && summariesBySite.get(site.siteId) ? (
              <div
                className="site-summary"
                aria-label={__t('portfolio.siteSummary', { site: site.siteName })}
              >
                <span>
                  {summariesBySite.get(site.siteId)?.data.waitingTotal} {__t('common.enAttente')}
                </span>
                <span>
                  {summariesBySite.get(site.siteId)?.data.activeQueues}{' '}
                  {__t('portfolio.portfolio.filesActives')}
                </span>
                <span>
                  {summariesBySite.get(site.siteId)?.data.appointmentsToday}{' '}
                  {__t('portfolio.portfolio.rdvAujourdHui')}
                </span>
              </div>
            ) : null}
            <div className="site-card-actions">
              {user && site.isActive && allowed.length > 1 ? (
                <button
                  className={site.siteId === activeSiteId ? 'button button-primary' : 'button'}
                  type="button"
                  disabled={site.siteId === activeSiteId}
                  onClick={() => void activate(site.siteId, user.scope)}
                >
                  <MapPin aria-hidden="true" />
                  {site.siteId === activeSiteId
                    ? __t('portfolio.currentContext')
                    : __t('portfolio.workOnSite')}
                </button>
              ) : null}
              {!site.isActive && canReactivate ? (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => {
                    setSelectedSite(site);
                  }}
                >
                  <Power aria-hidden="true" /> {__t('portfolio.reactivateSite')}
                </button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(selectedSite)}
        onOpenChange={(open) => {
          if (!open && !pending) setSelectedSite(undefined);
        }}
        title={
          selectedSite?.isActive ? __t('portfolio.deactivateSite') : __t('portfolio.reactivateSite')
        }
        description={
          selectedSite?.isActive
            ? __t('portfolio.deactivateWarning', { site: selectedSite.siteName })
            : __t('portfolio.reactivateWarning', { site: selectedSite?.siteName })
        }
        confirmLabel={
          selectedSite?.isActive
            ? __t('portfolio.confirmDeactivate')
            : __t('portfolio.confirmReactivate')
        }
        destructive={selectedSite?.isActive}
        onConfirm={() => void changeSiteState()}
      />
    </div>
  );
}
