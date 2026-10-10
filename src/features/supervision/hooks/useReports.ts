import { useQueries, useQuery } from '@tanstack/react-query';
import {
  reportsControllerGetDailyQueueReport,
  reportsControllerGetDashboardQueueLoad,
  reportsControllerGetDashboardSummary,
} from '@/api/generated/reports/reports';
import { queryKeys } from '@/api/client/query-keys';

export function useDashboardSummary(siteId: number | null) {
  return useQuery({
    queryKey: queryKeys.reports.summary(siteId),
    queryFn: ({ signal }) =>
      reportsControllerGetDashboardSummary({ siteId: siteId ?? undefined }, undefined, signal),
    enabled: siteId !== null,
    refetchInterval: 15_000,
  });
}

export function useDashboardSummaries(siteIds: readonly number[], enabled = true) {
  return useQueries({
    queries: siteIds.map((siteId) => ({
      queryKey: queryKeys.reports.portfolioSummary(siteId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        reportsControllerGetDashboardSummary({ siteId }, undefined, signal),
      enabled,
    })),
  });
}

export function useDashboardQueueLoad(siteId: number | null) {
  return useQuery({
    queryKey: queryKeys.reports.load(siteId),
    queryFn: ({ signal }) =>
      reportsControllerGetDashboardQueueLoad(
        { siteId: siteId ?? undefined, limit: 100 },
        undefined,
        signal,
      ),
    enabled: siteId !== null,
    refetchInterval: 15_000,
  });
}

export function useReports(options: {
  siteId: number | null;
  startDate: string;
  endDate: string;
  dates: readonly string[];
  queueIds: readonly number[];
  enabled: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.reports.daily(
      options.siteId,
      options.startDate,
      options.endDate,
      options.queueIds,
    ),
    enabled: options.enabled,
    queryFn: ({ signal }) =>
      Promise.all(
        options.dates.flatMap((businessDate) =>
          options.queueIds.map((queueId) =>
            reportsControllerGetDailyQueueReport(
              queueId,
              { date: businessDate },
              undefined,
              signal,
            ).then((response) => response.data),
          ),
        ),
      ),
  });
}
