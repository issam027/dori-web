import { tabRealtimeTransport } from '@/core/realtime/tab-realtime-transport';

export function subscribeEdgeInstallations(
  onChange: () => void,
  signal: AbortSignal,
  onHeartbeat: () => void = () => undefined,
): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const unsubscribe = tabRealtimeTransport.subscribe(
      { kind: 'installations' },
      {
        onOpen: () => {
          onChange();
        },
        onMessage: (message) => {
          if (message.event === 'heartbeat') onHeartbeat();
          if (message.event === 'edge_installations_changed') onChange();
        },
        onStatus: (status) => {
          if (status === 'failed') reject(new Error('Installation realtime stream unavailable'));
        },
      },
    );
    signal.addEventListener(
      'abort',
      () => {
        unsubscribe();
        resolve();
      },
      { once: true },
    );
  });
}
