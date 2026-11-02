import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  startAccessTokenSync,
} from './access-token';
class TestChannel {
  static current: TestChannel | undefined;
  receive: (event: MessageEvent<unknown>) => void = () => undefined;
  postMessage = vi.fn();
  close = vi.fn();
  constructor() {
    TestChannel.current = this;
  }
  addEventListener(_name: string, callback: (event: MessageEvent<unknown>) => void) {
    this.receive = callback;
  }
}
let stop: () => void = () => undefined;
beforeEach(() => {
  vi.stubGlobal('BroadcastChannel', TestChannel);
  setAccessToken('initial');
});
afterEach(() => {
  stop();
  clearAccessToken();
  vi.unstubAllGlobals();
});
it('accepts a rotated token in memory without echoing it or persisting it', () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  stop = startAccessTokenSync(vi.fn());
  const channel = TestChannel.current;
  if (!channel) throw new Error('Missing channel');
  channel.receive(
    new MessageEvent('message', {
      data: { type: 'access-token', token: 'rotated', at: Date.now() + 1 },
    }),
  );
  expect(getAccessToken()).toBe('rotated');
  expect(channel.postMessage).not.toHaveBeenCalled();
  expect(storage).not.toHaveBeenCalled();
  storage.mockRestore();
});
it('propagates session end and ignores delayed token messages after logout', () => {
  const ended = vi.fn();
  stop = startAccessTokenSync(ended);
  const channel = TestChannel.current;
  if (!channel) throw new Error('Missing channel');
  channel.receive(
    new MessageEvent('message', { data: { type: 'session-ended', at: Date.now() + 1 } }),
  );
  channel.receive(
    new MessageEvent('message', {
      data: { type: 'access-token', token: 'late', at: Date.now() + 2 },
    }),
  );
  expect(getAccessToken()).toBeNull();
  expect(ended).toHaveBeenCalledOnce();
});
