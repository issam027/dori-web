import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getAccessToken } from '@/core/auth/access-token';
import { refreshAccessToken } from '@/api/client/http-client';

function edgeInstallationsRealtimeUrl(): string {
  const baseUrl = import.meta.env.PROD ? '' : import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  return `${baseUrl}/api/v1/edge/installations/realtime/events`;
}

export function subscribeEdgeInstallations(
  onChange: () => void,
  signal: AbortSignal,
): Promise<void> {
  let opened = false;
  return fetchEventSource(edgeInstallationsRealtimeUrl(), {
    signal,
    openWhenHidden: true,
    headers: { Accept: 'text/event-stream' },
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      const token = getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    onopen: async (response) => {
      if (
        response.ok &&
        (response.headers.get('content-type') ?? '').includes('text/event-stream')
      ) {
        if (opened) onChange();
        opened = true;
        return;
      }
      if (response.status === 401) {
        await refreshAccessToken();
        throw new Error('SSE credential refreshed');
      }
      throw new Error(`Installation SSE request failed with status ${String(response.status)}`);
    },
    onmessage: (message) => {
      if (message.event === 'edge_installations_changed') onChange();
    },
    onclose: () => {
      throw new Error('Installation SSE connection closed');
    },
  });
}
