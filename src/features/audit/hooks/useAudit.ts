import { useQuery } from '@tanstack/react-query';
import type { AuditControllerSearchParams } from '@/api/generated/models';
import { queryKeys } from '@/api/client/query-keys';
import { findAuditEvent, searchAuditEvents } from '../api/audit-api';

export function useAuditEvents(filters: AuditControllerSearchParams & { page: number }) {
  return useQuery({
    queryKey: queryKeys.audit.list(filters),
    queryFn: ({ signal }) => searchAuditEvents({ ...filters, pageSize: 25 }, signal),
  });
}

export function useAuditEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.audit.detail(eventId),
    enabled: eventId !== undefined,
    queryFn: ({ signal }) => findAuditEvent(eventId ?? '', signal),
  });
}
