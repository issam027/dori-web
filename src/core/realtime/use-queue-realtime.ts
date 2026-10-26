import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  QueueRealtimeGateway,
  type QueueDisplayChangedEvent,
  type QueuePositionChangedEvent,
  type QueueRealtimeChannel,
  type QueueRealtimeEvent,
  type QueueRealtimeHealth,
  type QueueRealtimeStatus,
  realtimeHeartbeatTimeoutMs,
} from './queue-realtime-gateway';
import { refreshAccessToken } from '@/api/client/http-client';
import { useRealtimeStatusStore } from './realtime-status-store';

interface QueueRealtimeOptions<TChannel extends QueueRealtimeChannel> {
  queueIds: readonly string[];
  getCredential: () => string | null | undefined;
  refreshCredential?: () => Promise<void>;
  onEvent: (event: QueueRealtimeEvent<TChannel>) => void;
  onReconnect: (queueId: string) => void;
  onStatusChange?: (queueId: string, status: QueueRealtimeStatus) => void;
  onError?: (queueId: string, error: unknown) => void;
}

async function refreshDisplayCredential(): Promise<void> {
  await refreshAccessToken();
}

function useQueueRealtime<TChannel extends QueueRealtimeChannel>(
  channel: TChannel,
  options: QueueRealtimeOptions<TChannel>,
): QueueRealtimeHealth {
  const queueKey = [...new Set(options.queueIds)].sort().join(',');
  const { getCredential, refreshCredential } = options;
  const credential = getCredential()?.trim();
  const onEvent = useEffectEvent(options.onEvent);
  const onReconnect = useEffectEvent(options.onReconnect);
  const externalStatusChange = useEffectEvent(options.onStatusChange ?? (() => undefined));
  const externalError = useEffectEvent(options.onError ?? (() => undefined));
  const updateStatus = useRealtimeStatusStore((state) => state.updateStatus);
  const reportError = useRealtimeStatusStore((state) => state.reportError);
  const [health, setHealth] = useState<QueueRealtimeHealth>('connecting');
  const heartbeats = useRef(new Map<string, number>());
  const onStatusChange = useEffectEvent((queueId: string, status: QueueRealtimeStatus) => {
    if (status === 'connecting') setHealth('connecting');
    updateStatus(channel, queueId, status);
    externalStatusChange(queueId, status);
  });
  const onError = useEffectEvent((queueId: string, error: unknown) => {
    reportError(channel, queueId, error);
    externalError(queueId, error);
  });
  const onHeartbeat = useEffectEvent((queueId: string) => {
    const now = Date.now();
    heartbeats.current.set(queueId, now);
    const queueIds = queueKey ? queueKey.split(',') : [];
    if (
      queueIds.every((id) => {
        const lastHeartbeat = heartbeats.current.get(id);
        return lastHeartbeat !== undefined && now - lastHeartbeat <= realtimeHeartbeatTimeoutMs;
      })
    )
      setHealth('active');
  });

  useEffect(() => {
    heartbeats.current.clear();
    if (!queueKey) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const queueIds = queueKey.split(',');
      const allHealthy = queueIds.every((queueId) => {
        const lastHeartbeat = heartbeats.current.get(queueId);
        return lastHeartbeat !== undefined && now - lastHeartbeat <= realtimeHeartbeatTimeoutMs;
      });
      if (allHealthy) setHealth('active');
      else if (now - startedAt >= realtimeHeartbeatTimeoutMs) setHealth('degraded');
    }, 5_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [queueKey]);

  useEffect(() => {
    if (!credential || !queueKey) return;
    const gateway = new QueueRealtimeGateway({
      channel,
      getCredential: () => getCredential()?.trim() ?? '',
      refreshCredential,
      onEvent,
      onReconnect,
      onStatusChange,
      onError,
      onHeartbeat,
    });
    gateway.connect(queueKey.split(','));
    return () => {
      gateway.disconnect();
    };
  }, [channel, credential, getCredential, queueKey, refreshCredential]);
  return health;
}

export function useQueueDisplayRealtime(
  options: Omit<
    QueueRealtimeOptions<'display'>,
    'getCredential' | 'refreshCredential' | 'onEvent'
  > & {
    getToken: () => string | null;
    onEvent: (event: QueueDisplayChangedEvent) => void;
  },
): QueueRealtimeHealth {
  return useQueueRealtime('display', {
    ...options,
    getCredential: options.getToken,
    refreshCredential: refreshDisplayCredential,
  });
}

export function useQueueTrackingRealtime(
  options: Omit<
    QueueRealtimeOptions<'tracking'>,
    'getCredential' | 'refreshCredential' | 'onEvent'
  > & {
    registrationToken: string | null | undefined;
    onEvent: (event: QueuePositionChangedEvent) => void;
  },
): QueueRealtimeHealth {
  const getCredential = useCallback(() => options.registrationToken, [options.registrationToken]);
  return useQueueRealtime('tracking', {
    ...options,
    getCredential,
  });
}
