import { useQueries, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { findQueues, findQueueStatus } from '../api/queues-api';

export function useQueues(options: {
  siteId: number | null;
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

export function useQueueStatus(queueId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.queueStatus.detail(queueId),
    queryFn: ({ signal }) => findQueueStatus(queueId, signal),
    enabled,
    refetchInterval: 15_000,
  });
}

export function useQueueStatuses(queueIds: readonly number[]) {
  return useQueries({
    queries: queueIds.map((queueId) => ({
      queryKey: queryKeys.queueStatus.detail(queueId),
      queryFn: ({ signal }: { signal: AbortSignal }) => findQueueStatus(queueId, signal),
      refetchInterval: 15_000,
    })),
  });
}
