import type { FetchEventSourceInit } from '@microsoft/fetch-event-source';
import { QueueRealtimeGateway, queueRealtimeUrl } from './queue-realtime-gateway';

function createEventStreamHarness() {
  const requests: Array<{ url: RequestInfo; options: FetchEventSourceInit }> = [];
  const eventStream = vi.fn((url: RequestInfo, options: FetchEventSourceInit) => {
    requests.push({ url, options });
    return new Promise<void>((resolve) =>
      options.signal?.addEventListener('abort', () => {
        resolve();
      }),
    );
  });
  return { eventStream, requests };
}

const openedResponse = new Response(null, {
  status: 200,
  headers: { 'Content-Type': 'text/event-stream' },
});

describe('QueueRealtimeGateway', () => {
  it('multiplexes unique display queues over one authenticated stream', async () => {
    const harness = createEventStreamHarness();
    const requestFetch = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(openedResponse);
    let credential = 'jwt-token';
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      getCredential: () => credential,
      onEvent: vi.fn(),
      onReconnect: vi.fn(),
      eventStream: harness.eventStream,
      fetch: requestFetch,
    });

    gateway.connect(['queue-2', 'queue-1', 'queue-1']);

    expect(harness.requests.map(({ url }) => url)).toEqual([
      queueRealtimeUrl(['queue-1', 'queue-2'], 'display'),
    ]);
    const request = harness.requests[0]?.options;
    await request?.fetch?.('stream', { headers: request.headers });
    expect(new Headers(requestFetch.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
      'Bearer jwt-token',
    );
    credential = 'refreshed-jwt-token';
    await request?.fetch?.('stream', { headers: request.headers });
    expect(new Headers(requestFetch.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe(
      'Bearer refreshed-jwt-token',
    );
    expect(new Headers(request?.headers).get('Accept')).toBe('text/event-stream');
    expect(new Headers(request?.headers).get('last-event-id')).toBe('');
    expect(request?.openWhenHidden).toBe(true);
  });

  it('uses the registration token and accepts only valid tracking events', async () => {
    const harness = createEventStreamHarness();
    const requestFetch = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(openedResponse);
    const onEvent = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'tracking',
      getCredential: () => 'tracking-token',
      onEvent,
      onReconnect: vi.fn(),
      eventStream: harness.eventStream,
      fetch: requestFetch,
    });

    gateway.connect(['queue-1']);
    const request = harness.requests[0]?.options;
    await request?.fetch?.('stream', { headers: request.headers });
    request?.onmessage?.({
      event: 'queue_position_changed',
      data: JSON.stringify({ queueId: 'queue-1', timestamp: '2026-10-25T14:00:00.000Z' }),
      id: '',
      retry: undefined,
    });
    request?.onmessage?.({
      event: 'queue_position_changed',
      data: JSON.stringify({ queueId: 'queue-2', timestamp: '2026-10-25T14:00:00.000Z' }),
      id: '',
      retry: undefined,
    });

    expect(new Headers(requestFetch.mock.calls[0]?.[1]?.headers).get('X-Registration-Token')).toBe(
      'tracking-token',
    );
    expect(new Headers(requestFetch.mock.calls[0]?.[1]?.headers).get('last-event-id')).toBe('');
    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith({
      queueId: 'queue-1',
      timestamp: '2026-10-25T14:00:00.000Z',
    });
  });

  it('filters malformed, unrelated and unsupported display events', () => {
    const harness = createEventStreamHarness();
    const onEvent = vi.fn();
    const onError = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      getCredential: () => 'jwt',
      onEvent,
      onReconnect: vi.fn(),
      onError,
      eventStream: harness.eventStream,
    });
    gateway.connect(['queue-1']);
    const onmessage = harness.requests[0]?.options.onmessage;

    onmessage?.({ event: 'queue_position_changed', data: '{}', id: '', retry: undefined });
    onmessage?.({ event: 'queue_display_changed', data: '{', id: '', retry: undefined });
    onmessage?.({
      event: 'queue_display_changed',
      data: JSON.stringify({
        queueId: 'queue-1',
        reason: 'unknown',
        timestamp: '2026-10-25T14:00:00.000Z',
      }),
      id: '',
      retry: undefined,
    });
    onmessage?.({
      event: 'queue_display_changed',
      data: JSON.stringify({
        queueId: 'queue-1',
        reason: 'registration_called',
        timestamp: '2026-10-25T14:00:00.000Z',
      }),
      id: '',
      retry: undefined,
    });

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('accepts appointment check-in display events emitted by the API', () => {
    const harness = createEventStreamHarness();
    const onEvent = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      getCredential: () => 'jwt',
      onEvent,
      onReconnect: vi.fn(),
      eventStream: harness.eventStream,
    });
    gateway.connect(['queue-1']);

    harness.requests[0]?.options.onmessage?.({
      event: 'queue_display_changed',
      data: JSON.stringify({
        queueId: 'queue-1',
        reason: 'appointment_checked_in',
        timestamp: '2026-10-25T14:00:00.000Z',
      }),
      id: 'event-1',
      retry: 3000,
    });

    expect(onEvent).toHaveBeenCalledOnce();
  });

  it('reports heartbeats without treating them as business events', () => {
    const harness = createEventStreamHarness();
    const onEvent = vi.fn();
    const onHeartbeat = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      getCredential: () => 'jwt',
      onEvent,
      onReconnect: vi.fn(),
      onHeartbeat,
      eventStream: harness.eventStream,
    });
    gateway.connect(['queue-1']);

    harness.requests[0]?.options.onmessage?.({
      event: 'heartbeat',
      data: JSON.stringify({ timestamp: '2026-10-25T14:00:00.000Z' }),
      id: '',
      retry: undefined,
    });

    expect(onHeartbeat).toHaveBeenCalledWith('queue-1');
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('refreshes the affected queue immediately after every reconnection', async () => {
    const harness = createEventStreamHarness();
    const onReconnect = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      getCredential: () => 'jwt',
      onEvent: vi.fn(),
      onReconnect,
      eventStream: harness.eventStream,
    });
    gateway.connect(['queue-1']);
    const onopen = harness.requests[0]?.options.onopen;

    await onopen?.(openedResponse);
    await onopen?.(openedResponse);

    expect(onReconnect).toHaveBeenCalledOnce();
    expect(onReconnect).toHaveBeenCalledWith('queue-1');
  });

  it('refreshes an expired display credential and exposes connection states', async () => {
    const harness = createEventStreamHarness();
    const refreshCredential = vi.fn().mockResolvedValue(undefined);
    const onStatusChange = vi.fn();
    const onError = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      getCredential: () => 'jwt',
      refreshCredential,
      onEvent: vi.fn(),
      onReconnect: vi.fn(),
      onStatusChange,
      onError,
      eventStream: harness.eventStream,
    });
    gateway.connect(['queue-1']);
    const request = harness.requests[0]?.options;

    await expect(request?.onopen?.(new Response(null, { status: 401 }))).rejects.toThrow(
      'SSE credential refreshed',
    );
    await request?.onopen?.(openedResponse);
    const fatalError = await request
      ?.onopen?.(new Response(null, { status: 403 }))
      .catch((error: unknown) => error);
    expect(() => request?.onerror?.(fatalError)).toThrow();

    expect(refreshCredential).toHaveBeenCalledOnce();
    expect(onStatusChange.mock.calls).toEqual([
      ['queue-1', 'connecting'],
      ['queue-1', 'reconnecting'],
      ['queue-1', 'connected'],
      ['queue-1', 'failed'],
    ]);
    expect(onError).toHaveBeenCalledWith('queue-1', fatalError);
  });

  it('aborts every stream when unsubscribing', () => {
    const harness = createEventStreamHarness();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      getCredential: () => 'jwt',
      onEvent: vi.fn(),
      onReconnect: vi.fn(),
      eventStream: harness.eventStream,
    });
    gateway.connect(['queue-1', 'queue-2']);

    gateway.disconnect();

    expect(harness.requests.every(({ options }) => options.signal?.aborted)).toBe(true);
  });
});

it.each(['display', 'tracking'] as const)(
  'accepts canonical estimation notifications on %s',
  (channel) => {
    const harness = createEventStreamHarness();
    const onEvent = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel,
      getCredential: () => 'credential',
      onEvent,
      onReconnect: vi.fn(),
      eventStream: harness.eventStream,
    });
    gateway.connect(['queue-1']);
    harness.requests[0]?.options.onmessage?.({
      event: channel === 'display' ? 'queue_display_changed' : 'queue_position_changed',
      data: JSON.stringify({
        queueId: 'queue-1',
        reason: 'estimation_updated',
        timestamp: '2026-11-03T10:00:00Z',
      }),
      id: '1',
    });
    expect(onEvent).toHaveBeenCalledOnce();
    gateway.disconnect();
  },
);

it('keeps queue heartbeat identity and releases the shared connection', async () => {
  const harness = createEventStreamHarness();
  const heartbeat = vi.fn();
  const event = vi.fn();
  const status = vi.fn();
  const gateway = new QueueRealtimeGateway({
    channel: 'display',
    getCredential: () => 'jwt',
    onEvent: event,
    onReconnect: vi.fn(),
    onHeartbeat: heartbeat,
    onStatusChange: status,
    eventStream: harness.eventStream,
  });
  gateway.connect(['a', 'b', 'c', 'd', 'e', 'f']);
  expect(harness.requests).toHaveLength(1);
  const request = harness.requests[0];
  if (!request) throw new Error('Expected one multiplexed stream');
  const stream = request.options;
  await stream.onopen?.(openedResponse);
  stream.onmessage?.({
    event: 'heartbeat',
    id: '',
    data: JSON.stringify({ queueId: 'b', timestamp: '2026-11-03T12:00:00Z' }),
  });
  expect(heartbeat.mock.calls).toEqual([['b']]);
  stream.onmessage?.({
    event: 'queue_display_changed',
    id: '1',
    data: JSON.stringify({
      queueId: 'f',
      reason: 'registration_called',
      timestamp: '2026-11-03T12:00:00Z',
    }),
  });
  expect(event).toHaveBeenCalledWith(expect.objectContaining({ queueId: 'f' }));
  gateway.disconnect();
  expect(stream.signal?.aborted).toBe(true);
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f'])
    expect(status).toHaveBeenCalledWith(id, 'closed');
});
