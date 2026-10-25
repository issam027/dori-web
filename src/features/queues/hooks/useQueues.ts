import { useQueries, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { findQueues, findQueueStatus } from '../api/queues-api';
import { realtimeSafetyRefreshIntervalMs } from '@/core/realtime/realtime-gateway';

export function useQueues(options: {
  siteId: string | null;
  isActive?: boolean;
  usage?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.queues.bySite(options.siteId, {
      isActive: options.isActive,
      usage: options.usage,
    }),
    queryFn: ({ signal }) =>
      findQueues(
        {
          siteId: options.siteId ?? undefined,
          page: 1,
          pageSize: 100,
          isActive: options.isActive,
        },
        signal,
      ),
    enabled: options.enabled !== false && options.siteId !== null,
  });
}

export function useQueueStatuses(queueIds: readonly string[]) {
  return useQueries({
    queries: queueIds.map((queueId) => ({
      queryKey: queryKeys.queueStatus.detail(queueId),
      queryFn: ({ signal }: { signal: AbortSignal }) => findQueueStatus(queueId, signal),
      refetchInterval: realtimeSafetyRefreshIntervalMs,
    })),
  });
}
