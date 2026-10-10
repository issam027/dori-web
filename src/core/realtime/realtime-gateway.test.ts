import { PollingRealtimeGateway } from './realtime-gateway';

describe('PollingRealtimeGateway', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('loads a REST snapshot before polling and shares concurrent refreshes', async () => {
    let calls = 0;
    const getSnapshot = vi.fn(() => Promise.resolve({ waiting: ++calls }));
    const listener = vi.fn();
    const gateway = new PollingRealtimeGateway(getSnapshot, 1_000);
    gateway.subscribe(listener);

    await gateway.connect();
    expect(listener).toHaveBeenLastCalledWith({ waiting: 1 });
    await Promise.all([gateway.refresh(), gateway.refresh()]);
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(listener).toHaveBeenLastCalledWith({ waiting: 3 });
    gateway.disconnect();
  });

  it('reports polling failures without producing an unhandled interval rejection', async () => {
    const failure = new Error('network unavailable');
    const getSnapshot = vi
      .fn<() => Promise<{ waiting: number }>>()
      .mockResolvedValueOnce({ waiting: 1 })
      .mockRejectedValue(failure);
    const onError = vi.fn();
    const gateway = new PollingRealtimeGateway(getSnapshot, 1_000, onError);

    await gateway.connect();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(onError).toHaveBeenCalledWith(failure);
    gateway.disconnect();
  });
});
