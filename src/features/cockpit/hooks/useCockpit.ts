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

const recentLocalQueueRefreshes = new Map<string, number>();
const localRefreshDeduplicationMs = 1_500;

function sortableDate(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function queueRefreshKey(siteId: string, queueId: string): string {
  return `${siteId}:${queueId}`;
}

export function shouldSkipCockpitRealtimeRefresh(siteId: string, queueId: string): boolean {
  const key = queueRefreshKey(siteId, queueId);
  const refreshedAt = recentLocalQueueRefreshes.get(key);
  if (refreshedAt === undefined) return false;
  recentLocalQueueRefreshes.delete(key);
  return Date.now() - refreshedAt <= localRefreshDeduplicationMs;
}

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
  const refreshedQueueIds = new Set(incoming.data.queues.map((queue) => queue.queueId));
  const retainedPassages = current.data.recentPassages.filter(
    (passage) => !refreshedQueueIds.has(passage.queueId),
  );
  const recentPassages = [...incoming.data.recentPassages, ...retainedPassages]
    .filter(
      (passage, index, passages) =>
        passages.findIndex((candidate) => candidate.registrationId === passage.registrationId) ===
        index,
    )
    .sort((left, right) => sortableDate(right.closedAt).localeCompare(sortableDate(left.closedAt)))
    .slice(0, 10);
  return {
    ...current,
    ...incoming,
    data: {
      ...current.data,
      ...incoming.data,
      queues: current.data.queues.map((queue) => replacements.get(queue.queueId) ?? queue),
      recentPassages,
    },
  };
}

export function useCockpitActions(siteId: string | null) {
  const queryClient = useQueryClient();
  const updateCachedQueue = (
    queueId: string,
    update: (
      queue: QueueEngineControllerGetCockpit200['data']['queues'][number],
    ) => QueueEngineControllerGetCockpit200['data']['queues'][number],
  ) => {
    const key = queryKeys.cockpit.bySite(siteId);
    const previous = queryClient.getQueryData<QueueEngineControllerGetCockpit200>(key);
    queryClient.setQueryData<QueueEngineControllerGetCockpit200>(key, (current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              queues: current.data.queues.map((queue) =>
                queue.queueId === queueId ? update(queue) : queue,
              ),
            },
          }
        : current,
    );
    return previous;
  };
  const restoreCache = (previous: QueueEngineControllerGetCockpit200 | undefined) => {
    if (previous) queryClient.setQueryData(queryKeys.cockpit.bySite(siteId), previous);
  };
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.cockpit.bySite(siteId) });
  const refreshQueue = async (queueId: string) => {
    if (!siteId) return;
    recentLocalQueueRefreshes.set(queueRefreshKey(siteId, queueId), Date.now());
    const incoming = await refreshCockpitQueue(siteId, queueId);
    queryClient.setQueryData<QueueEngineControllerGetCockpit200>(
      queryKeys.cockpit.bySite(siteId),
      (current) => mergeCockpitQueue(current, incoming),
    );
  };
  const sharedAll = {
    expectedErrorStatuses: [404, 409, 422],
    invalidate: invalidateAll,
    invalidateOnConflict: invalidateAll,
  } as const;

  return {
    callNextForSite: useBusinessMutation({
      mutationFn: () => queueEngineControllerCallNextForSite(siteId ?? ''),
      ...sharedAll,
    }),
    callNextForQueue: useBusinessMutation({
      mutationFn: (queueId: string) => queueEngineControllerCallNext(queueId),
      expectedErrorStatuses: sharedAll.expectedErrorStatuses,
      invalidate: (_data, queueId) => refreshQueue(queueId),
      invalidateOnConflict: (_error, queueId) => refreshQueue(queueId),
    }),
    openSession: useBusinessMutation({
      mutationFn: ({ queueId, dto }: { queueId: string; dto: OpenQueueSessionDto }) =>
        queueEngineControllerOpenSession(queueId, dto),
      expectedErrorStatuses: sharedAll.expectedErrorStatuses,
      invalidate: (_data, variables) => refreshQueue(variables.queueId),
      invalidateOnConflict: (_error, variables) => refreshQueue(variables.queueId),
    }),
    closeSession: useBusinessMutation({
      mutationFn: ({ queueId, sessionId }: { queueId: string; sessionId: string }) =>
        queueEngineControllerCloseSession(queueId, sessionId),
      expectedErrorStatuses: sharedAll.expectedErrorStatuses,
      invalidate: (_data, variables) => refreshQueue(variables.queueId),
      invalidateOnConflict: (_error, variables) => refreshQueue(variables.queueId),
    }),
    recall: useBusinessMutation({
      mutationFn: ({ registrationId }: { registrationId: string; queueId: string }) =>
        queueEngineControllerRecall(registrationId),
      expectedErrorStatuses: sharedAll.expectedErrorStatuses,
      invalidate: (_data, variables) => refreshQueue(variables.queueId),
      onMutate: (variables) =>
        updateCachedQueue(variables.queueId, (queue) =>
          queue.activeCall
            ? {
                ...queue,
                activeCall: {
                  ...queue.activeCall,
                  recallCount: queue.activeCall.recallCount + 1,
                  lastRecalledAt: new Date().toISOString(),
                },
              }
            : queue,
        ),
      onError: (_error, _variables, previous) => {
        restoreCache(previous);
      },
    }),
    markServed: useBusinessMutation({
      mutationFn: ({ registrationId }: { registrationId: string; queueId: string }) =>
        queueEngineControllerMarkServed(registrationId),
      expectedErrorStatuses: sharedAll.expectedErrorStatuses,
      invalidate: (_data, variables) => refreshQueue(variables.queueId),
      onMutate: (variables) =>
        updateCachedQueue(variables.queueId, (queue) => ({ ...queue, activeCall: null })),
      onError: (_error, _variables, previous) => {
        restoreCache(previous);
      },
    }),
    markNoShow: useBusinessMutation({
      mutationFn: ({ registrationId }: { registrationId: string; queueId: string }) =>
        queueEngineControllerMarkNoShow(registrationId),
      expectedErrorStatuses: sharedAll.expectedErrorStatuses,
      invalidate: (_data, variables) => refreshQueue(variables.queueId),
      onMutate: (variables) =>
        updateCachedQueue(variables.queueId, (queue) => ({ ...queue, activeCall: null })),
      onError: (_error, _variables, previous) => {
        restoreCache(previous);
      },
    }),
  };
}
