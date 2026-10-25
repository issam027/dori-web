import { useCallback, useEffect, useEffectEvent } from 'react';
import {
  QueueRealtimeGateway,
  type QueueDisplayChangedEvent,
  type QueuePositionChangedEvent,
  type QueueRealtimeChannel,
  type QueueRealtimeEvent,
} from './queue-realtime-gateway';

interface QueueRealtimeOptions<TChannel extends QueueRealtimeChannel> {
  queueIds: readonly string[];
  credential: string | null | undefined;
  getCredential: () => string | null | undefined;
  onEvent: (event: QueueRealtimeEvent<TChannel>) => void;
  onReconnect: (queueId: string) => void;
}

function useQueueRealtime<TChannel extends QueueRealtimeChannel>(
  channel: TChannel,
  options: QueueRealtimeOptions<TChannel>,
): void {
  const queueKey = [...new Set(options.queueIds)].sort().join(',');
  const { credential, getCredential } = options;
  const onEvent = useEffectEvent(options.onEvent);
  const onReconnect = useEffectEvent(options.onReconnect);

  useEffect(() => {
    if (!credential || !queueKey) return;
    const gateway = new QueueRealtimeGateway({
      channel,
      getCredential: () => getCredential()?.trim() ?? '',
      onEvent,
      onReconnect,
    });
    gateway.connect(queueKey.split(','));
    return () => {
      gateway.disconnect();
    };
  }, [channel, credential, getCredential, queueKey]);
}

export function useQueueDisplayRealtime(
  options: Omit<QueueRealtimeOptions<'display'>, 'credential' | 'getCredential' | 'onEvent'> & {
    getToken: () => string | null;
    onEvent: (event: QueueDisplayChangedEvent) => void;
  },
): void {
  useQueueRealtime('display', {
    ...options,
    credential: options.getToken(),
    getCredential: options.getToken,
  });
}

export function useQueueTrackingRealtime(
  options: Omit<QueueRealtimeOptions<'tracking'>, 'credential' | 'getCredential' | 'onEvent'> & {
    registrationToken: string | null | undefined;
    onEvent: (event: QueuePositionChangedEvent) => void;
  },
): void {
  const getCredential = useCallback(() => options.registrationToken, [options.registrationToken]);
  useQueueRealtime('tracking', {
    ...options,
    credential: options.registrationToken,
    getCredential,
  });
}
