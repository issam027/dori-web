import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import type {
  CreateRegistrationDto,
  CreateRegistrationResponseDto,
  RegistrationsControllerLookupParams,
  QueueTierResponseDto,
  RegistrationPositionResponseDto,
  RegistrationResponseDto,
} from '@/api/generated/models';
import { queuesControllerFindAll, queuesControllerGetDisplay, queuesControllerGetStatus } from '@/api/generated/queues/queues';
import {
  registrationsControllerCheckIn,
  registrationsControllerGetPublicPosition,
  registrationsControllerLookup,
  registrationsControllerRegister,
} from '@/api/generated/registrations/registrations';
import {
  serviceTiersControllerGetQueueTiers,
  serviceTiersControllerGetRules,
} from '@/api/generated/tiers/tiers';
import { queryKeys } from '@/api/client/query-keys';
import { PollingRealtimeGateway } from '@/core/realtime/realtime-gateway';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';

export function usePublicTracking(token: string) {
  const [position, setPosition] = useState<RegistrationPositionResponseDto>();
  const [error, setError] = useState<'invalid' | 'expired' | 'unavailable'>();
  const gateway = useMemo(
    () =>
      token
        ? new PollingRealtimeGateway(
            async () =>
              (
                await registrationsControllerGetPublicPosition({
                  headers: { 'X-Registration-Token': token },
                })
              ).data,
            10_000,
            (cause) => {
              if (cause instanceof NormalizedApiError) {
                const code = cause.code.toUpperCase();
                if (cause.status === 410 || code.includes('EXPIRED')) {
                  setError('expired');
                  return;
                }
                if (cause.status === 404 || code.includes('INVALID')) {
                  setError('invalid');
                  return;
                }
              }
              setError('unavailable');
            },
          )
        : null,
    [token],
  );
  return { gateway, position, setPosition, error, setError };
}

export function useDisplaySnapshot(options: {
  siteId: number | null;
  allowedQueueIds: readonly number[];
  isGlobal: boolean;
  selectedQueueId?: number;
}) {
  const queues = useQuery({
    queryKey: queryKeys.publicExperience.displayQueues(options.siteId),
    enabled: Boolean(options.siteId),
    queryFn: ({ signal }) =>
      queuesControllerFindAll(
        { siteId: options.siteId ?? undefined, isActive: true, page: 1, pageSize: 100 },
        undefined,
        signal,
      ),
  });
  const allowedQueues =
    queues.data?.data.items.filter(
      (queue) =>
        (options.isGlobal || options.allowedQueueIds.includes(queue.queueId)) &&
        (!options.selectedQueueId || queue.queueId === options.selectedQueueId),
    ) ?? [];
  const displays = useQueries({
    queries: allowedQueues.map((queue) => ({
      queryKey: queryKeys.publicExperience.displaySnapshot(queue.queueId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        queuesControllerGetDisplay(queue.queueId, undefined, signal),
      refetchInterval: 5_000,
    })),
  });
  return { queues, allowedQueues, displays };
}

export function useKioskCatalog(siteId: number | null, queueId: number | undefined, enabled: boolean) {
  const queues = useQuery({
    queryKey: queryKeys.publicExperience.kioskQueues(siteId),
    enabled,
    queryFn: ({ signal }) =>
      queuesControllerFindAll(
        { siteId: siteId ?? undefined, isActive: true, page: 1, pageSize: 100 },
        undefined,
        signal,
      ),
  });
  const queueStatuses = useQueries({
    queries: (queues.data?.data.items ?? []).map((queue) => ({
      queryKey: queryKeys.publicExperience.kioskQueueStatus(queue.queueId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        queuesControllerGetStatus(queue.queueId, undefined, signal),
    })),
  });
  const tiers = useQuery({
    queryKey: queryKeys.publicExperience.kioskTiers(queueId),
    enabled: Boolean(queueId),
    queryFn: ({ signal }) =>
      serviceTiersControllerGetQueueTiers(
        queueId ?? 0,
        { page: 1, pageSize: 100, sort: 'displayOrder:asc' },
        undefined,
        signal,
      ),
  });
  const tierRules = useQueries({
    queries: (tiers.data?.data.items ?? []).map((item) => ({
      queryKey: queryKeys.publicExperience.kioskTierRules(item.queueId, item.tierId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        serviceTiersControllerGetRules(
          item.queueId,
          item.tierId,
          { page: 1, pageSize: 100 },
          undefined,
          signal,
        ),
      enabled: item.isActive,
    })),
  });
  return { queues, queueStatuses, tiers, tierRules };
}

export function useKioskRegistration(options: {
  createDto: () => CreateRegistrationDto;
  lookupDto: () => RegistrationsControllerLookupParams;
  selectedRegistration: () => RegistrationResponseDto | undefined;
  onRegistered: (data: CreateRegistrationResponseDto) => void;
  onLookup: (data: RegistrationResponseDto) => void;
  onCheckedIn: (data: RegistrationResponseDto) => void;
}) {
  const register = useMutation({
    mutationFn: () => registrationsControllerRegister(options.createDto()),
    onSuccess: ({ data }) => {
      options.onRegistered(data);
    },
  });
  const lookup = useMutation({
    mutationFn: () => registrationsControllerLookup(options.lookupDto()),
    onSuccess: ({ data }) => {
      options.onLookup(data);
    },
  });
  const checkIn = useMutation({
    mutationFn: () => {
      const registration = options.selectedRegistration();
      if (!registration) throw new Error('Appointment is required');
      return registrationsControllerCheckIn(registration.registrationId);
    },
    onSuccess: ({ data }) => {
      options.onCheckedIn(data);
    },
  });
  return { register, lookup, checkIn };
}

export type KioskTier = QueueTierResponseDto;
