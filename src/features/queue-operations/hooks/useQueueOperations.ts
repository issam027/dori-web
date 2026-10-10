import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OpenQueueSessionDto } from '@/api/generated/models';
import {
  queueEngineControllerCloseSession,
  queueEngineControllerGetActiveSessions,
  queueEngineControllerGetThreads,
  queueEngineControllerMarkNoShow,
  queueEngineControllerMarkServed,
  queueEngineControllerNextPreview,
  queueEngineControllerOpenSession,
} from '@/api/generated/queue-engine/queue-engine';
import {
  registrationsControllerFindOne,
  registrationsControllerFindRegistrations,
} from '@/api/generated/registrations/registrations';
import { queryKeys } from '@/api/client/query-keys';
import { invalidateQueueOperations } from '@/api/client/query-invalidations';
import { callNextAndCommit } from '../operation-actions';
import { useBusinessMutation } from '@/api/client/use-business-mutation';

export function useRegistration(registrationId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.registrations.detail(registrationId),
    queryFn: ({ signal }) =>
      registrationsControllerFindOne(registrationId ?? 0, undefined, signal),
    enabled: enabled && Boolean(registrationId),
  });
}

export function useWaitingRegistrations(options: {
  siteId: number | null;
  queueId?: number;
  page: number;
}) {
  return useQuery({
    queryKey: queryKeys.registrations.list({
      ...options,
      status: 'waiting',
      pageSize: 10,
      sort: 'createdAt:asc',
      usage: 'my-queues',
    }),
    queryFn: ({ signal }) =>
      registrationsControllerFindRegistrations(
        {
          siteId: options.siteId ?? undefined,
          queueId: options.queueId,
          status: 'waiting',
          page: options.page,
          pageSize: 10,
          sort: 'createdAt:asc',
        },
        undefined,
        signal,
      ),
    enabled: options.siteId !== null,
  });
}

export function useDeskSession(siteId: number | null, queueIds: readonly number[]) {
  const previews = useQuery({
    queryKey: queryKeys.queuePreview.bySite(siteId),
    queryFn: ({ signal }) =>
      queueEngineControllerNextPreview(siteId ?? 0, { limit: 5 }, undefined, signal),
    enabled: siteId !== null,
    refetchInterval: 15_000,
  });
  const sessions = useQueries({
    queries: queueIds.map((queueId) => ({
      queryKey: queryKeys.queueSessions.byQueue(queueId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        queueEngineControllerGetActiveSessions(
          queueId,
          { page: 1, pageSize: 100 },
          undefined,
          signal,
        ),
    })),
  });
  const threads = useQueries({
    queries: queueIds.map((queueId) => ({
      queryKey: queryKeys.threads.byQueue(queueId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        queueEngineControllerGetThreads(
          queueId,
          { page: 1, pageSize: 100 },
          undefined,
          signal,
        ),
    })),
  });
  return { previews, sessions, threads };
}

function useQueueCommand<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn,
    expectedErrorStatuses: [404, 409, 422],
    invalidate: () => invalidateQueueOperations(queryClient),
    invalidateOnConflict: () => invalidateQueueOperations(queryClient),
  });
}

export function useCallNext() {
  return useQueueCommand((queueId: number) => callNextAndCommit(queueId));
}

export function useMarkServed() {
  return useQueueCommand((registrationId: number) =>
    queueEngineControllerMarkServed(registrationId),
  );
}

export function useMarkNoShow() {
  return useQueueCommand((registrationId: number) =>
    queueEngineControllerMarkNoShow(registrationId),
  );
}

export function useOpenDeskSession() {
  return useQueueCommand(({ queueId, dto }: { queueId: number; dto: OpenQueueSessionDto }) =>
    queueEngineControllerOpenSession(queueId, dto),
  );
}

export function useCloseDeskSession() {
  return useQueueCommand(({ queueId, sessionId }: { queueId: number; sessionId: number }) =>
    queueEngineControllerCloseSession(queueId, sessionId),
  );
}
