import type { Socket } from 'socket.io-client';
import { QueueRealtimeGateway } from './queue-realtime-gateway';

function createSocketHarness() {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const emit = vi.fn();
  const off = vi.fn((event: string) => {
    listeners.delete(event);
  });
  const disconnect = vi.fn();
  const socket = {
    connected: false,
    connect: vi.fn(),
    disconnect,
    emit,
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      listeners.set(event, listener);
    }),
    off,
  } as unknown as Socket;
  return {
    socket,
    disconnect,
    emit,
    off,
    trigger: (event: string, payload?: unknown) => listeners.get(event)?.(payload),
    setConnected: (connected: boolean) => {
      Object.defineProperty(socket, 'connected', { configurable: true, value: connected });
    },
  };
}

describe('QueueRealtimeGateway', () => {
  it('subscribes a display to its queues and accepts display events only', () => {
    const harness = createSocketHarness();
    const onEvent = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      token: 'jwt',
      onEvent,
      onReconnect: vi.fn(),
      createSocket: () => harness.socket,
    });

    gateway.connect(['queue-2', 'queue-1', 'queue-1']);
    harness.setConnected(true);
    harness.trigger('connect');
    harness.trigger('registration_called', { queueId: 'queue-1' });
    harness.trigger('queue_display_changed', {
      queueId: 'queue-1',
      reason: 'registration_called',
    });

    expect(harness.emit).toHaveBeenCalledWith('subscribe', {
      room: 'queue:queue-1:display',
    });
    expect(harness.emit).toHaveBeenCalledWith('subscribe', {
      room: 'queue:queue-2:display',
    });
    expect(harness.emit).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith({
      queueId: 'queue-1',
      reason: 'registration_called',
    });
  });

  it('subscribes tracking to its dedicated room and event', () => {
    const harness = createSocketHarness();
    const onEvent = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'tracking',
      token: 'registration-token',
      onEvent,
      onReconnect: vi.fn(),
      createSocket: () => harness.socket,
    });

    gateway.connect(['queue-1']);
    harness.trigger('connect');
    harness.trigger('queue_position_changed', {
      queueId: 'queue-1',
      reason: 'registration_called',
    });

    expect(harness.emit).toHaveBeenCalledWith('subscribe', {
      room: 'queue:queue-1:tracking',
    });
    expect(onEvent).toHaveBeenCalledOnce();
  });

  it('ignores malformed events and events from unsubscribed queues', () => {
    const harness = createSocketHarness();
    const onEvent = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      token: 'jwt',
      onEvent,
      onReconnect: vi.fn(),
      createSocket: () => harness.socket,
    });

    gateway.connect(['queue-1']);
    harness.trigger('queue_display_changed', undefined);
    harness.trigger('queue_display_changed', {
      queueId: 'queue-1',
      reason: 'unknown_reason',
    });
    harness.trigger('queue_display_changed', {
      queueId: 'queue-2',
      reason: 'registration_created',
    });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('resubscribes and requests a REST refresh after reconnecting', () => {
    const harness = createSocketHarness();
    const onReconnect = vi.fn();
    const gateway = new QueueRealtimeGateway({
      channel: 'tracking',
      token: 'registration-token',
      onEvent: vi.fn(),
      onReconnect,
      createSocket: () => harness.socket,
    });

    gateway.connect(['queue-1']);
    harness.trigger('connect');
    harness.trigger('connect');

    expect(harness.emit).toHaveBeenCalledTimes(2);
    expect(onReconnect).toHaveBeenCalledOnce();
  });

  it('leaves every room and removes the channel listeners', () => {
    const harness = createSocketHarness();
    const gateway = new QueueRealtimeGateway({
      channel: 'display',
      token: 'jwt',
      onEvent: vi.fn(),
      onReconnect: vi.fn(),
      createSocket: () => harness.socket,
    });

    gateway.connect(['queue-1', 'queue-2']);
    harness.setConnected(true);
    harness.trigger('connect');
    gateway.disconnect();

    expect(harness.emit).toHaveBeenCalledWith('unsubscribe', {
      room: 'queue:queue-1:display',
    });
    expect(harness.emit).toHaveBeenCalledWith('unsubscribe', {
      room: 'queue:queue-2:display',
    });
    expect(harness.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(harness.off).toHaveBeenCalledWith('queue_display_changed', expect.any(Function));
    expect(harness.disconnect).toHaveBeenCalledOnce();
  });
});
