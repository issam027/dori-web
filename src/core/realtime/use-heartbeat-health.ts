import { useCallback, useEffect, useMemo, useState } from 'react';
import { realtimeHeartbeatTimeoutMs, type QueueRealtimeHealth } from './queue-realtime-gateway';

/** Browser timers inspect received heartbeats only; this hook performs no network reads. */
export function useHeartbeatHealth(identities: readonly string[]) {
  const key = [...new Set(identities)].sort().join(',');
  const context = useMemo(() => ({ key, beats: new Map<string, number>() }), [key]);
  const [state, setState] = useState<{ context: typeof context; health: QueueRealtimeHealth }>({
    context,
    health: 'connecting',
  });
  useEffect(() => {
    if (!context.key) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const healthy = context.key.split(',').every((id) => {
        const last = context.beats.get(id);
        return last !== undefined && now - last <= realtimeHeartbeatTimeoutMs;
      });
      if (healthy || now - startedAt >= realtimeHeartbeatTimeoutMs) {
        const health = healthy ? 'active' : 'degraded';
        setState((previous) =>
          previous.context === context && previous.health === health
            ? previous
            : { context, health },
        );
      }
    }, 5000);
    return () => {
      window.clearInterval(timer);
    };
  }, [context]);
  const heartbeat = useCallback(
    (identity: string) => {
      const ids = context.key ? context.key.split(',') : [];
      if (!ids.includes(identity)) return;
      const now = Date.now();
      context.beats.set(identity, now);
      if (
        ids.every((id) => {
          const last = context.beats.get(id);
          return last !== undefined && now - last <= realtimeHeartbeatTimeoutMs;
        })
      ) {
        setState((previous) =>
          previous.context === context && previous.health === 'active'
            ? previous
            : { context, health: 'active' },
        );
      }
    },
    [context],
  );
  const fail = useCallback(() => {
    context.beats.clear();
    setState({ context, health: 'degraded' });
  }, [context]);
  return {
    health: state.context === context ? state.health : ('connecting' as QueueRealtimeHealth),
    heartbeat,
    fail,
  };
}
