import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/client/query-keys';
import { findSite, getAvailability, getQueueTiers } from '../api/quick-registration-api';

export function useQuickRegistrationData(
  siteId: string,
  queueId: string,
  appointmentDate: string,
  appointment: boolean,
) {
  const tiers = useQuery({
    queryKey: queryKeys.tiers.byQueue(queueId || undefined),
    queryFn: ({ signal }) =>
      getQueueTiers(
        queueId,
        { page: 1, pageSize: 100, sort: 'displayOrder:asc' },
        undefined,
        signal,
      ),
    enabled: Boolean(queueId),
  });
  const site = useQuery({
    queryKey: queryKeys.sites.detail(siteId),
    queryFn: ({ signal }) => findSite(siteId, undefined, signal),
  });
  const availability = useQuery({
    queryKey: queryKeys.availability(queueId, appointmentDate),
    queryFn: ({ signal }) =>
      getAvailability(
        queueId,
        { dateFrom: appointmentDate, dateTo: appointmentDate },
        undefined,
        signal,
      ),
    enabled: appointment && Boolean(queueId) && Boolean(appointmentDate),
  });
  return { tiers, site, availability };
}
