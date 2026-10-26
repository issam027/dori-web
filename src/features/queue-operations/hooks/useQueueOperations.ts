import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  OpenQueueSessionDto,
  RegistrationsControllerFindRegistrationsSort,
  RegistrationsControllerFindRegistrationsStatus,
} from '@/api/generated/models';
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
import {
  invalidateQueueCall,
  invalidateQueueSession,
  invalidateRegistrationOutcome,
} from '@/api/client/query-invalidations';
import { callNextAndCommit } from '../operation-actions';
import { useBusinessMutation } from '@/api/client/use-business-mutation';
import { realtimeSafetyRefreshIntervalMs } from '@/core/realtime/realtime-gateway';

export function useRegistration(registrationId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.registrations.detail(registrationId),
    queryFn: ({ signal }) =>
      registrationsControllerFindOne(registrationId ?? '', undefined, signal),
    enabled: enabled && Boolean(registrationId),
  });
}

export function useOperatorRegistrations(
  userId: string | undefined,
  status: 'in_progress' | 'served' | 'no_show',
  siteId: string | null,
  pageSize = 10,
) {
  return useQuery({
    queryKey: queryKeys.registrations.operator(userId, status, siteId, pageSize),
    queryFn: ({ signal }) =>
      registrationsControllerFindRegistrations(
        {
          servedByUserId: userId,
          siteId: siteId ?? undefined,
          status,
          page: 1,
          pageSize,
          sort: 'createdAt:desc',
        },
        undefined,
        signal,
      ),
    enabled: Boolean(userId && siteId),
  });
}

export function useWaitingRegistrations(options: {
  siteId: string | null;
  queueId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  search?: string;
  status?: RegistrationsControllerFindRegistrationsStatus;
  sort?: RegistrationsControllerFindRegistrationsSort;
}) {
  return useQuery({
    queryKey: queryKeys.registrations.list({
      ...options,
      status: options.status,
      pageSize: 10,
      sort: options.sort,
      usage: 'my-queues',
    }),
    queryFn: ({ signal }) =>
      registrationsControllerFindRegistrations(
        {
          siteId: options.siteId ?? undefined,
          queueId: options.queueId,
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
          status: options.status,
          search: options.search || undefined,
          page: options.page,
          pageSize: 10,
          sort: options.sort,
        },
        undefined,
        signal,
      ),
    enabled: options.siteId !== null,
  });
}

export function useDeskSession(
  siteId: string | null,
  queueIds: readonly string[],
  includeThreads = false,
) {
  const previews = useQuery({
    queryKey: queryKeys.queuePreview.bySite(siteId),
    queryFn: ({ signal }) =>
      queueEngineControllerNextPreview(siteId ?? '', { limit: 5 }, undefined, signal),
    enabled: siteId !== null,
    refetchInterval: realtimeSafetyRefreshIntervalMs,
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
    queries: includeThreads
      ? queueIds.map((queueId) => ({
          queryKey: queryKeys.threads.byQueue(queueId),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            queueEngineControllerGetThreads(queueId, { page: 1, pageSize: 100 }, undefined, signal),
        }))
      : [],
  });
  return { previews, sessions, threads };
}

function useQueueCommand<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  invalidate: (variables: TVariables) => Promise<unknown>,
) {
  return useBusinessMutation({
    mutationFn,
    expectedErrorStatuses: [404, 409, 422],
    invalidate: (_data, variables) => invalidate(variables),
    invalidateOnConflict: (_error, variables) => invalidate(variables),
  });
}

export function useCallNext(siteId?: string | null) {
  const queryClient = useQueryClient();
  return useQueueCommand(
    (queueId: string) => callNextAndCommit(queueId),
    (queueId) => invalidateQueueCall(queryClient, queueId, siteId),
  );
}

export function useMarkServed() {
  const queryClient = useQueryClient();
  return useQueueCommand(
    (options: { registrationId: string; queueId: string; siteId?: string | null }) =>
      queueEngineControllerMarkServed(options.registrationId),
    (options) => invalidateRegistrationOutcome(queryClient, options),
  );
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  return useQueueCommand(
    (options: { registrationId: string; queueId: string; siteId?: string | null }) =>
      queueEngineControllerMarkNoShow(options.registrationId),
    (options) => invalidateRegistrationOutcome(queryClient, options),
  );
}

export function useOpenDeskSession() {
  const queryClient = useQueryClient();
  return useQueueCommand(
    ({ queueId, dto }: { queueId: string; dto: OpenQueueSessionDto }) =>
      queueEngineControllerOpenSession(queueId, dto),
    ({ queueId }) => invalidateQueueSession(queryClient, queueId),
  );
}

export function useCloseDeskSession() {
  const queryClient = useQueryClient();
  return useQueueCommand(
    ({ queueId, sessionId }: { queueId: string; sessionId: string }) =>
      queueEngineControllerCloseSession(queueId, sessionId),
    ({ queueId }) => invalidateQueueSession(queryClient, queueId),
  );
}
