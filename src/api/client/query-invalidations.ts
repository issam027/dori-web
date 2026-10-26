import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

function isRegistrationQueryForQueue(queryKey: readonly unknown[], queueId: string): boolean {
  if (queryKey[0] !== queryKeys.registrations.all[0]) return false;
  if (queryKey[1] === 'operator') return true;
  if (queryKey[1] !== 'list') return false;
  const filters = queryKey[2];
  if (!filters || typeof filters !== 'object') return false;
  const queryQueueId = (filters as { queueId?: unknown }).queueId;
  return queryQueueId === undefined || queryQueueId === queueId;
}

function invalidateQueueRegistrations(queryClient: QueryClient, queueId: string) {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) => isRegistrationQueryForQueue(queryKey, queueId),
  });
}

export async function invalidateAppointments(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
}

export async function invalidateNotifications(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
}

export async function invalidatePersonNotes(queryClient: QueryClient, personId: string) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.persons.notes(personId) });
}

export async function invalidateQueueCall(
  queryClient: QueryClient,
  queueId: string,
  siteId?: string | null,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.queueStatus.detail(queueId) }),
    invalidateQueueRegistrations(queryClient, queueId),
    ...(siteId
      ? [queryClient.invalidateQueries({ queryKey: queryKeys.queuePreview.bySite(siteId) })]
      : []),
  ]);
}

export async function invalidateQueueSession(queryClient: QueryClient, queueId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.queueSessions.byQueue(queueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.threads.byQueue(queueId) }),
  ]);
}

export async function invalidateRegistrationOutcome(
  queryClient: QueryClient,
  options: { queueId: string; registrationId: string; siteId?: string | null },
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.queueStatus.detail(options.queueId) }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.registrations.detail(options.registrationId),
    }),
    invalidateQueueRegistrations(queryClient, options.queueId),
    ...(options.siteId
      ? [queryClient.invalidateQueries({ queryKey: queryKeys.queuePreview.bySite(options.siteId) })]
      : []),
  ]);
}

export async function invalidateAdmin(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
}

export async function invalidateControlRoom(queryClient: QueryClient, queueId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.queueStatus.detail(queueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.queueSessions.byQueue(queueId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.threads.byQueue(queueId) }),
    invalidateQueueRegistrations(queryClient, queueId),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
  ]);
}
