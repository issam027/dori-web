import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueueEngineControllerGetCockpit200 } from '@/api/generated/models';
import { queryKeys } from '@/api/client/query-keys';
import { getAccessToken } from '@/core/auth/access-token';
import { notifyError } from '@/core/notifications/error-presentation';
import { useDegradedRealtimeRefresh } from '@/core/realtime/use-degraded-realtime-refresh';
import { useQueueDisplayRealtime } from '@/core/realtime/use-queue-realtime';
import {
  mergeCockpitQueue,
  refreshCockpitQueue,
  shouldSkipCockpitRealtimeRefresh,
} from './useCockpit';

/** Owns debounce, cache updates and lifecycle of cockpit subscriptions. */
export function useCockpitRealtime({
  siteId,
  queueIds,
  refresh,
}: {
  siteId: string | null;
  queueIds: string[];
  refresh: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const timers = useRef(new Map<string, number>());
  const generation = useRef(0);
  const revisions = useRef(new Map<string, number>());

  useEffect(
    () => () => {
      generation.current++;
      for (const timer of timers.current.values()) window.clearTimeout(timer);
      timers.current.clear();
      revisions.current.clear();
    },
    [siteId],
  );

  const health = useQueueDisplayRealtime({
    queueIds,
    getToken: getAccessToken,
    onEvent: (event) => {
      if (!siteId || shouldSkipCockpitRealtimeRefresh(siteId, event.queueId)) return;
      const previous = timers.current.get(event.queueId);
      if (previous !== undefined) window.clearTimeout(previous);
      const scheduledGeneration = generation.current;
      const revision = (revisions.current.get(event.queueId) ?? 0) + 1;
      revisions.current.set(event.queueId, revision);
      const isCurrent = () =>
        generation.current === scheduledGeneration &&
        revisions.current.get(event.queueId) === revision;
      const timer = window.setTimeout(() => {
        timers.current.delete(event.queueId);
        void refreshCockpitQueue(siteId, event.queueId)
          .then((incoming) => {
            if (!isCurrent()) return;
            queryClient.setQueryData<QueueEngineControllerGetCockpit200>(
              queryKeys.cockpit.bySite(siteId),
              (current) => mergeCockpitQueue(current, incoming),
            );
          })
          .catch((error: unknown) => {
            if (isCurrent()) notifyError(error);
          });
      }, 250);
      timers.current.set(event.queueId, timer);
    },
    onReconnect: () => {
      if (siteId)
        void queryClient.invalidateQueries({ queryKey: queryKeys.cockpit.bySite(siteId) });
    },
  });
  useDegradedRealtimeRefresh({ health, enabled: Boolean(siteId), refresh });
  return health;
}
