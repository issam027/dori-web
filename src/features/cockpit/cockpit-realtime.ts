import type { QueryClient } from '@tanstack/react-query';
import type { QueueDisplayChangedEvent } from '@/core/realtime/queue-realtime-gateway';
import { queryKeys } from '@/api/client/query-keys';

type QueryInvalidator = Pick<QueryClient, 'invalidateQueries'>;

export async function refreshCockpitQueue(
  queryClient: QueryInvalidator,
  siteId: string | null,
  queueId: string,
  reason?: QueueDisplayChangedEvent['reason'],
): Promise<void> {
  const refreshes = [
    queryClient.invalidateQueries({ queryKey: queryKeys.queueStatus.detail(queueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.queuePreview.bySite(siteId) }),
  ];
  if (reason !== 'registration_created')
    refreshes.push(queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all }));
  await Promise.all(refreshes);
}
