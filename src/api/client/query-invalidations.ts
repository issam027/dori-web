import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export async function invalidateAppointments(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
}

export async function invalidateNotifications(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
}

export async function invalidatePersonNotes(queryClient: QueryClient, personId: number) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.persons.notes(personId) });
}

export async function invalidateQueueOperations(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.queues.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.queueSessions.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.threads.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.queueStatus.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.queuePreview.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.registrations.all }),
  ]);
}

export async function invalidateAdmin(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
}

export async function invalidateControlRoom(queryClient: QueryClient) {
  await Promise.all([
    invalidateQueueOperations(queryClient),
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
  ]);
}
