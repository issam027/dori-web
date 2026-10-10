import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SendManualNotificationDto } from '@/api/generated/models';
import {
  notificationsControllerFindNotificationById,
  notificationsControllerFindNotifications,
  notificationsControllerResend,
  notificationsControllerSendManual,
} from '@/api/generated/notifications/notifications';
import { queryKeys } from '@/api/client/query-keys';
import { invalidateNotifications } from '@/api/client/query-invalidations';
import { registrationsControllerFindRegistrations } from '@/api/generated/registrations/registrations';
import { useBusinessMutation } from '@/api/client/use-business-mutation';

export function useNotifications(filters: {
  page: number;
  channel?: string;
  status?: string;
  date?: string;
}) {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: ({ signal }) =>
      notificationsControllerFindNotifications(
        {
          page: filters.page,
          pageSize: 25,
          sort: 'createdAt:desc',
          channel: filters.channel ? (filters.channel as 'sms' | 'email') : undefined,
          status: filters.status
            ? (filters.status as 'pending' | 'processing' | 'sent' | 'delivered' | 'failed')
            : undefined,
          businessDate: filters.date,
        },
        undefined,
        signal,
      ),
  });
}

export function useNotification(notificationId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications.detail(notificationId ?? null),
    enabled: notificationId !== undefined,
    queryFn: ({ signal }) =>
      notificationsControllerFindNotificationById(notificationId ?? 0, undefined, signal),
  });
}

export function useRecentNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.controlRoom,
    queryFn: ({ signal }) =>
      notificationsControllerFindNotifications(
        { page: 1, pageSize: 5, sort: 'createdAt:desc' },
        undefined,
        signal,
      ),
    refetchInterval: 15_000,
  });
}

export function usePersonRegistrations(siteId: number | null, personId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.registrations.list({
      siteId,
      personId,
      page: 1,
      pageSize: 20,
      sort: 'createdAt:desc',
      usage: 'notification',
    }),
    enabled: personId !== undefined,
    queryFn: ({ signal }) =>
      registrationsControllerFindRegistrations(
        { personId, siteId: siteId ?? undefined, page: 1, pageSize: 20, sort: 'createdAt:desc' },
        undefined,
        signal,
      ),
  });
}

export function useSendNotification(onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: (dto: SendManualNotificationDto) => notificationsControllerSendManual(dto),
    expectedErrorStatuses: [400, 404, 409, 422],
    invalidate: () => invalidateNotifications(queryClient),
    onSuccess: () => onSuccess?.(),
  });
}

export function useResendNotification(onSuccess?: () => void | Promise<void>) {
  const queryClient = useQueryClient();
  return useBusinessMutation({
    mutationFn: (notificationId: number) => notificationsControllerResend(notificationId),
    expectedErrorStatuses: [404, 409, 422],
    invalidate: () => invalidateNotifications(queryClient),
    invalidateOnConflict: () => invalidateNotifications(queryClient),
    onSuccess: () => onSuccess?.(),
  });
}
