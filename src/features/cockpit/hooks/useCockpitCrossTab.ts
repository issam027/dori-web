import { useEffect, useEffectEvent } from 'react';

const channelName = 'dori-cockpit';

export function broadcastCockpitRefresh(siteId: string | null): void {
  if (!siteId || typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage({ type: 'refresh', siteId });
  channel.close();
}

export function useCockpitCrossTab(siteId: string | null, refresh: () => void): void {
  const onRefresh = useEffectEvent(refresh);
  useEffect(() => {
    if (!siteId || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(channelName);
    channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      const message = event.data as { type?: string; siteId?: string };
      if (message.type === 'refresh' && message.siteId === siteId) onRefresh();
    });
    return () => {
      channel.close();
    };
  }, [siteId]);
}
