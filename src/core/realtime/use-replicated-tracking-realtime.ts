import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useEffect, useEffectEvent, useState } from 'react';
import type { RegistrationPositionResponseDto } from '@/api/generated/models';
import type { QueueRealtimeHealth } from './queue-realtime-gateway';

const statuses = new Set([
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

class RejectedTrackingStream extends Error {}
export function useReplicatedTrackingRealtime(options: {
  enabled: boolean;
  token: string;
  onExpired?: () => void;
  onSnapshot: (snapshot: RegistrationPositionResponseDto) => void;
}): QueueRealtimeHealth {
  const [health, setHealth] = useState<QueueRealtimeHealth>('connecting');
  const onSnapshot = useEffectEvent(options.onSnapshot);
  const onExpired = useEffectEvent(options.onExpired ?? (() => undefined));
  useEffect(() => {
    if (!options.enabled || !options.token) return;
    const controller = new AbortController();
    let lastMessage = Date.now();
    const base = import.meta.env.PROD ? '' : import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
    const watchdog = window.setInterval(() => {
      if (Date.now() - lastMessage > 35_000) setHealth('degraded');
    }, 5_000);
    void fetchEventSource(base + '/api/v1/realtime/tracking', {
      signal: controller.signal,
      openWhenHidden: true,
      headers: { Accept: 'text/event-stream', 'X-Registration-Token': options.token },
      onopen: (response) => {
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          lastMessage = Date.now();
          setHealth('active');
          return Promise.resolve();
        }
        if ([401, 403, 410].includes(response.status)) onExpired();
        if ([400, 401, 403, 404, 410].includes(response.status))
          throw new RejectedTrackingStream('Tracking stream rejected');
        throw new Error('Tracking stream unavailable');
      },
      onmessage: (message) => {
        lastMessage = Date.now();
        if (message.event === 'heartbeat') {
          setHealth('active');
          return;
        }
        if (message.event !== 'tracking_changed') return;
        const snapshot = parseReplicatedTracking(message.data);
        if (snapshot) {
          onSnapshot(snapshot);
          setHealth('active');
        } else setHealth('degraded');
      },
      onclose: () => {
        throw new Error('Tracking stream closed');
      },
      onerror: (error: unknown) => {
        setHealth('degraded');
        if (error instanceof RejectedTrackingStream) throw error;
        return 3000;
      },
    }).catch(() => {
      if (!controller.signal.aborted) setHealth('degraded');
    });
    return () => {
      controller.abort();
      window.clearInterval(watchdog);
    };
  }, [options.enabled, options.token]);
  return health;
}
