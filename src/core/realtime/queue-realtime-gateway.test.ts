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
  it('opens one authenticated display stream per unique queue', () => {
    const harness = createEventStreamHarness();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      credential: 'jwt-token',
      onEvent: vi.fn(),
      onReconnect: vi.fn(),
      eventStream: harness.eventStream,
    });

    gateway.connect(['queue-2', 'queue-1', 'queue-1']);

    expect(harness.requests.map(({ url }) => url)).toEqual([
      queueRealtimeUrl('queue-1', 'display'),
      queueRealtimeUrl('queue-2', 'display'),
    ]);
    const request = harness.requests[0]?.options;
    expect(new Headers(request?.headers).get('Authorization')).toBe('Bearer jwt-token');
    expect(new Headers(request?.headers).get('Accept')).toBe('text/event-stream');
    expect(request?.openWhenHidden).toBe(true);
  });

  it('uses the registration token and accepts only valid tracking events', () => {
    const harness = createEventStreamHarness();
    const onEvent = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'tracking',
      credential: 'tracking-token',
      onEvent,
      onReconnect: vi.fn(),
      eventStream: harness.eventStream,
    });

    gateway.connect(['queue-1']);
    const request = harness.requests[0]?.options;
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

    expect(new Headers(request?.headers).get('X-Registration-Token')).toBe('tracking-token');
    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith({
      queueId: 'queue-1',
      timestamp: '2026-10-25T14:00:00.000Z',
    });
  });

  it('filters malformed, unrelated and unsupported display events', () => {
    const harness = createEventStreamHarness();
    const onEvent = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      credential: 'jwt',
      onEvent,
      onReconnect: vi.fn(),
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
  });

  it('refreshes the affected queue immediately after every reconnection', async () => {
    const harness = createEventStreamHarness();
    const onReconnect = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      credential: 'jwt',
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

  it('aborts every stream when unsubscribing', () => {
    const harness = createEventStreamHarness();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      credential: 'jwt',
      onEvent: vi.fn(),
      onReconnect: vi.fn(),
      eventStream: harness.eventStream,
    });
    gateway.connect(['queue-1', 'queue-2']);

    gateway.disconnect();

    expect(harness.requests.every(({ options }) => options.signal?.aborted)).toBe(true);
  });
});
