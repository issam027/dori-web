import { act, renderHook } from '@testing-library/react';
import { useHeartbeatHealth } from './use-heartbeat-health';

afterEach(() => vi.useRealTimers());
it('requires fresh heartbeats from every subscribed stream and recovers after a loss', () => {
  vi.useFakeTimers();
  const { result, unmount } = renderHook(() => useHeartbeatHealth(['one', 'two']));
  act(() => {
    result.current.heartbeat('one');
  });
  expect(result.current.health).toBe('connecting');
  act(() => {
    result.current.heartbeat('two');
  });
  expect(result.current.health).toBe('active');
  act(() => {
    vi.advanceTimersByTime(40000);
  });
  expect(result.current.health).toBe('degraded');
  act(() => {
    result.current.heartbeat('one');
  });
  expect(result.current.health).toBe('degraded');
  act(() => {
    result.current.heartbeat('two');
  });
  expect(result.current.health).toBe('active');
  act(() => { result.current.fail(); });
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(result.current.health).toBe('degraded');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it('does not reuse a previous context heartbeat after navigation', () => {
  const { result, rerender } = renderHook(({ ids }) => useHeartbeatHealth(ids), {
    initialProps: { ids: ['one'] },
  });
  act(() => {
    result.current.heartbeat('one');
  });
  expect(result.current.health).toBe('active');
  rerender({ ids: ['two'] });
  expect(result.current.health).toBe('connecting');
  rerender({ ids: ['one'] });
  expect(result.current.health).toBe('connecting');
});
