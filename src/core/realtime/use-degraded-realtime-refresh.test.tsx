import { renderHook } from '@testing-library/react';
import { useDegradedRealtimeRefresh } from './use-degraded-realtime-refresh';
import type { QueueRealtimeHealth } from './queue-realtime-gateway';

describe('useDegradedRealtimeRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('refreshes immediately and every 30 seconds only in degraded mode', () => {
    const refresh = vi.fn();
    const { rerender } = renderHook(
      ({ health }) => {
        useDegradedRealtimeRefresh({ health, enabled: true, refresh });
      },
      { initialProps: { health: 'active' as QueueRealtimeHealth } },
    );

    expect(refresh).not.toHaveBeenCalled();
    rerender({ health: 'degraded' });
    expect(refresh).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(3);

    rerender({ health: 'active' });
    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});
