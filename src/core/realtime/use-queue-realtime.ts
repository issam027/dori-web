import { useHeartbeatHealth } from './use-heartbeat-health';
import { useCallback, useEffect, useEffectEvent } from 'react';
import {
  QueueRealtimeGateway,
  type QueueDisplayChangedEvent,
  type QueuePositionChangedEvent,
  type QueueRealtimeChannel,
  type QueueRealtimeEvent,
  type QueueRealtimeHealth,
  type QueueRealtimeStatus,
} from './queue-realtime-gateway';
import { useRealtimeStatusStore } from './realtime-status-store';

interface QueueRealtimeOptions<TChannel extends QueueRealtimeChannel> {
  queueIds: readonly string[];
  getCredential: () => string | null | undefined;
  onEvent: (event: QueueRealtimeEvent<TChannel>) => void;
  onReconnect: (queueId: string) => void;
  onStatusChange?: (queueId: string, status: QueueRealtimeStatus) => void;
  onError?: (queueId: string, error: unknown) => void;
}

function useQueueRealtime<TChannel extends QueueRealtimeChannel>(
  channel: TChannel,
  options: QueueRealtimeOptions<TChannel>,
): QueueRealtimeHealth {
  const queueKey = [...new Set(options.queueIds)].sort().join(',');
  const { getCredential } = options;
  const credential = getCredential()?.trim();
  const onEvent = useEffectEvent(options.onEvent);
  const onReconnect = useEffectEvent(options.onReconnect);
  const externalStatusChange = useEffectEvent(options.onStatusChange ?? (() => undefined));
  const externalError = useEffectEvent(options.onError ?? (() => undefined));
  const updateStatus = useRealtimeStatusStore((state) => state.updateStatus);
  const reportError = useRealtimeStatusStore((state) => state.reportError);
  const { health, heartbeat } = useHeartbeatHealth(options.queueIds);
  const onStatusChange = useEffectEvent((queueId: string, status: QueueRealtimeStatus) => {
    updateStatus(channel, queueId, status);
    externalStatusChange(queueId, status);
  });
  const onError = useEffectEvent((queueId: string, error: unknown) => {
    reportError(channel, queueId, error);
    externalError(queueId, error);
  });
  const onHeartbeat = useEffectEvent((queueId: string) => {
    heartbeat(queueId);
  });

  useEffect(() => {
    if (!credential || !queueKey) return;
    const gateway = new QueueRealtimeGateway({
      channel,
      getCredential: () => getCredential()?.trim() ?? '',
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
  }, [channel, credential, getCredential, queueKey]);
  return queueKey ? health : 'degraded';
}

export function useQueueDisplayRealtime(
  options: Omit<QueueRealtimeOptions<'display'>, 'getCredential' | 'onEvent'> & {
    getToken: () => string | null;
    onEvent: (event: QueueDisplayChangedEvent) => void;
  },
): QueueRealtimeHealth {
  return useQueueRealtime('display', {
    ...options,
    getCredential: options.getToken,
  });
}

export function useQueueTrackingRealtime(
  options: Omit<QueueRealtimeOptions<'tracking'>, 'getCredential' | 'onEvent'> & {
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
