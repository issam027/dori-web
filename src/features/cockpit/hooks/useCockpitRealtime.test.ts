import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCockpitRealtime } from './useCockpitRealtime';

const mocks = vi.hoisted(() => ({
  listener: undefined as undefined | { onEvent: (event: { queueId: string }) => void },
  refreshQueue: vi.fn(),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => mocks }));
vi.mock('@/core/auth/access-token', () => ({ getAccessToken: () => 'test-token' }));
vi.mock('@/core/notifications/error-presentation', () => ({ notifyError: mocks.notifyError }));
vi.mock('@/core/realtime/use-degraded-realtime-refresh', () => ({
  useDegradedRealtimeRefresh: vi.fn(),
}));
vi.mock('@/core/realtime/use-queue-realtime', () => ({
  useQueueDisplayRealtime: (listener: typeof mocks.listener) => {
    mocks.listener = listener;
    return 'live';
  },
}));
vi.mock('./useCockpit', () => ({
  refreshCockpitQueue: mocks.refreshQueue,
  shouldSkipCockpitRealtimeRefresh: () => false,
  mergeCockpitQueue: vi.fn(),
}));

function setup() {
  return renderHook(
    ({ siteId }) =>
      useCockpitRealtime({ siteId, queueIds: ['queue-1'], refresh: () => Promise.resolve() }),
    { initialProps: { siteId: 'site-1' } },
  );
}
describe('cockpit realtime lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces a burst of events into one queue request', async () => {
    mocks.refreshQueue.mockResolvedValue({});
    const { unmount } = setup();
    act(() => {
      mocks.listener?.onEvent({ queueId: 'queue-1' });
      mocks.listener?.onEvent({ queueId: 'queue-1' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(mocks.refreshQueue).toHaveBeenCalledTimes(1);
    expect(mocks.setQueryData).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('cancels pending requests when changing site or unmounting', async () => {
    const { rerender, unmount } = setup();
    act(() => {
      mocks.listener?.onEvent({ queueId: 'queue-1' });
    });
    rerender({ siteId: 'site-2' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(mocks.refreshQueue).not.toHaveBeenCalled();
    act(() => {
      mocks.listener?.onEvent({ queueId: 'queue-1' });
    });
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(mocks.refreshQueue).not.toHaveBeenCalled();
  });

  it('ignores the response of an old site already in flight', async () => {
    let complete!: (value: unknown) => void;
    mocks.refreshQueue.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const { rerender, unmount } = setup();
    act(() => {
      mocks.listener?.onEvent({ queueId: 'queue-1' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    rerender({ siteId: 'site-2' });
    await act(async () => {
      complete({});
      await Promise.resolve();
    });
    expect(mocks.setQueryData).not.toHaveBeenCalled();
    unmount();
  });
  it('never overwrites the latest queue response with an older request', async () => {
    const completions: Array<(value: unknown) => void> = [];
    mocks.refreshQueue.mockImplementation(
      () =>
        new Promise((resolve) => {
          completions.push(resolve);
        }),
    );
    const { unmount } = setup();
    act(() => {
      mocks.listener?.onEvent({ queueId: 'queue-1' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    act(() => {
      mocks.listener?.onEvent({ queueId: 'queue-1' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    await act(async () => {
      completions[1]?.({ version: 2 });
      await Promise.resolve();
    });
    expect(mocks.setQueryData).toHaveBeenCalledTimes(1);
    await act(async () => {
      completions[0]?.({ version: 1 });
      await Promise.resolve();
    });
    expect(mocks.setQueryData).toHaveBeenCalledTimes(1);
    unmount();
  });
});
