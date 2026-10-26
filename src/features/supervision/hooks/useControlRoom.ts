import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusinessMutation } from '@/api/client/use-business-mutation';
import { invalidateControlRoom } from '@/api/client/query-invalidations';
import {
  monitoringControllerLive,
  monitoringControllerSeries,
} from '@/api/generated/monitoring/monitoring';
import { resetQueue } from '../api/control-room-api';
import { queryKeys } from '@/api/client/query-keys';

export function useMonitoringLive(siteId: string | null, refreshInterval: number | false = 30_000) {
  return useQuery({
    queryKey: queryKeys.monitoring.live(siteId),
    queryFn: ({ signal }) => monitoringControllerLive({ siteId: siteId ?? '' }, undefined, signal),
    enabled: siteId !== null,
    refetchInterval: refreshInterval,
  });
}

export function useMonitoringSeries(options: {
  siteId: string | null;
  queueIds: readonly string[];
  userIds: readonly string[];
  from: string;
  to: string;
  bucket: 'hour' | 'day';
  timezone?: string;
}) {
  return useQuery({
    queryKey: queryKeys.monitoring.series(options),
    queryFn: ({ signal }) =>
      monitoringControllerSeries(
        {
          siteId: options.siteId ?? undefined,
          queueIds: options.queueIds.length ? options.queueIds.join(',') : undefined,
          userIds: options.userIds.length ? options.userIds.join(',') : undefined,
          from: options.from,
          to: options.to,
          bucket: options.bucket,
          timezone: options.timezone,
        },
        undefined,
        signal,
      ),
    enabled: options.siteId !== null,
    staleTime: 30_000,
  });
}

export function useResetQueue(onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: (queueId: string) => resetQueue(queueId),
    expectedErrorStatuses: [404, 409, 422],
    invalidate: (_data, queueId) => invalidateControlRoom(queryClient, queueId),
    invalidateOnConflict: (_error, queueId) => invalidateControlRoom(queryClient, queueId),
    onSuccess: () => onSuccess?.(),
  });
}
