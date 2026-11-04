import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tabRealtimeTransport } from '@/core/realtime/tab-realtime-transport';
import { useEffect } from 'react';
import { edgeLocalControllerStatus } from '@/api/generated/edge-local-status/edge-local-status';
import type {
  EdgeLocalControllerStatus200,
  EdgeLocalStatusResponseDto,
} from '@/api/generated/models';
import { isCloudDeployment } from '@/core/config/deployment-mode';
import { useHeartbeatHealth } from '@/core/realtime/use-heartbeat-health';
import { useDegradedRealtimeRefresh } from '@/core/realtime/use-degraded-realtime-refresh';

export const edgeLocalStatusKey = ['edge-local-status'] as const;

export function useEdgeLocalStatus() {
  return useQuery({
    queryKey: edgeLocalStatusKey,
    queryFn: ({ signal }) => edgeLocalControllerStatus(undefined, signal),
    enabled: !isCloudDeployment,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function parseEdgeLocalStatus(data: string): EdgeLocalStatusResponseDto | undefined {
  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const item = parsed as Record<string, unknown>;
    if (typeof item.configured !== 'boolean') return undefined;
    if (
      item.deploymentStatus !== 'active' &&
      item.deploymentStatus !== 'revoked' &&
      item.deploymentStatus !== 'unknown'
    )
      return undefined;
    if (
      item.cloudReachability !== 'connected' &&
      item.cloudReachability !== 'unreachable' &&
      item.cloudReachability !== 'not_configured'
    )
      return undefined;
    if (item.lastCloudSuccessAt != null && typeof item.lastCloudSuccessAt !== 'string')
      return undefined;
    if (item.lastCloudError != null && typeof item.lastCloudError !== 'string') return undefined;
    return {
      configured: item.configured,
      deploymentStatus: item.deploymentStatus,
      cloudReachability: item.cloudReachability,
      lastCloudSuccessAt:
        typeof item.lastCloudSuccessAt === 'string' ? item.lastCloudSuccessAt : null,
      lastCloudError: typeof item.lastCloudError === 'string' ? item.lastCloudError : null,
    };
  } catch {
    return undefined;
  }
}

/** Mounted once by the application gate. All other consumers share its query cache. */
export function useEdgeLocalStatusRealtime() {
  const client = useQueryClient();
  const enabled = !isCloudDeployment;
  const { health, heartbeat, fail } = useHeartbeatHealth(enabled ? ['edge-local-status'] : []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const unsubscribe = tabRealtimeTransport.subscribe(
      { kind: 'local-status' },
      {
        onMessage: (message) => {
          if (message.event === 'heartbeat') {
            heartbeat('edge-local-status');
            return;
          }
          if (message.event !== 'edge_local_status') return;
          const snapshot = parseEdgeLocalStatus(message.data);
          if (!snapshot) {
            fail();
            return;
          }
          void client.cancelQueries({ queryKey: edgeLocalStatusKey, exact: true }).then(() => {
            if (!active) return;
            client.setQueryData<EdgeLocalControllerStatus200>(edgeLocalStatusKey, {
              code: 'OK',
              translationKey: null,
              translationParams: {},
              data: snapshot,
            });
          });
        },
        onStatus: (status) => {
          if (status === 'failed') fail();
        },
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client, enabled, heartbeat, fail]);
  useDegradedRealtimeRefresh({
    enabled,
    health,
    refresh: async () => {
      await client.refetchQueries({ queryKey: edgeLocalStatusKey, exact: true, type: 'active' });
    },
  });
  return health;
}
