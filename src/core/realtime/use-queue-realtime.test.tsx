import { renderHook } from '@testing-library/react';
import { useQueueRealtime } from './use-queue-realtime';

const gatewayMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('./queue-realtime-gateway', () => ({
  QueueRealtimeGateway: class {
    connect = gatewayMocks.connect;
    disconnect = gatewayMocks.disconnect;
  },
}));

describe('useQueueRealtime', () => {
  beforeEach(() => {
    gatewayMocks.connect.mockClear();
    gatewayMocks.disconnect.mockClear();
  });

  it('disconnects when an active mobile registration no longer exposes a queue', () => {
    const { rerender } = renderHook(
      ({ queueIds }) => {
        useQueueRealtime({
          queueIds,
          token: 'registration-token',
          onEvent: vi.fn(),
          onReconnect: vi.fn(),
        });
      },
      { initialProps: { queueIds: ['queue-1'] } },
    );

    expect(gatewayMocks.connect).toHaveBeenCalledWith(['queue-1']);

    rerender({ queueIds: [] });

    expect(gatewayMocks.disconnect).toHaveBeenCalledOnce();
  });

  it('subscribes one socket to every queue displayed by the room screen', () => {
    renderHook(() => {
      useQueueRealtime({
        queueIds: ['queue-2', 'queue-1'],
        token: 'display-jwt',
        onEvent: vi.fn(),
        onReconnect: vi.fn(),
      });
    });

    expect(gatewayMocks.connect).toHaveBeenCalledWith(['queue-1', 'queue-2']);
  });
});
