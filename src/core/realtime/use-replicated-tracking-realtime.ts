import { tabRealtimeTransport } from './tab-realtime-transport';
import { useEffect, useEffectEvent } from 'react';
import type { RegistrationPositionResponseDto } from '@/api/generated/models';
import type { QueueRealtimeHealth } from './queue-realtime-gateway';
import { useHeartbeatHealth } from './use-heartbeat-health';

const statuses = new Set([
  'booked',
  'waiting',
  'in_progress',
  'served',
  'no_show',
  'cancelled',
  'expired',
  'closed',
]);
export function parseReplicatedTracking(data: string): RegistrationPositionResponseDto | undefined {
  try {
    const value: unknown = JSON.parse(data);
    if (!value || typeof value !== 'object') return undefined;
    const item = value as Record<string, unknown>;
    if (
      typeof item.status !== 'string' ||
      typeof item.registrationStatus !== 'string' ||
      !statuses.has(item.registrationStatus)
    )
      return undefined;
    if (
      item.position != null &&
      (typeof item.position !== 'number' || !Number.isFinite(item.position))
    )
      return undefined;
    if (
      item.estimatedWaitMinutes != null &&
      (typeof item.estimatedWaitMinutes !== 'number' || !Number.isFinite(item.estimatedWaitMinutes))
    )
      return undefined;
    if (item.sourceConnectivity !== 'online' && item.sourceConnectivity !== 'offline')
      return undefined;
    return {
      languagePreference:
        typeof item.languagePreference === 'string' ? item.languagePreference : undefined,
      status: item.status,
      registrationStatus:
        item.registrationStatus as RegistrationPositionResponseDto['registrationStatus'],
      ticketNumber: typeof item.ticketNumber === 'string' ? item.ticketNumber : undefined,
      queueName: typeof item.queueName === 'string' ? item.queueName : undefined,
      counterName: typeof item.counterName === 'string' ? item.counterName : undefined,
      position: item.position == null ? undefined : item.position,
      estimatedWaitMinutes: item.estimatedWaitMinutes == null ? null : item.estimatedWaitMinutes,
      observedAt: typeof item.observedAt === 'string' ? item.observedAt : undefined,
      sourceConnectivity: item.sourceConnectivity,
    };
  } catch {
    return undefined;
  }
}

export function useReplicatedTrackingRealtime(options: {
  enabled: boolean;
  token: string;
  onExpired?: () => void;
  onSnapshot: (snapshot: RegistrationPositionResponseDto) => void;
}): QueueRealtimeHealth {
  const { health, heartbeat, fail } = useHeartbeatHealth(
    options.enabled && options.token ? [options.token] : [],
  );
  const onSnapshot = useEffectEvent(options.onSnapshot);
  const onExpired = useEffectEvent(options.onExpired ?? (() => undefined));
  useEffect(() => {
    if (!options.enabled || !options.token) return;
    return tabRealtimeTransport.subscribe(
      { kind: 'tracking', mode: 'replicated', getToken: () => options.token },
      {
        onMessage: (message) => {
          if (message.event === 'heartbeat') {
            heartbeat(options.token);
            return;
          }
          if (message.event !== 'tracking_changed') return;
          const snapshot = parseReplicatedTracking(message.data);
          if (snapshot) onSnapshot(snapshot);
          else fail();
        },
        onRejected: (status) => {
          if ([401, 403, 410].includes(status)) onExpired();
        },
        onStatus: (status) => {
          if (status === 'failed') fail();
        },
      },
    );
  }, [options.enabled, options.token, heartbeat, fail]);
  return health;
}
