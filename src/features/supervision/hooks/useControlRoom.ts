import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusinessMutation } from '@/api/client/use-business-mutation';
import { invalidateControlRoom } from '@/api/client/query-invalidations';
import { monitoringControllerLive, monitoringControllerSeries } from '@/api/generated/monitoring/monitoring';
import { resetQueue } from '../api/control-room-api';

export function useMonitoringLive(siteId: number | null, refreshInterval: number | false = 30_000) {
  return useQuery({
    queryKey: ['monitoring', 'live', siteId],
    queryFn: ({ signal }) => monitoringControllerLive({ siteId: siteId ?? 0 }, undefined, signal),
    enabled: siteId !== null,
    refetchInterval: refreshInterval,
  });
}

export function useMonitoringSeries(options: {
  siteId: number | null;
  queueIds: readonly number[];
  userIds: readonly number[];
  from: string;
  to: string;
  bucket: 'hour' | 'day';
  timezone?: string;
}) {
  return useQuery({
    queryKey: ['monitoring', 'series', options],
    queryFn: ({ signal }) => monitoringControllerSeries({
      siteId: options.siteId ?? undefined,
      queueIds: options.queueIds.length ? options.queueIds.join(',') : undefined,
      userIds: options.userIds.length ? options.userIds.join(',') : undefined,
      from: options.from,
      to: options.to,
      bucket: options.bucket,
      timezone: options.timezone,
    }, undefined, signal),
    enabled: options.siteId !== null,
    staleTime: 30_000,
  });
}

export function useResetQueue(onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: (queueId: number) => resetQueue(queueId),
    expectedErrorStatuses: [404, 409, 422],
    invalidate: () => invalidateControlRoom(queryClient),
    invalidateOnConflict: () => invalidateControlRoom(queryClient),
    onSuccess: () => onSuccess?.(),
  });
}
