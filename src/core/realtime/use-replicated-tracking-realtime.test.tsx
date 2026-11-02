import { act, renderHook } from '@testing-library/react';
import type { FetchEventSourceInit } from '@microsoft/fetch-event-source';
import {
  parseReplicatedTracking,
  useReplicatedTrackingRealtime,
} from './use-replicated-tracking-realtime';
const mocks = vi.hoisted(() => ({
  stream: vi.fn<(_url: string, _options: FetchEventSourceInit) => Promise<void>>(),
}));
vi.mock('@microsoft/fetch-event-source', () => ({ fetchEventSource: mocks.stream }));
const snapshot = {
  status: 'waiting',
  registrationStatus: 'waiting',
  position: 3,
  sourceConnectivity: 'online',
  estimatedWaitMinutes: null,
};
beforeEach(() => {
  mocks.stream.mockReset();
  mocks.stream.mockReturnValue(new Promise(() => undefined));
});
it('accepts public snapshots and rejects malformed states', () => {
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
it('opens one token-header stream, receives snapshots directly and aborts on unmount', async () => {
  const received = vi.fn();
  const { result, unmount } = renderHook(() =>
    useReplicatedTrackingRealtime({ enabled: true, token: 'opaque', onSnapshot: received }),
  );
  expect(mocks.stream).toHaveBeenCalledTimes(1);
  const url = mocks.stream.mock.calls[0]?.[0];
  const options = mocks.stream.mock.calls[0]?.[1];
  if (!options) throw new Error('Missing stream');
  expect(url).not.toContain('opaque');
  expect(options.headers).toEqual(expect.objectContaining({ 'X-Registration-Token': 'opaque' }));
  await act(async () => {
    await options.onopen?.(new Response('', { headers: { 'content-type': 'text/event-stream' } }));
  });
  expect(result.current).toBe('active');
  act(() => {
    options.onmessage?.({ event: 'tracking_changed', id: '2', data: JSON.stringify(snapshot) });
  });
  expect(received).toHaveBeenCalledOnce();
  unmount();
  expect(options.signal?.aborted).toBe(true);
});
it('reports expiry without retrying unauthorized access', async () => {
  const expired = vi.fn();
  renderHook(() =>
    useReplicatedTrackingRealtime({
      enabled: true,
      token: 'opaque',
      onSnapshot: vi.fn(),
      onExpired: expired,
    }),
  );
  const options = mocks.stream.mock.calls[0]?.[1];
  if (!options) throw new Error('Missing stream');
  await expect(
    Promise.resolve().then(() => options.onopen?.(new Response('', { status: 410 }))),
  ).rejects.toThrow();
  expect(expired).toHaveBeenCalledOnce();
});
