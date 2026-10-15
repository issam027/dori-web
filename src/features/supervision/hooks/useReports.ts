import { useQueries, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { monitoringControllerSeries } from '@/api/generated/monitoring/monitoring';
import { queuesControllerFindAll, queuesControllerGetStatus } from '@/api/generated/queues/queues';

async function loadSiteSummary(siteId: number, signal?: AbortSignal) {
  const queues = await queuesControllerFindAll(
    { siteId, isActive: true, page: 1, pageSize: 100 }, undefined, signal,
  );
  const statuses = await Promise.all(
    queues.data.items.map((queue) =>
      queuesControllerGetStatus(queue.queueId, undefined, signal).then((response) => response.data),
    ),
  );
  return { data: {
    activeSites: 1,
    activeQueues: queues.data.items.length,
    waitingTotal: statuses.reduce((sum, status) => sum + status.waitingCount, 0),
    appointmentsToday: statuses.reduce((sum, status) => sum + status.nextAppointments.length, 0),
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
      const statuses = await Promise.all(
        queues.data.items.map((queue) =>
          queuesControllerGetStatus(queue.queueId, undefined, signal).then((response) => response.data),
        ),
      );
      return { data: queues.data.items.map((queue, index) => ({
        ...queue,
        siteName: '',
        waitingCount: statuses[index]?.waitingCount ?? 0,
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
    queryFn: ({ signal }) => monitoringControllerSeries({
      siteId: options.queueId ? undefined : (options.siteId ?? undefined),
      queueIds: options.queueId ? String(options.queueId) : undefined,
      dateFrom: options.startDate,
      dateTo: options.endDate,
      granularity: options.granularity,
      groupBy: 'queue',
      includeEmpty: true,
    }, undefined, signal),
  });
}
