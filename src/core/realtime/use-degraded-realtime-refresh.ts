import { useEffect, useEffectEvent } from 'react';
import {
  realtimeDegradedRefreshIntervalMs,
  type QueueRealtimeHealth,
} from './queue-realtime-gateway';

export function useDegradedRealtimeRefresh(options: {
  health: QueueRealtimeHealth;
  enabled: boolean;
  refresh: () => void | Promise<void>;
}): void {
  const refresh = useEffectEvent(options.refresh);

  useEffect(() => {
    if (options.health !== 'degraded' || !options.enabled) return;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, realtimeDegradedRefreshIntervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [options.enabled, options.health]);
}
