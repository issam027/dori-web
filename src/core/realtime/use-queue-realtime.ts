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
  token: string | null | undefined;
  onEvent: (event: QueueRealtimeEvent<TChannel>) => void;
  onReconnect: () => void;
}

function useQueueRealtime<TChannel extends QueueRealtimeChannel>(
  channel: TChannel,
  options: QueueRealtimeOptions<TChannel>,
): void {
  const queueKey = [...new Set(options.queueIds)].sort().join(',');
  const onEvent = useEffectEvent(options.onEvent);
  const onReconnect = useEffectEvent(options.onReconnect);

  useEffect(() => {
    if (!options.token || !queueKey) return;
    const gateway = new QueueRealtimeGateway({
      channel,
      token: options.token,
      onEvent,
      onReconnect,
    });
    gateway.connect(queueKey.split(','));
    return () => {
      gateway.disconnect();
    };
  }, [channel, options.token, queueKey]);
}

export function useQueueDisplayRealtime(
  options: Omit<QueueRealtimeOptions<'display'>, 'onEvent'> & {
    onEvent: (event: QueueDisplayChangedEvent) => void;
  },
): void {
  useQueueRealtime('display', options);
}

export function useQueueTrackingRealtime(
  options: Omit<QueueRealtimeOptions<'tracking'>, 'onEvent'> & {
    onEvent: (event: QueuePositionChangedEvent) => void;
  },
): void {
  useQueueRealtime('tracking', options);
}
