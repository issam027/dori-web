import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { monitoringControllerLive } from '@/api/generated/monitoring/monitoring';

async function loadSiteSummary(siteId: string, signal?: AbortSignal) {
  const response = await monitoringControllerLive({ siteId }, undefined, signal);
  return {
    data: {
      activeSites: 1,
      activeQueues: response.data.totals.activeQueues,
      waitingTotal: response.data.totals.waiting,
    },
  };
}

export function usePortfolioSummaries(siteIds: readonly string[], enabled = true) {
  return useQueries({
    queries: siteIds.map((siteId) => ({
      queryKey: queryKeys.reports.portfolioSummary(siteId),
      queryFn: ({ signal }: { signal: AbortSignal }) => loadSiteSummary(siteId, signal),
      enabled,
    })),
  });
}
