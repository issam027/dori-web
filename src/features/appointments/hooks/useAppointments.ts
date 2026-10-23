import { useQuery } from '@tanstack/react-query';
import {
  registrationsControllerFindOne,
  registrationsControllerFindRegistrations,
  registrationsControllerGetAvailability,
} from '@/api/generated/registrations/registrations';
import { serviceTiersControllerFindTiers } from '@/api/generated/tiers/tiers';
import { queryKeys } from '@/api/client/query-keys';

export function useAppointments(options: {
  siteId: string | null;
  queueId?: string;
  dates: readonly string[];
}) {
  const dateFrom = options.dates[0];
  const dateTo = options.dates.at(-1);

  return useQuery({
    queryKey: queryKeys.appointments.byQueueRange(options.queueId, dateFrom, dateTo),
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const params = {
        siteId: options.siteId ?? undefined,
        queueId: options.queueId,
        dateFrom,
        dateTo,
        isActive: true,
        entryType: 'appointment' as const,
        pageSize: 100,
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
      if (first.data.totalPages <= 1) return first.data.items;

      const remaining = await Promise.all(
        Array.from({ length: first.data.totalPages - 1 }, (_, index) =>
          registrationsControllerFindRegistrations(
            { ...params, page: index + 2 },
            undefined,
            signal,
          ),
        ),
      );
      return [first, ...remaining].flatMap((response) => response.data.items);
    },
    enabled:
      options.siteId !== null && options.queueId !== undefined && Boolean(dateFrom && dateTo),
  });
}

export function useAppointment(registrationId: string | null) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(registrationId),
    queryFn: ({ signal }) =>
      registrationsControllerFindOne(registrationId ?? '', undefined, signal),
    enabled: registrationId !== null,
  });
}

export function useAvailability(queueId: string, date: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.availability(queueId, date),
    queryFn: ({ signal }) =>
      registrationsControllerGetAvailability(
        queueId,
        { dateFrom: date, dateTo: date },
        undefined,
        signal,
      ),
    enabled: enabled && Boolean(queueId) && date.length > 0,
  });
}

export function useAvailabilityRange(queueId: string | undefined, dates: readonly string[]) {
  const dateFrom = dates[0];
  const dateTo = dates.at(-1);
  return useQuery({
    queryKey: queryKeys.availabilityRange(queueId, dateFrom, dateTo),
    queryFn: ({ signal }) =>
      registrationsControllerGetAvailability(
        queueId ?? '',
        { dateFrom: dateFrom ?? '', dateTo: dateTo ?? '' },
        undefined,
        signal,
      ),
    enabled: queueId !== undefined && Boolean(dateFrom && dateTo),
  });
}

export function useAppointmentTiers(usage = 'appointments') {
  return useQuery({
    queryKey: queryKeys.tiers.catalog(usage),
    queryFn: ({ signal }) =>
      serviceTiersControllerFindTiers({ page: 1, pageSize: 100 }, undefined, signal),
  });
}
