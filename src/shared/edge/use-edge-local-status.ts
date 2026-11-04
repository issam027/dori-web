import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useEffect } from 'react';
import { edgeLocalControllerStatus } from '@/api/generated/edge-local-status/edge-local-status';
import type {
  EdgeLocalControllerStatus200,
  EdgeLocalStatusResponseDto,
} from '@/api/generated/models';
import { getAccessToken } from '@/core/auth/access-token';
import { refreshAccessToken } from '@/api/client/http-client';
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

class RejectedLocalStatusStream extends Error {}

/** Mounted once by the application gate. All other consumers share its query cache. */
export function useEdgeLocalStatusRealtime() {
  const client = useQueryClient();
  const enabled = !isCloudDeployment;
  const { health, heartbeat, fail } = useHeartbeatHealth(enabled ? ['edge-local-status'] : []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const base = import.meta.env.PROD ? '' : import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
    void fetchEventSource(base + '/api/v1/edge/local-status/events', {
      signal: controller.signal,
      openWhenHidden: true,
      headers: { Accept: 'text/event-stream' },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        const credential = getAccessToken();
        if (credential) headers.set('Authorization', `Bearer ${credential}`);
        return fetch(input, { ...init, headers });
      },
      onopen: async (response) => {
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream'))
          return;
        if (response.status === 401) {
          try {
            await refreshAccessToken();
          } catch {
            throw new RejectedLocalStatusStream('Session unavailable');
          }
          throw new Error('SSE credential refreshed');
        }
        if (response.status >= 400 && response.status < 500 && response.status !== 429)
          throw new RejectedLocalStatusStream('Local status stream rejected');
        throw new Error('Local status stream unavailable');
      },
      onmessage: (message) => {
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
          if (controller.signal.aborted) return;
          client.setQueryData<EdgeLocalControllerStatus200>(edgeLocalStatusKey, {
            code: 'OK',
            translationKey: null,
            translationParams: {},
            data: snapshot,
          });
        });
      },
      onclose: () => {
        throw new Error('Local status stream closed');
      },
      onerror: (error: unknown) => {
        if (error instanceof RejectedLocalStatusStream) throw error;
        return 3000;
      },
    }).catch(() => {
      if (!controller.signal.aborted) fail();
    });
    return () => {
      controller.abort();
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
