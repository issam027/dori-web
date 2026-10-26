import { act, renderHook } from '@testing-library/react';
import { useQueueDisplayRealtime, useQueueTrackingRealtime } from './use-queue-realtime';

const gatewayMocks = vi.hoisted(() => ({
  construct: vi.fn<(options: unknown) => void>(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock('./queue-realtime-gateway', () => ({
  realtimeHeartbeatTimeoutMs: 35_000,
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

  afterEach(() => {
    vi.useRealTimers();
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
      getCredential: () => string;
    };
    expect(trackingOptions.channel).toBe('tracking');
    expect(trackingOptions.getCredential()).toBe('registration-token');
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
      getCredential: () => string;
    };
    expect(displayOptions.channel).toBe('display');
    expect(displayOptions.getCredential()).toBe('display-jwt');
    expect(gatewayMocks.connect).toHaveBeenCalledWith(['queue-1', 'queue-2']);

    rerender({ queueIds: ['queue-1', 'queue-2'] });

    expect(gatewayMocks.construct).toHaveBeenCalledOnce();
    expect(gatewayMocks.disconnect).not.toHaveBeenCalled();
  });

  it('becomes active on heartbeat then degraded when heartbeats stop', () => {
    vi.useFakeTimers();
    const getToken = () => 'display-jwt';
    const { result } = renderHook(() =>
      useQueueDisplayRealtime({
        queueIds: ['queue-1'],
        getToken,
        onEvent: vi.fn(),
        onReconnect: vi.fn(),
      }),
    );
    const displayOptions = gatewayMocks.construct.mock.calls[0]?.[0] as {
      onHeartbeat: (queueId: string) => void;
    };

    expect(result.current).toBe('connecting');
    act(() => {
      displayOptions.onHeartbeat('queue-1');
    });
    expect(result.current).toBe('active');

    act(() => {
      vi.advanceTimersByTime(40_000);
    });
    expect(result.current).toBe('degraded');

    act(() => {
      displayOptions.onHeartbeat('queue-1');
    });
    expect(result.current).toBe('active');
  });
});
