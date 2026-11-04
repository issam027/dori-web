import type { EventSourceMessage } from '@microsoft/fetch-event-source';
import { QueueRealtimeGateway } from './queue-realtime-gateway';
import type { TabRealtimeListener, TabRealtimeSelection } from './tab-realtime-transport';

function harness() {
  const entries: Array<{
    selection: TabRealtimeSelection;
    listener: TabRealtimeListener;
    close: ReturnType<typeof vi.fn>;
  }> = [];
  const transport = {
    subscribe: (selection: TabRealtimeSelection, listener: TabRealtimeListener) => {
      const close = vi.fn();
      entries.push({ selection, listener, close });
      return close;
    },
  };
  const listener = () => {
    const entry = entries[0];
    if (!entry) throw new Error('Missing subscription');
    return entry.listener;
  };
  return { entries, transport, listener };
}
const message = (event: string, data: unknown): EventSourceMessage => ({
  event,
  data: JSON.stringify(data),
  id: '',
});

it('registers all unique display queues as one logical subscription and cleans up', () => {
  const h = harness();
  const gateway = new QueueRealtimeGateway({
    channel: 'display',
    getCredential: () => 'jwt',
    onEvent: vi.fn(),
    onReconnect: vi.fn(),
    transport: h.transport,
  });
  gateway.connect(['b', 'a', 'a']);
  gateway.connect(['a']);
  expect(h.entries).toHaveLength(1);
  expect(h.entries[0]?.selection).toEqual({ kind: 'display', queueIds: ['a', 'b'] });
  gateway.disconnect();
  expect(h.entries[0]?.close).toHaveBeenCalledTimes(1);
});
it('filters another listener queue and rejects malformed events', () => {
  const h = harness();
  const received = vi.fn(),
    error = vi.fn();
  const gateway = new QueueRealtimeGateway({
    channel: 'display',
    getCredential: () => 'jwt',
    onEvent: received,
    onReconnect: vi.fn(),
    onError: error,
    transport: h.transport,
  });
  gateway.connect(['a']);
  h.listener().onMessage(
    message('queue_display_changed', {
      queueId: 'b',
      reason: 'registration_called',
      timestamp: '2026-11-04T10:00:00Z',
    }),
  );
  h.listener().onMessage(
    message('queue_display_changed', {
      queueId: 'a',
      reason: 'unknown',
      timestamp: '2026-11-04T10:00:00Z',
    }),
  );
  h.listener().onMessage(
    message('queue_display_changed', {
      queueId: 'a',
      reason: 'appointment_checked_in',
      timestamp: '2026-11-04T10:00:00Z',
    }),
  );
  expect(received).toHaveBeenCalledTimes(1);
  expect(error).toHaveBeenCalledTimes(1);
  gateway.disconnect();
});
it.each(['display', 'tracking'] as const)(
  'receives canonical estimation events on %s',
  (channel) => {
    const h = harness();
    const received = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel,
      getCredential: () => 'credential',
      onEvent: received,
      onReconnect: vi.fn(),
      transport: h.transport,
    });
    gateway.connect(['a']);
    h.listener().onMessage(
      message(channel === 'display' ? 'queue_display_changed' : 'queue_position_changed', {
        queueId: 'a',
        reason: 'estimation_updated',
        timestamp: '2026-11-04T10:00:00Z',
      }),
    );
    expect(received).toHaveBeenCalledTimes(1);
    gateway.disconnect();
  },
);
it('applies one heartbeat to all subscribed queues and refreshes on connection changes', () => {
  const h = harness();
  const heartbeat = vi.fn(),
    refresh = vi.fn(),
    status = vi.fn();
  const gateway = new QueueRealtimeGateway({
    channel: 'display',
    getCredential: () => 'jwt',
    onEvent: vi.fn(),
    onReconnect: refresh,
    onHeartbeat: heartbeat,
    onStatusChange: status,
    transport: h.transport,
  });
  gateway.connect(['a', 'b']);
  h.listener().onMessage(message('heartbeat', {}));
  expect(heartbeat.mock.calls).toEqual([['a'], ['b']]);
  h.listener().onOpen?.(true);
  expect(refresh.mock.calls).toEqual([['a'], ['b']]);
  h.listener().onStatus?.('reconnecting');
  expect(status).toHaveBeenCalledWith('b', 'reconnecting');
  gateway.disconnect();
});
it('declares direct tracking with its own token getter', () => {
  const h = harness();
  const gateway = new QueueRealtimeGateway({
    channel: 'tracking',
    getCredential: () => 'opaque',
    onEvent: vi.fn(),
    onReconnect: vi.fn(),
    transport: h.transport,
  });
  gateway.connect(['a']);
  const selection = h.entries[0]?.selection;
  expect(selection?.kind).toBe('tracking');
  if (selection?.kind !== 'tracking') throw new Error('Missing tracking');
  expect(selection.mode).toBe('direct');
  expect(selection.getToken()).toBe('opaque');
  gateway.disconnect();
});
