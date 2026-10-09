import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  reportsControllerGetDailyQueueReport,
  reportsControllerGetDashboardSummary,
} from '@/api/generated/reports/reports';
import { queuesControllerFindAll } from '@/api/generated/queues/queues';
import { sitesControllerFindSite } from '@/api/generated/sites/sites';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { aggregateReports, reportsToCsv } from './report-utils';
import { dateInTimeZone } from '@/features/appointments/appointment-rules';

const fallbackTimeZone = 'UTC';

export function ReportsPage() {
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [date, setDate] = React.useState('');
  const site = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => sitesControllerFindSite(siteId ?? 0),
    enabled: Boolean(siteId),
  });
  const effectiveDate = date || dateInTimeZone(site.data?.data.timezone ?? fallbackTimeZone);
  const queues = useQuery({
    queryKey: ['queues', 'reports', siteId],
    queryFn: () =>
      queuesControllerFindAll({
        page: 1,
        pageSize: 100,
        siteId: siteId ?? undefined,
        isActive: true,
      }),
  });
  const summary = useQuery({
    queryKey: ['reports', 'summary', siteId],
    queryFn: () => reportsControllerGetDashboardSummary({ siteId: siteId ?? undefined }),
  });
  const reports = useQuery({
    queryKey: [
      'reports',
      'daily',
      siteId,
      effectiveDate,
      queues.data?.data.items.map((queue) => queue.queueId),
    ],
    enabled: Boolean(queues.data),
    queryFn: () =>
      Promise.all(
        (queues.data?.data.items ?? []).map((queue) =>
          reportsControllerGetDailyQueueReport(queue.queueId, { date: effectiveDate }).then(
            (response) => response.data,
          ),
        ),
      ),
  });
  const items = reports.data ?? [];
  const totals = aggregateReports(items);
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([reportsToCsv(items)], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `dori-rapport-${effectiveDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  if (queues.isError || summary.isError || reports.isError)
    return (
      <ErrorState
        onRetry={() => void Promise.all([queues.refetch(), summary.refetch(), reports.refetch()])}
      />
    );
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Pilotage"
        title={__t('ui.supervision.reports_page.rapports_14c3yxg')}
        description={__t(
          'ui.supervision.reports_page.indicateurs_calcules_exclusivement_a_partir_des__m4wt8a',
        )}
        actions={
          <button type="button" className="button" disabled={!items.length} onClick={exportCsv}>
            {__t('ui.supervision.reports_page.exporter_csv_local_17y7htf')}
          </button>
        }
      />
      <Card>
        <div className="filter-row">
          <label>
            {__t('ui.supervision.reports_page.date_ggjuyh')}
            <input
              type="date"
              value={effectiveDate}
              onChange={(event) => {
                setDate(event.target.value);
              }}
            />
          </label>
          <span className="muted">
            {__t('ui.supervision.reports_page.perimetre_7st5rt')}
            {siteId
              ? __t('ui.expression.supervision.reports_page.site_value0_1junx4d', {
                  value0: String(siteId),
                })
              : __t('ui.expression.supervision.reports_page.tous_les_sites_autorises_26s89r')}
          </span>
        </div>
      </Card>
      <div className="metric-grid">
        {[
          ['Sites actifs', summary.data?.data.activeSites],
          ['Files actives', summary.data?.data.activeQueues],
          ['En attente', summary.data?.data.waitingTotal],
          ['Inscrits', totals.registered],
          ['Servis', totals.served],
          ['TMA', `${totals.averageWaitMinutes.toFixed(1)} min`],
          ['TMT', `${totals.averageServiceMinutes.toFixed(1)} min`],
          ['No-show', `${(totals.noShowRate * 100).toFixed(1)} %`],
        ].map(([label, value]) => (
          <Card key={label}>
            <span className="metric-label">{label}</span>
            <strong className="metric-value">{value ?? '—'}</strong>
          </Card>
        ))}
      </div>
      {!reports.isLoading && !items.length ? (
        <EmptyState
          title={__t('ui.supervision.reports_page.aucune_donnee_pour_cette_date_10z1svu')}
        />
      ) : (
        <Card>
          <h2>{__t('ui.supervision.reports_page.performance_par_file_r9y7ow')}</h2>
          <DataTable
            caption={__t('ui.supervision.reports_page.rapports_quotidiens_par_file_zpefzk')}
            rows={items}
            getRowKey={(row) => row.queueId}
            columns={[
              {
                key: 'queue',
                header: 'File',
                render: (row) => (
                  <>
                    <strong>{row.queueName}</strong>
                    <br />
                    <span className="muted">{row.siteName}</span>
                  </>
                ),
              },
              {
                key: 'registered',
                header: 'Inscrits',
                align: 'end',
                render: (row) => row.volume.totalRegistered,
              },
              {
                key: 'served',
                header: 'Servis',
                align: 'end',
                render: (row) => row.volume.totalServed,
              },
              {
                key: 'wait',
                header: 'TMA',
                align: 'end',
                render: (row) => `${row.kpis.averageWaitMinutes.toFixed(1)} min`,
              },
              {
                key: 'service',
                header: 'TMT',
                align: 'end',
                render: (row) => `${row.kpis.averageServiceMinutes.toFixed(1)} min`,
              },
              {
                key: 'noShow',
                header: 'No-show',
                align: 'end',
                render: (row) => `${(row.kpis.noShowRate * 100).toFixed(1)} %`,
              },
              {
                key: 'chart',
                header: 'Flux servi',
                render: (row) => (
                  <div
                    className="report-bar"
                    aria-label={`${String(row.volume.totalServed)} servis sur ${String(row.volume.totalRegistered)}`}
                  >
                    <span
                      style={{
                        width: `${String(row.volume.totalRegistered ? (row.volume.totalServed / row.volume.totalRegistered) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}

import React from 'react';
