import { useEffect, useEffectEvent } from 'react';
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
  onEvent: (event: QueueRealtimeEvent<TChannel>) => void;
  onReconnect: (queueId: string) => void;
}

function useQueueRealtime<TChannel extends QueueRealtimeChannel>(
  channel: TChannel,
  options: QueueRealtimeOptions<TChannel>,
): void {
  const queueKey = [...new Set(options.queueIds)].sort().join(',');
  const credential = options.credential?.trim();
  const onEvent = useEffectEvent(options.onEvent);
  const onReconnect = useEffectEvent(options.onReconnect);

  useEffect(() => {
    if (!credential || !queueKey) return;
    const gateway = new QueueRealtimeGateway({
      channel,
      credential,
      onEvent,
      onReconnect,
    });
    gateway.connect(queueKey.split(','));
    return () => {
      gateway.disconnect();
    };
  }, [channel, credential, queueKey]);
}

export function useQueueDisplayRealtime(
  options: Omit<QueueRealtimeOptions<'display'>, 'credential' | 'onEvent'> & {
    getToken: () => string | null;
    onEvent: (event: QueueDisplayChangedEvent) => void;
  },
): void {
  useQueueRealtime('display', {
    ...options,
    credential: options.getToken(),
  });
}

export function useQueueTrackingRealtime(
  options: Omit<QueueRealtimeOptions<'tracking'>, 'credential' | 'onEvent'> & {
    registrationToken: string | null | undefined;
    onEvent: (event: QueuePositionChangedEvent) => void;
  },
): void {
  useQueueRealtime('tracking', {
    ...options,
    credential: options.registrationToken,
  });
}
