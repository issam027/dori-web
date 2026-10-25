import { useEffect, useEffectEvent } from 'react';
import { QueueRealtimeGateway, type QueueRealtimeEvent } from './queue-realtime-gateway';

interface UseQueueRealtimeOptions {
  queueIds: readonly string[];
  token: string | null | undefined;
  onEvent: (event: QueueRealtimeEvent) => void;
  onReconnect: () => void;
}

export function useQueueRealtime(options: UseQueueRealtimeOptions): void {
  const queueKey = [...new Set(options.queueIds)].sort().join(',');
  const onEvent = useEffectEvent(options.onEvent);
  const onReconnect = useEffectEvent(options.onReconnect);

  useEffect(() => {
    if (!options.token || !queueKey) return;
    const gateway = new QueueRealtimeGateway({
      token: options.token,
      onEvent,
      onReconnect,
    });
    gateway.connect(queueKey.split(','));
    return () => {
      gateway.disconnect();
    };
  }, [options.token, queueKey]);
}
