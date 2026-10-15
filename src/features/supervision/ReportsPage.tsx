import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  Building2,
  CircleCheck,
  Download,
  Gauge,
  ListChecks,
  Timer,
  UserPlus,
  UsersRound,
  UserX,
} from 'lucide-react';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import {
  addDays,
  groupsToQueueRows,
  reportPeriodDates,
  reportsToCsv,
} from './report-utils';
import { dateInTimeZone } from '@/features/appointments/appointment-rules';
import { useQueues } from '@/features/queues/hooks/useQueues';
import { useSite } from '@/features/portfolio/hooks/useSites';
import { useDashboardSummary, useReports } from './hooks/useReports';

const fallbackTimeZone = 'UTC';

export function ReportsPage() {
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const site = useSite(siteId);
  const today = dateInTimeZone(site.data?.data.timezone ?? fallbackTimeZone);
  const effectiveEndDate = endDate || today;
  const effectiveStartDate = startDate || addDays(effectiveEndDate, -6);
  const periodDates = reportPeriodDates(effectiveStartDate, effectiveEndDate);
  const queues = useQueues({ siteId, isActive: true, usage: 'reports' });
  const liveSummary = useDashboardSummary(siteId);
  const reports = useReports({
    siteId,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    enabled: Boolean(queues.data && periodDates.length),
  });
  const queueItems = groupsToQueueRows(
    reports.data?.data.groups ?? [],
    queues.data?.data.items ?? [],
  );
  const totals = reports.data?.data.summary;
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([reportsToCsv(queueItems)], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `dori-rapport-${effectiveStartDate}-${effectiveEndDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  if (queues.isError || liveSummary.isError || reports.isError)
    return (
      <ErrorState
        onRetry={() => void Promise.all([queues.refetch(), liveSummary.refetch(), reports.refetch()])}
      />
    );
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={__t('common.pilotage')}
        title={__t('supervision.reports.rapports')}
        description={__t('reports.periodDescription')}
        actions={
          <button type="button" className="button" disabled={!queueItems.length} onClick={exportCsv}>
            <Download aria-hidden="true" />
            {__t('supervision.reports.exporterCsvLocal')}
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
                else if (effectiveEndDate > addDays(nextStart, 365))
                  setEndDate(addDays(nextStart, 365));
              }}
            />
          </label>
          <label>
            {__t('reports.endDate')}
            <input
              type="date"
              value={effectiveEndDate}
              min={effectiveStartDate}
              max={addDays(effectiveStartDate, 365) < today ? addDays(effectiveStartDate, 365) : today}
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
          {
            label: __t('common.activeSites'),
            value: liveSummary.data?.data.activeSites,
            icon: Building2,
          },
          {
            label: __t('common.activeQueues'),
            value: liveSummary.data?.data.activeQueues,
            icon: ListChecks,
          },
          {
            label: __t('common.waiting'),
            value: liveSummary.data?.data.waitingTotal,
            icon: UsersRound,
          },
          { label: __t('common.registered'), value: totals?.volume.registered, icon: UserPlus },
          { label: __t('common.servedPlural'), value: totals?.volume.served, icon: CircleCheck },
          {
            label: __t('reports.averageWaitAbbreviation'),
            value: totals?.timing.averageWaitMinutes == null ? '—' : `${totals.timing.averageWaitMinutes.toFixed(1)} min`,
            icon: Timer,
          },
          {
            label: __t('reports.averageServiceAbbreviation'),
            value: totals?.timing.averageServiceMinutes == null ? '—' : `${totals.timing.averageServiceMinutes.toFixed(1)} min`,
            icon: Gauge,
          },
          {
            label: __t('common.noShow'),
            value: totals?.rates.noShowRate == null ? '—' : `${(totals.rates.noShowRate * 100).toFixed(1)} %`,
            icon: UserX,
          },
        ].map(({ label, value, icon: Icon }) => (
          <MetricCard key={label} label={label} value={value ?? '—'} icon={<Icon />} />
        ))}
      </div>
      {!reports.isLoading && !queueItems.length ? (
        <EmptyState title={__t('reports.noDataForPeriod')} />
      ) : (
        <Card>
          <h2>{__t('supervision.reports.performanceParFile')}</h2>
          <DataTable
            caption={__t('reports.periodReportByQueue')}
            rows={queueItems}
            getRowKey={(row) => row.queueId}
            columns={[
              {
                key: 'queue',
                header: __t('queues.singular'),
                render: (row) => (
                  <>
                    <strong>{row.queueName}</strong>
                    <br />
                    <span className="muted">{row.queueCode}</span>
                  </>
                ),
              },
              {
                key: 'registered',
                header: __t('common.registered'),
                align: 'end',
                render: (row) => row.volume.registered,
              },
              {
                key: 'served',
                header: __t('common.servedPlural'),
                align: 'end',
                render: (row) => row.volume.served,
              },
              {
                key: 'wait',
                header: __t('reports.averageWaitAbbreviation'),
                align: 'end',
                render: (row) => row.timing.averageWaitMinutes == null ? '—' : `${row.timing.averageWaitMinutes.toFixed(1)} min`,
              },
              {
                key: 'service',
                header: __t('reports.averageServiceAbbreviation'),
                align: 'end',
                render: (row) => row.timing.averageServiceMinutes == null ? '—' : `${row.timing.averageServiceMinutes.toFixed(1)} min`,
              },
              {
                key: 'noShow',
                header: __t('common.noShow'),
                align: 'end',
                render: (row) => row.rates.noShowRate == null ? '—' : `${(row.rates.noShowRate * 100).toFixed(1)} %`,
              },
              {
                key: 'chart',
                header: __t('reports.servedFlow'),
                render: (row) => (
                  <div
                    className="report-bar"
                    aria-label={__t('reports.servedRatio', {
                      served: String(row.volume.served),
                      registered: String(row.volume.registered),
                    })}
                  >
                    <span
                      style={{
                        width: `${String(row.volume.registered ? (row.volume.served / row.volume.registered) * 100 : 0)}%`,
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
