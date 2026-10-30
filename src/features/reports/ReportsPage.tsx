import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { CircleCheck, Download, Gauge, Timer, UserPlus, UserX } from 'lucide-react';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { PageHeader } from '@/design-system/components/PageHeader';
import { addDays, groupsToQueueRows, reportPeriodDates, reportsToCsv } from './report-utils';
import { dateInTimeZone } from '@/features/appointments/appointment-rules';
import { useQueues } from '@/features/queues/hooks/useQueues';
import { useSite } from '@/features/portfolio/hooks/useSites';
import { useReports } from './hooks/useReports';
import { ReportVisualizations } from './ReportVisualizations';
import { ReportAnalyticsSections } from './ReportAnalyticsSections';
import { formatReportNumber, formatReportPercent } from '@/core/i18n/number-format';
import { Button } from '@/design-system/components/Button';
import { DorifyLoader } from '@/design-system/components/DorifyLoader';
import { ResponsiveDetails } from '@/design-system/components/ResponsiveDetails';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { MOBILE_QUERY, useMediaQuery } from '@/shared/useMediaQuery';

const fallbackTimeZone = 'UTC';

export function ReportsPage() {
  const { t: __t, i18n } = useTranslation();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const number = (value: number) => formatReportNumber(value, i18n.language);
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [queueId, setQueueId] = useState<string>();
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const site = useSite(siteId);
  const today = dateInTimeZone(site.data?.data.timezone ?? fallbackTimeZone);
  const effectiveEndDate = endDate || today;
  const effectiveStartDate = startDate || addDays(effectiveEndDate, -6);
  const periodDates = reportPeriodDates(effectiveStartDate, effectiveEndDate);
  const queues = useQueues({ siteId, isActive: true, usage: 'reports' });
  const reports = useReports({
    siteId,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    queueId,
    granularity,
    timezone: site.data?.data.timezone ?? fallbackTimeZone,
    enabled: Boolean(queues.data && periodDates.length),
  });
  const queueItems = groupsToQueueRows(
    reports.data?.data.groups ?? [],
    queues.data?.data.items ?? [],
  );
  const totals = reports.data?.data.summary;
  const hasActivity = Boolean(
    totals &&
    totals.volume.registered +
      totals.volume.served +
      totals.volume.noShow +
      totals.volume.cancelled +
      totals.volume.expired >
      0,
  );
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([reportsToCsv(queueItems, reports.data?.data.buckets, totals)], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `dori-rapport-${effectiveStartDate}-${effectiveEndDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  if (queues.isError || reports.isError)
    return <ErrorState onRetry={() => void Promise.all([queues.refetch(), reports.refetch()])} />;
  return (
    <div className="page-stack reports-page">
      <PageHeader
        eyebrow={__t('common.pilotage')}
        title={__t('supervision.reports.rapports')}
        description={__t('reports.periodDescription')}
        actions={
          <Button
            variant="unstyled"
            type="button"
            className="button"
            disabled={!queueItems.length}
            unavailableReason={__t('common.noDataExport')}
            onClick={exportCsv}
          >
            <Download aria-hidden="true" />
            {__t('supervision.reports.exporterCsvLocal')}
          </Button>
        }
      />
      <Card>
        <ResponsiveDetails
          summary={
            <>
              <strong>{__t('mobile.period')}</strong>
              <span>
                {effectiveStartDate} – {effectiveEndDate} ·{' '}
                {queues.data?.data.items.find((queue) => queue.queueId === queueId)?.queueName ??
                  __t('common.all')}
              </span>
            </>
          }
        >
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
                max={
                  addDays(effectiveStartDate, 365) < today
                    ? addDays(effectiveStartDate, 365)
                    : today
                }
                onChange={(event) => {
                  setEndDate(event.target.value);
                }}
              />
            </label>
            <label>
              {__t('reports.granularity')}
              <select
                value={granularity}
                onChange={(event) => {
                  setGranularity(event.target.value as 'day' | 'week' | 'month');
                }}
              >
                <option value="day">{__t('reports.granularity.day')}</option>
                <option value="week">{__t('reports.granularity.week')}</option>
                <option value="month">{__t('reports.granularity.month')}</option>
              </select>
            </label>
            <label>
              {__t('queues.singular')}
              <select
                value={queueId ?? ''}
                onChange={(event) => {
                  setQueueId(event.target.value || undefined);
                }}
              >
                <option value="">{__t('common.all')}</option>
                {queues.data?.data.items.map((queue) => (
                  <option key={queue.queueId} value={queue.queueId}>
                    {queue.queueCode} · {queue.queueName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </ResponsiveDetails>
      </Card>
      {!reports.isLoading && !hasActivity ? (
        <EmptyState
          title={__t('reports.noDataForPeriod')}
          description={__t('reports.noDataForPeriodHint')}
        />
      ) : (
        <>
          <div className="metric-grid">
            {reports.isLoading ? (
              <Card>
                <DorifyLoader compact />
              </Card>
            ) : null}
            {!reports.isLoading ? (
              <>
                {[
                  {
                    label: __t('common.registered'),
                    value: totals?.volume.registered,
                    icon: UserPlus,
                  },
                  {
                    label: __t('common.servedPlural'),
                    value: totals?.volume.served,
                    icon: CircleCheck,
                  },
                  {
                    label: __t('reports.averageWaitAbbreviation'),
                    value:
                      totals?.timing.averageWaitMinutes == null
                        ? '—'
                        : `${number(totals.timing.averageWaitMinutes)} ${__t('common.min')}`,
                    icon: Timer,
                  },
                  {
                    label: __t('reports.averageServiceAbbreviation'),
                    value:
                      totals?.timing.averageServiceMinutes == null
                        ? '—'
                        : `${number(totals.timing.averageServiceMinutes)} ${__t('common.min')}`,
                    icon: Gauge,
                  },
                  {
                    label: __t('common.noShow'),
                    value:
                      totals?.rates.noShowRate == null
                        ? '—'
                        : formatReportPercent(totals.rates.noShowRate, i18n.language),
                    icon: UserX,
                  },
                ]
                  .filter((_, index) => !mobile || index < 3)
                  .map(({ label, value, icon: Icon }) => (
                    <MetricCard key={label} label={label} value={value ?? '—'} icon={<Icon />} />
                  ))}
              </>
            ) : null}
          </div>
          {reports.data ? (
            <ReportVisualizations
              buckets={reports.data.data.buckets}
              groups={reports.data.data.groups}
              summary={reports.data.data.summary}
              queues={queues.data?.data.items ?? []}
            />
          ) : null}
          <ResponsiveDetails summary={__t('mobile.details')} className="report-advanced">
            {mobile && totals ? (
              <div className="metric-grid">
                <MetricCard
                  label={__t('reports.averageServiceAbbreviation')}
                  value={
                    totals.timing.averageServiceMinutes == null
                      ? '—'
                      : `${number(totals.timing.averageServiceMinutes)} ${__t('common.min')}`
                  }
                />
                <MetricCard
                  label={__t('common.noShow')}
                  value={
                    totals.rates.noShowRate == null
                      ? '—'
                      : formatReportPercent(totals.rates.noShowRate, i18n.language)
                  }
                />
              </div>
            ) : null}
            {totals ? (
              <div className="metric-grid report-percentiles">
                <MetricCard
                  label={__t('reports.medianWait')}
                  value={
                    totals.timing.medianWaitMinutes == null
                      ? '—'
                      : `${number(totals.timing.medianWaitMinutes)} ${__t('common.min')}`
                  }
                  icon={<Timer />}
                />
                <MetricCard
                  label={__t('reports.p90Wait')}
                  value={
                    totals.timing.p90WaitMinutes == null
                      ? '—'
                      : `${number(totals.timing.p90WaitMinutes)} ${__t('common.min')}`
                  }
                  icon={<Timer />}
                />
                <MetricCard
                  label={__t('reports.medianService')}
                  value={
                    totals.timing.medianServiceMinutes == null
                      ? '—'
                      : `${number(totals.timing.medianServiceMinutes)} ${__t('common.min')}`
                  }
                  icon={<Gauge />}
                />
                <MetricCard
                  label={__t('reports.p90Service')}
                  value={
                    totals.timing.p90ServiceMinutes == null
                      ? '—'
                      : `${number(totals.timing.p90ServiceMinutes)} ${__t('common.min')}`
                  }
                  icon={<Gauge />}
                />
              </div>
            ) : null}
            {totals && queueItems.length ? (
              <ReportAnalyticsSections
                summary={totals}
                buckets={reports.data?.data.buckets ?? []}
                queues={queueItems}
              />
            ) : null}
          </ResponsiveDetails>
          {!reports.isLoading && !queueItems.length ? (
            <EmptyState
              title={__t('reports.noDataForPeriod')}
              description={__t('reports.noDataForPeriodHint')}
            />
          ) : (
            <Card>
              <h2>{__t('supervision.reports.performanceParFile')}</h2>
              <DataTable
                loading={reports.isLoading}
                caption={__t('reports.periodReportByQueue')}
                rows={queueItems}
                getRowKey={(row) => row.queueId}
                renderMobileRow={(row) => (
                  <DataTableMobileCard
                    title={row.queueName}
                    subtitle={row.queueCode}
                    fields={[
                      { label: __t('common.registered'), value: number(row.volume.registered) },
                      { label: __t('common.servedPlural'), value: number(row.volume.served) },
                      {
                        label: __t('reports.averageWaitAbbreviation'),
                        value:
                          row.timing.averageWaitMinutes == null
                            ? '—'
                            : `${number(row.timing.averageWaitMinutes)} ${__t('common.min')}`,
                      },
                      {
                        label: __t('reports.averageServiceAbbreviation'),
                        value:
                          row.timing.averageServiceMinutes == null
                            ? '—'
                            : `${number(row.timing.averageServiceMinutes)} ${__t('common.min')}`,
                      },
                      {
                        label: __t('common.noShow'),
                        value:
                          row.rates.noShowRate == null
                            ? '—'
                            : formatReportPercent(row.rates.noShowRate, i18n.language),
                      },
                    ]}
                    actions={null}
                  />
                )}
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
                    render: (row) =>
                      row.timing.averageWaitMinutes == null
                        ? '—'
                        : `${number(row.timing.averageWaitMinutes)} ${__t('common.min')}`,
                  },
                  {
                    key: 'service',
                    header: __t('reports.averageServiceAbbreviation'),
                    align: 'end',
                    render: (row) =>
                      row.timing.averageServiceMinutes == null
                        ? '—'
                        : `${number(row.timing.averageServiceMinutes)} ${__t('common.min')}`,
                  },
                  {
                    key: 'noShow',
                    header: __t('common.noShow'),
                    align: 'end',
                    render: (row) =>
                      row.rates.noShowRate == null
                        ? '—'
                        : formatReportPercent(row.rates.noShowRate, i18n.language),
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
        </>
      )}
    </div>
  );
}
