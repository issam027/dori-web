import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
import {
  addDays,
  aggregateReports,
  aggregateReportsByQueue,
  reportPeriodDates,
  reportsToCsv,
} from './report-utils';
import { dateInTimeZone } from '@/features/appointments/appointment-rules';

const fallbackTimeZone = 'UTC';

export function ReportsPage() {
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const site = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => sitesControllerFindSite(siteId ?? 0),
    enabled: Boolean(siteId),
  });
  const today = dateInTimeZone(site.data?.data.timezone ?? fallbackTimeZone);
  const effectiveEndDate = endDate || today;
  const effectiveStartDate = startDate || addDays(effectiveEndDate, -6);
  const periodDates = reportPeriodDates(effectiveStartDate, effectiveEndDate);
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
      effectiveStartDate,
      effectiveEndDate,
      queues.data?.data.items.map((queue) => queue.queueId),
    ],
    enabled: Boolean(queues.data && periodDates.length),
    queryFn: () =>
      Promise.all(
        periodDates.flatMap((businessDate) =>
          (queues.data?.data.items ?? []).map((queue) =>
            reportsControllerGetDailyQueueReport(queue.queueId, { date: businessDate }).then(
              (response) => response.data,
            ),
          ),
        ),
      ),
  });
  const items = reports.data ?? [];
  const queueItems = aggregateReportsByQueue(items);
  const totals = aggregateReports(items);
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([reportsToCsv(items)], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `dori-rapport-${effectiveStartDate}-${effectiveEndDate}.csv`;
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
          'reports.periodDescription',
        )}
        actions={
          <button type="button" className="button" disabled={!items.length} onClick={exportCsv}>
            {__t('ui.supervision.reports_page.exporter_csv_local_17y7htf')}
          </button>
        }
      />
      <Card>
        <div className="report-period-filter">
          <label>
            {__t('reports.startDate')}
            <input
              type="date"
              value={effectiveStartDate}
              max={effectiveEndDate}
              onChange={(event) => {
                const nextStart = event.target.value;
                setStartDate(nextStart);
                if (!nextStart) return;
                if (effectiveEndDate < nextStart) setEndDate(nextStart);
                else if (effectiveEndDate > addDays(nextStart, 6))
                  setEndDate(addDays(nextStart, 6));
              }}
            />
          </label>
          <label>
            {__t('reports.endDate')}
            <input
              type="date"
              value={effectiveEndDate}
              min={effectiveStartDate}
              max={addDays(effectiveStartDate, 6) < today ? addDays(effectiveStartDate, 6) : today}
              onChange={(event) => {
                setEndDate(event.target.value);
              }}
            />
          </label>
          <div className="report-period-context">
            <strong>{__t('reports.maximumPeriod')}</strong>
          </div>
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
          title={__t('reports.noDataForPeriod')}
        />
      ) : (
        <Card>
          <h2>{__t('ui.supervision.reports_page.performance_par_file_r9y7ow')}</h2>
          <DataTable
            caption={__t('reports.periodReportByQueue')}
            rows={queueItems}
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
