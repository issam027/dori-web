import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  OpenQueueSessionDto,
  QueueEngineControllerGetCockpit200,
} from '@/api/generated/models';
import {
  queueEngineControllerCallNext,
  queueEngineControllerCallNextForSite,
  queueEngineControllerCloseSession,
  queueEngineControllerGetCockpit,
  queueEngineControllerMarkNoShow,
  queueEngineControllerMarkServed,
  queueEngineControllerOpenSession,
  queueEngineControllerRecall,
} from '@/api/generated/queue-engine/queue-engine';
import { queryKeys } from '@/api/client/query-keys';
import { useBusinessMutation } from '@/api/client/use-business-mutation';

export function useCockpit(siteId: string | null) {
  return useQuery({
    queryKey: queryKeys.cockpit.bySite(siteId),
    queryFn: ({ signal }) =>
      queueEngineControllerGetCockpit(
        siteId ?? '',
        { previewLimit: 3, recentLimit: 10 },
        undefined,
        signal,
      ),
    enabled: Boolean(siteId),
  });
}

export function refreshCockpitQueue(siteId: string, queueId: string) {
  return queueEngineControllerGetCockpit(siteId, {
    queueIds: queueId,
    previewLimit: 3,
    recentLimit: 10,
  });
}

export function mergeCockpitQueue(
  current: QueueEngineControllerGetCockpit200 | undefined,
  incoming: QueueEngineControllerGetCockpit200,
): QueueEngineControllerGetCockpit200 {
  if (!current) return incoming;
  const replacements = new Map(incoming.data.queues.map((queue) => [queue.queueId, queue]));
  return {
    ...current,
    ...incoming,
    data: {
      ...current.data,
      ...incoming.data,
      queues: current.data.queues.map((queue) => replacements.get(queue.queueId) ?? queue),
      recentPassages: incoming.data.recentPassages,
    },
  };
}

export function useCockpitActions(siteId: string | null) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.cockpit.bySite(siteId) });
  const shared = {
    expectedErrorStatuses: [404, 409, 422],
    invalidate,
    invalidateOnConflict: invalidate,
  } as const;

  return {
    callNextForSite: useBusinessMutation({
      mutationFn: () => queueEngineControllerCallNextForSite(siteId ?? ''),
      ...shared,
    }),
    callNextForQueue: useBusinessMutation({
      mutationFn: (queueId: string) => queueEngineControllerCallNext(queueId),
      ...shared,
    }),
    openSession: useBusinessMutation({
      mutationFn: ({ queueId, dto }: { queueId: string; dto: OpenQueueSessionDto }) =>
        queueEngineControllerOpenSession(queueId, dto),
      ...shared,
    }),
    closeSession: useBusinessMutation({
      mutationFn: ({ queueId, sessionId }: { queueId: string; sessionId: string }) =>
        queueEngineControllerCloseSession(queueId, sessionId),
      ...shared,
    }),
    recall: useBusinessMutation({
      mutationFn: (registrationId: string) => queueEngineControllerRecall(registrationId),
      ...shared,
    }),
    markServed: useBusinessMutation({
      mutationFn: (registrationId: string) => queueEngineControllerMarkServed(registrationId),
      ...shared,
    }),
    markNoShow: useBusinessMutation({
      mutationFn: (registrationId: string) => queueEngineControllerMarkNoShow(registrationId),
      ...shared,
    }),
  };
}
