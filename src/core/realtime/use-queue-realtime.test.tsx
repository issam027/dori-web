import { renderHook } from '@testing-library/react';
import { useQueueDisplayRealtime, useQueueTrackingRealtime } from './use-queue-realtime';

const gatewayMocks = vi.hoisted(() => ({
  construct: vi.fn<(options: unknown) => void>(),
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

    const trackingOptions = gatewayMocks.construct.mock.calls[0]?.[0] as {
      channel: string;
      credential: string;
    };
    expect(trackingOptions.channel).toBe('tracking');
    expect(trackingOptions.credential).toBe('registration-token');
    expect(gatewayMocks.connect).toHaveBeenCalledWith(['queue-1']);

    rerender({ queueIds: [] });

    expect(gatewayMocks.disconnect).toHaveBeenCalledOnce();
  });

  it('subscribes one display stream to every displayed queue', () => {
    const getToken = () => 'display-jwt';
    const { rerender } = renderHook(
      ({ queueIds }) => {
        useQueueDisplayRealtime({
          queueIds,
          getToken,
          onEvent: vi.fn(),
          onReconnect: vi.fn(),
        });
      },
      { initialProps: { queueIds: ['queue-2', 'queue-1'] } },
    );

    const displayOptions = gatewayMocks.construct.mock.calls[0]?.[0] as {
      channel: string;
      credential: string;
    };
    expect(displayOptions.channel).toBe('display');
    expect(displayOptions.credential).toBe('display-jwt');
    expect(gatewayMocks.connect).toHaveBeenCalledWith(['queue-1', 'queue-2']);

    rerender({ queueIds: ['queue-1', 'queue-2'] });

    expect(gatewayMocks.construct).toHaveBeenCalledOnce();
    expect(gatewayMocks.disconnect).not.toHaveBeenCalled();
  });
});
