import { useQuery } from '@tanstack/react-query';
import {
  reportsControllerGetDailyQueueReport,
  reportsControllerGetDashboardSummary,
} from '@/api/generated/reports/reports';
import { queuesControllerFindAll } from '@/api/generated/queues/queues';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { aggregateReports, reportsToCsv } from './report-utils';

const today = () => new Date().toISOString().slice(0, 10);

export function ReportsPage() {
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [date, setDate] = React.useState(today());
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
      date,
      queues.data?.data.items.map((queue) => queue.queueId),
    ],
    enabled: Boolean(queues.data),
    queryFn: () =>
      Promise.all(
        (queues.data?.data.items ?? []).map((queue) =>
          reportsControllerGetDailyQueueReport(queue.queueId, { date }).then(
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
    link.download = `dori-rapport-${date}.csv`;
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
        title="Rapports"
        description="Indicateurs calculés exclusivement à partir des rapports retournés par l’API."
        actions={
          <button type="button" className="button" disabled={!items.length} onClick={exportCsv}>
            Exporter CSV local
          </button>
        }
      />
      <Card>
        <div className="filter-row">
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
              }}
            />
          </label>
          <span className="muted">
            Périmètre : {siteId ? `site ${String(siteId)}` : 'tous les sites autorisés'}
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
        <EmptyState title="Aucune donnée pour cette date" />
      ) : (
        <Card>
          <h2>Performance par file</h2>
          <DataTable
            caption="Rapports quotidiens par file"
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
