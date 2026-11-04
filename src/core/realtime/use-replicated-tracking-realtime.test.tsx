import { act, renderHook } from '@testing-library/react';
import type { TabRealtimeListener, TabRealtimeSelection } from './tab-realtime-transport';
import {
  parseReplicatedTracking,
  useReplicatedTrackingRealtime,
} from './use-replicated-tracking-realtime';
const mocks = vi.hoisted(() => ({
  subscribe:
    vi.fn<(selection: TabRealtimeSelection, listener: TabRealtimeListener) => () => void>(),
  close: vi.fn(),
}));
vi.mock('./tab-realtime-transport', () => ({
  tabRealtimeTransport: { subscribe: mocks.subscribe },
}));
const snapshot = {
  status: 'waiting',
  registrationStatus: 'waiting',
  position: 3,
  sourceConnectivity: 'online',
  estimatedWaitMinutes: null,
};
const listener = () => {
  const found = mocks.subscribe.mock.calls[0]?.[1];
  if (!found) throw new Error('Missing subscription');
  return found;
};
beforeEach(() => {
  mocks.subscribe.mockReset();
  mocks.close.mockReset();
  mocks.subscribe.mockReturnValue(mocks.close);
});
afterEach(() => vi.useRealTimers());
it('preserves the ticket language in replicated snapshots', () => {
  expect(
    parseReplicatedTracking(JSON.stringify({ ...snapshot, languagePreference: 'ar-TN' }))
      ?.languagePreference,
  ).toBe('ar-TN');
});
it('rejects malformed states and positions', () => {
  expect(parseReplicatedTracking(JSON.stringify(snapshot))).toEqual(
    expect.objectContaining({ position: 3, estimatedWaitMinutes: null }),
  );
  expect(parseReplicatedTracking('not json')).toBeUndefined();
  expect(
    parseReplicatedTracking(JSON.stringify({ ...snapshot, position: 'private' })),
  ).toBeUndefined();
  expect(
    parseReplicatedTracking(JSON.stringify({ ...snapshot, registrationStatus: 'unknown' })),
  ).toBeUndefined();
});
it('uses a logical ticket subscription, receives snapshots and releases it on unmount', () => {
  const received = vi.fn();
  const { result, unmount } = renderHook(() =>
    useReplicatedTrackingRealtime({ enabled: true, token: 'opaque', onSnapshot: received }),
  );
  const selection = mocks.subscribe.mock.calls[0]?.[0];
  if (selection?.kind !== 'tracking') throw new Error('Missing ticket');
  expect(selection.mode).toBe('replicated');
  expect(selection.getToken()).toBe('opaque');
  act(() => {
    listener().onMessage({ event: 'heartbeat', id: '', data: '{}' });
  });
  expect(result.current).toBe('active');
  act(() => {
    listener().onMessage({ event: 'tracking_changed', id: '1', data: JSON.stringify(snapshot) });
  });
  expect(received).toHaveBeenCalledOnce();
  unmount();
  expect(mocks.close).toHaveBeenCalledOnce();
});
it('reports rejected tracking credentials', () => {
  const expired = vi.fn();
  renderHook(() =>
    useReplicatedTrackingRealtime({
      enabled: true,
      token: 'opaque',
      onSnapshot: vi.fn(),
      onExpired: expired,
    }),
  );
  act(() => listener().onRejected?.(410));
  expect(expired).toHaveBeenCalledOnce();
});
it('degrades only after missing heartbeats and recovers when they return', async () => {
  vi.useFakeTimers();
  const { result, unmount } = renderHook(() =>
    useReplicatedTrackingRealtime({ enabled: true, token: 'opaque', onSnapshot: vi.fn() }),
  );
  act(() => {
    listener().onMessage({ event: 'heartbeat', id: '', data: '{}' });
  });
  expect(result.current).toBe('active');
  await act(() => vi.advanceTimersByTimeAsync(40000));
  expect(result.current).toBe('degraded');
  act(() => {
    listener().onMessage({ event: 'heartbeat', id: '', data: '{}' });
  });
  expect(result.current).toBe('active');
  unmount();
});
