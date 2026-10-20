import { useTranslation } from 'react-i18next';
import {
  Award,
  CalendarRange,
  CircleAlert,
  Gauge,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { ReportBucketViewModel, ReportMetricsViewModel } from './report-utils';
import { Card, MetricCard } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import type { QueueReportRow } from './report-utils';
import { formatReportNumber, formatReportPercent } from '@/core/i18n/number-format';

const format = (value: number | null, locale: string, suffix = '') =>
  value == null ? '—' : `${formatReportNumber(value, locale)}${suffix}`;
const percent = (value: number | null, locale: string) =>
  value == null ? '—' : formatReportPercent(value, locale);

function PerformanceScale({
  average,
  median,
  p90,
}: {
  average: number | null;
  median: number | null;
  p90: number | null;
}) {
  const { t, i18n } = useTranslation();
  const max = Math.max(average ?? 0, median ?? 0, p90 ?? 0, 1);
  return (
    <div className="performance-scale">
      {[
        [t('reports.average'), average, 'scale-average'],
        [t('reports.median'), median, 'scale-median'],
        [t('reports.p90'), p90, 'scale-p90'],
      ].map(([name, raw, className]) => {
        const value = raw as number | null;
        return (
          <div key={String(name)}>
            <span>{String(name)}</span>
            <div>
              <i
                className={String(className)}
                style={{ width: `${String(((value ?? 0) / max) * 100)}%` }}
              />
            </div>
            <strong>{format(value, i18n.language, ` ${t('common.min')}`)}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function ReportAnalyticsSections({
  summary,
  buckets,
  queues,
}: {
  summary: ReportMetricsViewModel;
  buckets: readonly ReportBucketViewModel[];
  queues: readonly QueueReportRow[];
}) {
  const { t, i18n } = useTranslation();
  const busiest = buckets.reduce<ReportBucketViewModel | undefined>(
    (best, item) => (!best || item.volume.registered > best.volume.registered ? item : best),
    undefined,
  );
  const first = buckets[0]?.volume.registered ?? 0;
  const last = buckets.at(-1)?.volume.registered ?? 0;
  const evolution = first === 0 ? null : ((last - first) / first) * 100;
  const bestQueue = [...queues].sort(
    (a, b) => (a.timing.averageWaitMinutes ?? Infinity) - (b.timing.averageWaitMinutes ?? Infinity),
  )[0];
  const pressuredQueue = [...queues].sort(
    (a, b) => (b.timing.p90WaitMinutes ?? 0) - (a.timing.p90WaitMinutes ?? 0),
  )[0];
  return (
    <>
      <section className="report-insight-grid">
        <MetricCard
          label={t('reports.analytics.busiestPeriod')}
          value={busiest?.periodStart.slice(0, 10) ?? '—'}
          icon={<CalendarRange />}
        />
        <MetricCard
          label={t('reports.analytics.volumeTrend')}
          value={
            evolution == null
              ? '—'
              : `${evolution >= 0 ? '+' : ''}${formatReportNumber(evolution, i18n.language)} %`
          }
          icon={evolution != null && evolution < 0 ? <TrendingDown /> : <TrendingUp />}
        />
        <MetricCard
          label={t('reports.analytics.bestWait')}
          value={bestQueue?.queueName ?? '—'}
          icon={<Award />}
        />
        <MetricCard
          label={t('reports.analytics.pressurePoint')}
          value={pressuredQueue?.queueName ?? '—'}
          icon={<CircleAlert />}
        />
      </section>
      <div className="report-analysis-grid">
        <Card className="report-quality-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">{t('reports.analytics.serviceQuality')}</span>
              <h2>{t('reports.analytics.waitDistribution')}</h2>
            </div>
            <Target />
          </div>
          <PerformanceScale
            average={summary.timing.averageWaitMinutes}
            median={summary.timing.medianWaitMinutes}
            p90={summary.timing.p90WaitMinutes}
          />
        </Card>
        <Card className="report-quality-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">{t('reports.analytics.processing')}</span>
              <h2>{t('reports.analytics.serviceDistribution')}</h2>
            </div>
            <Gauge />
          </div>
          <PerformanceScale
            average={summary.timing.averageServiceMinutes}
            median={summary.timing.medianServiceMinutes}
            p90={summary.timing.p90ServiceMinutes}
          />
        </Card>
        <Card className="report-outcomes-card">
          <span className="eyebrow">{t('reports.analytics.outcomes')}</span>
          <h2>{t('reports.analytics.flowQuality')}</h2>
          <dl>
            <div>
              <dt>{t('common.servedPlural')}</dt>
              <dd>{summary.volume.served}</dd>
            </div>
            <div>
              <dt>{t('common.noShow')}</dt>
              <dd>{percent(summary.rates.noShowRate, i18n.language)}</dd>
            </div>
            <div>
              <dt>{t('reports.analytics.cancellationRate')}</dt>
              <dd>{percent(summary.rates.cancellationRate, i18n.language)}</dd>
            </div>
            <div>
              <dt>{t('reports.analytics.expirationRate')}</dt>
              <dd>{percent(summary.rates.expirationRate, i18n.language)}</dd>
            </div>
          </dl>
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <span className="eyebrow">{t('reports.analytics.audit')}</span>
            <h2>{t('reports.analytics.chronology')}</h2>
          </div>
        </div>
        <DataTable
          caption={t('reports.analytics.chronology')}
          rows={buckets}
          getRowKey={(row) => row.periodStart}
          columns={[
            {
              key: 'period',
              header: t('reports.analytics.period'),
              render: (row) => `${row.periodStart.slice(0, 10)} → ${row.periodEnd.slice(0, 10)}`,
            },
            {
              key: 'registered',
              header: t('common.registered'),
              align: 'end',
              render: (row) => row.volume.registered,
            },
            {
              key: 'walkin',
              header: t('reports.analytics.walkins'),
              align: 'end',
              render: (row) => row.volume.walkin,
            },
            {
              key: 'appointments',
              header: t('common.rdv'),
              align: 'end',
              render: (row) => row.volume.appointments,
            },
            {
              key: 'served',
              header: t('common.servedPlural'),
              align: 'end',
              render: (row) => row.volume.served,
            },
            {
              key: 'wait',
              header: t('reports.averageWaitAbbreviation'),
              align: 'end',
              render: (row) =>
                format(row.timing.averageWaitMinutes, i18n.language, ` ${t('common.min')}`),
            },
            {
              key: 'p90',
              header: t('reports.p90Wait'),
              align: 'end',
              render: (row) =>
                format(row.timing.p90WaitMinutes, i18n.language, ` ${t('common.min')}`),
            },
            {
              key: 'noShow',
              header: t('common.noShow'),
              align: 'end',
              render: (row) => percent(row.rates.noShowRate, i18n.language),
            },
          ]}
        />
      </Card>
    </>
  );
}
