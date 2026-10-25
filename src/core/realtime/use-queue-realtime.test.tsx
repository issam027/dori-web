import { renderHook } from '@testing-library/react';
import { useQueueDisplayRealtime, useQueueTrackingRealtime } from './use-queue-realtime';

const gatewayMocks = vi.hoisted(() => ({
  construct: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('./queue-realtime-gateway', () => ({
  QueueRealtimeGateway: class {
    connect = gatewayMocks.connect;
    disconnect = gatewayMocks.disconnect;

    constructor(options: unknown) {
      gatewayMocks.construct(options);
    }
  },
}));

describe('queue realtime hooks', () => {
  beforeEach(() => {
    gatewayMocks.construct.mockClear();
    gatewayMocks.connect.mockClear();
    gatewayMocks.disconnect.mockClear();
  });

  it('disconnects tracking when an active registration no longer exposes a queue', () => {
    const { rerender } = renderHook(
      ({ queueIds }) => {
        useQueueTrackingRealtime({
          queueIds,
          registrationToken: 'registration-token',
          onEvent: vi.fn(),
          onReconnect: vi.fn(),
        });
      },
      { initialProps: { queueIds: ['queue-1'] } },
    );

    expect(gatewayMocks.construct).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'tracking', getCredential: expect.any(Function) }),
    );
    expect(gatewayMocks.connect).toHaveBeenCalledWith(['queue-1']);

    rerender({ queueIds: [] });

    expect(gatewayMocks.disconnect).toHaveBeenCalledOnce();
  });

  it('subscribes one display socket to every displayed queue', () => {
    renderHook(() => {
      useQueueDisplayRealtime({
        queueIds: ['queue-2', 'queue-1'],
        getToken: () => 'display-jwt',
        onEvent: vi.fn(),
        onReconnect: vi.fn(),
      });
    });

    expect(gatewayMocks.construct).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'display', getCredential: expect.any(Function) }),
    );
    expect(gatewayMocks.connect).toHaveBeenCalledWith(['queue-1', 'queue-2']);
  });
});
