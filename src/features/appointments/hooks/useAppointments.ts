import { useQueries, useQuery } from '@tanstack/react-query';
import {
  registrationsControllerFindOne,
  registrationsControllerFindRegistrations,
  registrationsControllerGetAvailability,
} from '@/api/generated/registrations/registrations';
import { serviceTiersControllerFindTiers } from '@/api/generated/tiers/tiers';
import { queryKeys } from '@/api/client/query-keys';

export function useAppointments(options: {
  siteId: number | null;
  queueId?: number;
  dates: readonly string[];
}) {
  return useQueries({
    queries: options.dates.map((businessDate) => ({
      queryKey: queryKeys.appointments.byQueueDate(options.queueId, businessDate),
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const params = {
          siteId: options.siteId ?? undefined,
          queueId: options.queueId,
          businessDate,
          entryType: 'appointment' as const,
          pageSize: 25,
          sort: 'scheduledTime:asc' as const,
        };
        const first = await registrationsControllerFindRegistrations(
          {
            ...params,
            page: 1,
          },
          undefined,
          signal,
        );
        if (first.data.totalPages <= 1) return first;

        const remaining = await Promise.all(
          Array.from({ length: first.data.totalPages - 1 }, (_, index) =>
            registrationsControllerFindRegistrations(
              { ...params, page: index + 2 },
              undefined,
              signal,
            ),
          ),
        );
        return {
          ...first,
          data: {
            ...first.data,
            page: 1,
            pageSize: 25,
            items: [first, ...remaining].flatMap((response) => response.data.items),
          },
        };
      },
      enabled: options.siteId !== null && options.queueId !== undefined,
    })),
  });
}

export function useAppointment(registrationId: number | null) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(registrationId),
    queryFn: ({ signal }) => registrationsControllerFindOne(registrationId ?? 0, undefined, signal),
    enabled: registrationId !== null,
  });
}

export function useAvailability(queueId: number, date: string) {
  return useQuery({
    queryKey: queryKeys.availability(queueId, date),
    queryFn: ({ signal }) =>
      registrationsControllerGetAvailability(queueId, { date }, undefined, signal),
    enabled: queueId > 0 && date.length > 0,
  });
}

export function useAppointmentTiers(usage = 'appointments') {
  return useQuery({
    queryKey: queryKeys.tiers.catalog(usage),
    queryFn: ({ signal }) =>
      serviceTiersControllerFindTiers({ page: 1, pageSize: 100 }, undefined, signal),
  });
}
