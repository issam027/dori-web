import type { AuditControllerSearchParams } from '@/api/generated/models';
import {
  auditControllerFindById,
  auditControllerSearch,
} from '@/api/generated/audit/audit';

export function searchAuditEvents(params: AuditControllerSearchParams, signal?: AbortSignal) {
  return auditControllerSearch(params, undefined, signal);
}

export function findAuditEvent(eventId: string, signal?: AbortSignal) {
  return auditControllerFindById(eventId, undefined, signal);
}
