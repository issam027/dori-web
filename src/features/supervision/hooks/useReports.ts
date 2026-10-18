import { useQueries, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { monitoringControllerLive, monitoringControllerSeries } from '@/api/generated/monitoring/monitoring';
import { queuesControllerFindAll } from '@/api/generated/queues/queues';
import type { MonitoringSeriesMetricsDto } from '@/api/generated/models';
import type { ReportBucketDto, ReportGroupDto, ReportMetricsDto } from '../report-utils';
import { addDays } from '../report-utils';

const rates = (metrics: MonitoringSeriesMetricsDto) => ({
  noShowRate: metrics.registered ? metrics.noShow / metrics.registered : null,
  cancellationRate: metrics.registered ? metrics.cancelled / metrics.registered : null,
  expirationRate: null,
});
const metrics = (value: MonitoringSeriesMetricsDto, walkin = 0, appointments = 0): ReportMetricsDto => ({
  volume: { registered: value.registered, served: value.served, noShow: value.noShow, cancelled: value.cancelled, walkin, appointments, expired: 0 },
  timing: { averageWaitMinutes: value.averageWaitMinutes, averageServiceMinutes: value.averageServiceMinutes, medianWaitMinutes: null, p90WaitMinutes: null, medianServiceMinutes: null, p90ServiceMinutes: null },
  rates: rates(value),
});

async function loadSiteSummary(siteId: number, signal?: AbortSignal) {
  const response = await monitoringControllerLive({ siteId }, undefined, signal);
  return { data: {
    activeSites: 1,
    activeQueues: response.data.totals.activeQueues,
    waitingTotal: response.data.totals.waiting,
  } };
}

export function useDashboardSummary(siteId: number | null) {
  return useQuery({
    queryKey: queryKeys.reports.summary(siteId),
    queryFn: ({ signal }) => loadSiteSummary(siteId ?? 0, signal),
    enabled: siteId !== null,
    refetchInterval: 15_000,
  });
}

export function useDashboardSummaries(siteIds: readonly number[], enabled = true) {
  return useQueries({ queries: siteIds.map((siteId) => ({
    queryKey: queryKeys.reports.portfolioSummary(siteId),
    queryFn: ({ signal }: { signal: AbortSignal }) => loadSiteSummary(siteId, signal),
    enabled,
  })) });
}

export function useDashboardQueueLoad(siteId: number | null) {
  return useQuery({
    queryKey: queryKeys.reports.load(siteId),
    enabled: siteId !== null,
    refetchInterval: 15_000,
    queryFn: async ({ signal }) => {
      const queues = await queuesControllerFindAll(
        { siteId: siteId ?? undefined, isActive: true, page: 1, pageSize: 100 }, undefined, signal,
      );
      return { data: queues.data.items.map((queue) => ({
        ...queue,
        siteName: '',
        waitingCount: 0,
        dominantTier: '—',
      })) };
    },
  });
}

export function useReports(options: {
  siteId: number | null;
  startDate: string;
  endDate: string;
  queueId?: number;
  granularity: 'day' | 'week' | 'month';
  timezone: string;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      ...queryKeys.reports.daily(
        options.siteId,
        options.startDate,
        options.endDate,
        options.queueId ? [options.queueId] : [],
      ),
      options.granularity,
    ],
    enabled: options.enabled && options.siteId !== null,
    queryFn: async ({ signal }) => {
      const response = await monitoringControllerSeries({
      siteId: options.siteId ?? undefined,
      queueIds: options.queueId ? String(options.queueId) : undefined,
      from: new Date(`${options.startDate}T00:00:00.000Z`).toISOString(),
      to: new Date(`${addDays(options.endDate, 1)}T00:00:00.000Z`).toISOString(),
      bucket: options.granularity,
      timezone: options.timezone,
    }, undefined, signal);
      const data = response.data;
      const entryCounts = new Map(data.breakdowns.byEntryType.map((item) => [item.entryType, item.count]));
      const summary = metrics(data.totals, entryCounts.get('walkin') ?? 0, entryCounts.get('appointment') ?? 0);
      const buckets: ReportBucketDto[] = data.series.map((bucket, index) => ({
        ...metrics(bucket), periodStart: bucket.periodStart,
        periodEnd: data.series[index + 1]?.periodStart ?? data.appliedFilters.to,
      }));
      const groups: ReportGroupDto[] = data.breakdowns.byQueue.map((queue) => ({
        ...metrics(queue), dimension: { queueId: queue.queueId, queueName: queue.queueName }, buckets: [],
      }));
      return { ...response, data: { ...data, summary, buckets, groups } };
    },
  });
}
