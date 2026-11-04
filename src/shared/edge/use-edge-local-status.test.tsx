import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FetchEventSourceInit } from '@microsoft/fetch-event-source';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/shared/testing/mock-server';
import {
  useEdgeLocalStatus,
  useEdgeLocalStatusRealtime,
  parseEdgeLocalStatus,
} from './use-edge-local-status';

const mocks = vi.hoisted(() => ({
  stream: vi.fn<(_url: string, _options: FetchEventSourceInit) => Promise<void>>(),
}));
vi.mock('@microsoft/fetch-event-source', () => ({ fetchEventSource: mocks.stream }));
vi.mock('@/core/config/deployment-mode', () => ({ isCloudDeployment: false }));
const snapshot = {
  configured: true,
  deploymentStatus: 'active',
  cloudReachability: 'connected',
  lastCloudSuccessAt: '2026-11-04T10:00:00Z',
  lastCloudError: null,
};
const envelope = (data = snapshot) => ({
  code: 'OK',
  translationKey: null,
  translationParams: {},
  data,
});
const streamOptions = () => {
  const options = mocks.stream.mock.calls[0]?.[1];
  if (!options) throw new Error('Missing stream');
  return options;
};
beforeEach(() => {
  mocks.stream.mockReset();
  mocks.stream.mockImplementation(
    (_url, options) =>
      new Promise((resolve) =>
        options.signal?.addEventListener(
          'abort',
          () => {
            resolve();
          },
          { once: true },
        ),
      ),
  );
});
afterEach(() => vi.useRealTimers());

it('shares the initial read and receives updates without polling while heartbeats arrive', async () => {
  let reads = 0;
  mockServer.use(
    http.get('http://localhost:3000/api/v1/edge/local-status', () => {
      reads++;
      return HttpResponse.json(envelope());
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Consumer() {
    const query = useEdgeLocalStatus();
    return <span>{query.data?.data.deploymentStatus}</span>;
  }
  function Gate() {
    useEdgeLocalStatusRealtime();
    return (
      <>
        <Consumer />
        <Consumer />
      </>
    );
  }
  const view = render(
    <QueryClientProvider client={client}>
      <Gate />
    </QueryClientProvider>,
  );
  await waitFor(() => {
    expect(screen.getAllByText('active')).toHaveLength(2);
  });
  expect(reads).toBe(1);
  expect(mocks.stream).toHaveBeenCalledTimes(1);
  vi.useFakeTimers();
  const options = streamOptions();
  for (let i = 0; i < 4; i++) {
    act(() => options.onmessage?.({ event: 'heartbeat', id: '', data: '{}' }));
    await act(() => vi.advanceTimersByTimeAsync(15000));
  }
  expect(reads).toBe(1);
  await act(async () => {
    options.onmessage?.({
      event: 'edge_local_status',
      id: '',
      data: JSON.stringify({ ...snapshot, deploymentStatus: 'revoked' }),
    });
    await Promise.resolve();
  });
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(screen.getAllByText('revoked')).toHaveLength(2);
  expect(reads).toBe(1);
  view.unmount();
  expect(options.signal?.aborted).toBe(true);
  client.clear();
});

it('enables recovery reads only when the stream is degraded and stops them after heartbeat recovery', async () => {
  vi.useFakeTimers();
  const client = new QueryClient();
  const refresh = vi.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const { result, unmount } = renderHook(() => useEdgeLocalStatusRealtime(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  await act(() => vi.advanceTimersByTimeAsync(1));
  const options = streamOptions();
  act(() => options.onmessage?.({ event: 'heartbeat', id: '', data: '{}' }));
  expect(result.current).toBe('active');
  expect(refresh).not.toHaveBeenCalled();
  act(() => {
    options.onerror?.(new Error('brief interruption'));
  });
  expect(result.current).toBe('active');
  expect(refresh).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(40000));
  expect(result.current).toBe('degraded');
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(() => vi.advanceTimersByTimeAsync(30000));
  expect(refresh).toHaveBeenCalledTimes(2);
  act(() => options.onmessage?.({ event: 'heartbeat', id: '', data: '{}' }));
  for (let i = 0; i < 3; i++) {
    await act(() => vi.advanceTimersByTimeAsync(15000));
    act(() => options.onmessage?.({ event: 'heartbeat', id: '', data: '{}' }));
  }
  expect(refresh).toHaveBeenCalledTimes(2);
  unmount();
  client.clear();
});

it('rejects invalid snapshots instead of overwriting the authoritative state', () => {
  expect(parseEdgeLocalStatus(JSON.stringify(snapshot))).toEqual(snapshot);
  expect(parseEdgeLocalStatus('bad')).toBeUndefined();
  expect(
    parseEdgeLocalStatus(JSON.stringify({ ...snapshot, deploymentStatus: 'random' })),
  ).toBeUndefined();
  expect(
    parseEdgeLocalStatus(JSON.stringify({ ...snapshot, lastCloudError: { token: 'private' } })),
  ).toBeUndefined();
});
