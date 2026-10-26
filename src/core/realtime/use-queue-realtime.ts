import { useCallback, useEffect, useEffectEvent } from 'react';
import {
  QueueRealtimeGateway,
  type QueueDisplayChangedEvent,
  type QueuePositionChangedEvent,
  type QueueRealtimeChannel,
  type QueueRealtimeEvent,
  type QueueRealtimeStatus,
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
): void {
  const queueKey = [...new Set(options.queueIds)].sort().join(',');
  const { getCredential, refreshCredential } = options;
  const credential = getCredential()?.trim();
  const onEvent = useEffectEvent(options.onEvent);
  const onReconnect = useEffectEvent(options.onReconnect);
  const externalStatusChange = useEffectEvent(options.onStatusChange ?? (() => undefined));
  const externalError = useEffectEvent(options.onError ?? (() => undefined));
  const updateStatus = useRealtimeStatusStore((state) => state.updateStatus);
  const reportError = useRealtimeStatusStore((state) => state.reportError);
  const onStatusChange = useEffectEvent((queueId: string, status: QueueRealtimeStatus) => {
    updateStatus(channel, queueId, status);
    externalStatusChange(queueId, status);
  });
  const onError = useEffectEvent((queueId: string, error: unknown) => {
    reportError(channel, queueId, error);
    externalError(queueId, error);
  });

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
    });
    gateway.connect(queueKey.split(','));
    return () => {
      gateway.disconnect();
    };
  }, [channel, credential, getCredential, queueKey, refreshCredential]);
}

export function useQueueDisplayRealtime(
  options: Omit<
    QueueRealtimeOptions<'display'>,
    'getCredential' | 'refreshCredential' | 'onEvent'
  > & {
    getToken: () => string | null;
    onEvent: (event: QueueDisplayChangedEvent) => void;
  },
): void {
  useQueueRealtime('display', {
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
): void {
  const getCredential = useCallback(() => options.registrationToken, [options.registrationToken]);
  useQueueRealtime('tracking', {
    ...options,
    getCredential,
  });
}
