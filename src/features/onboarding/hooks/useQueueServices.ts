import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { fetchQueueServices, fetchQueueServiceRules } from '../api/queue-service-api';

export function useSelectedQueueServices(queueId?: string) {
  return useQuery({
    queryKey: queryKeys.tiers.byQueue(queueId),
    enabled: Boolean(queueId),
    queryFn: ({ signal }) => fetchQueueServices(queueId ?? '',
      { page: 1, pageSize: 100, sort: 'displayOrder:asc' }, undefined, signal),
  });
}
export function useQueueServiceRules(queueId: string, tierId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.tiers.rules(queueId, tierId),
    enabled,
    queryFn: ({ signal }) => fetchQueueServiceRules(queueId, tierId,
      { page: 1, pageSize: 100 }, undefined, signal),
  });
}
export function useRefreshQueueServices() {
  const client = useQueryClient();
  return async (queueId: string, tierId: string) => {
    await Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.tiers.byQueue(queueId) }),
      client.invalidateQueries({ queryKey: queryKeys.tiers.rules(queueId, tierId) }),
      client.invalidateQueries({ queryKey: queryKeys.publicExperience.kioskTiers(queueId) }),
      client.invalidateQueries({ queryKey: queryKeys.publicExperience.kioskTierRules(queueId, tierId) }),
    ]);
  };
}
