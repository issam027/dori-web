import type { EventSourceMessage, FetchEventSourceInit } from '@microsoft/fetch-event-source';
import { TabRealtimeTransport } from './tab-realtime-transport';

function bodyText(options: FetchEventSourceInit): string {
  if (typeof options.body !== 'string') throw new Error('Expected a JSON body');
  return options.body;
}
function urlText(value: RequestInfo | undefined): string {
  if (typeof value !== 'string') throw new Error('Expected a URL string');
  return value;
}
const response = () => new Response(null, { headers: { 'content-type': 'text/event-stream' } });
const message = (event: string): EventSourceMessage => ({ event, data: '{}', id: '' });
const tick = () => vi.advanceTimersByTimeAsync(1);
function harness() {
  const requests: Array<{ url: RequestInfo; options: FetchEventSourceInit }> = [];
  let active = 0,
    maxActive = 0;
  const eventStream = vi.fn((url: RequestInfo, options: FetchEventSourceInit) => {
    requests.push({ url, options });
    active++;
    maxActive = Math.max(maxActive, active);
    return new Promise<void>((resolve) =>
      options.signal?.addEventListener(
        'abort',
        () => {
          active--;
          resolve();
        },
        { once: true },
      ),
    );
  });
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response());
  let credential = 'jwt-one';
  const refreshCredential = vi.fn(() => {
    credential = 'jwt-two';
    return Promise.resolve();
  });
  const transport = new TabRealtimeTransport({
    eventStream,
    fetch,
    getCredential: () => credential,
    refreshCredential,
  });
  const options = (index = 0) => {
    const found = requests[index]?.options;
    if (!found) throw new Error('Missing stream');
    return found;
  };
  return {
    transport,
    requests,
    fetch,
    refreshCredential,
    options,
    maxActive: () => maxActive,
    active: () => active,
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('coalesces local status, installations and every displayed queue into one POST SSE', async () => {
  const h = harness();
  const stop = [
    h.transport.subscribe({ kind: 'local-status' }, { onMessage: vi.fn() }),
    h.transport.subscribe({ kind: 'display', queueIds: ['b', 'a', 'a'] }, { onMessage: vi.fn() }),
    h.transport.subscribe({ kind: 'installations' }, { onMessage: vi.fn() }),
  ];
  await tick();
  expect(h.requests).toHaveLength(1);
  expect(h.options().method).toBe('POST');
  expect(JSON.parse(bodyText(h.options()))).toEqual({
    queueIds: ['a', 'b'],
    localStatus: true,
    installations: true,
    tracking: 'none',
  });
  expect(urlText(h.requests[0]?.url)).toMatch(/\/api\/v1\/realtime\/events$/);
  stop.forEach((close) => {
    close();
  });
  await tick();
  expect(h.active()).toBe(0);
});

it('closes the former connection before replacing its subscriptions', async () => {
  const h = harness();
  const local = h.transport.subscribe({ kind: 'local-status' }, { onMessage: vi.fn() });
  await tick();
  const queues = h.transport.subscribe(
    { kind: 'display', queueIds: ['q'] },
    { onMessage: vi.fn() },
  );
  await tick();
  expect(h.options().signal?.aborted).toBe(true);
  expect(h.requests).toHaveLength(2);
  expect(h.maxActive()).toBe(1);
  queues();
  await tick();
  expect(h.requests).toHaveLength(3);
  expect(h.maxActive()).toBe(1);
  local();
  await tick();
  expect(h.active()).toBe(0);
});

it('deduplicates equal listeners and does not reconnect the remaining subscriber', async () => {
  const h = harness();
  const first = vi.fn(),
    second = vi.fn();
  const one = h.transport.subscribe(
    { kind: 'display', queueIds: ['q'] },
    { onMessage: vi.fn(), onOpen: first },
  );
  await tick();
  await h.options().onopen?.(response());
  const two = h.transport.subscribe(
    { kind: 'display', queueIds: ['q'] },
    { onMessage: vi.fn(), onOpen: second },
  );
  await tick();
  expect(h.requests).toHaveLength(1);
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledWith(false);
  one();
  await tick();
  expect(h.requests).toHaveLength(1);
  expect(h.options().signal?.aborted).toBe(false);
  two();
  await tick();
  expect(h.active()).toBe(0);
});

it('routes named messages to their subscribers and shares the heartbeat', async () => {
  const h = harness();
  const local = vi.fn(),
    queue = vi.fn();
  const stop = [
    h.transport.subscribe({ kind: 'local-status' }, { onMessage: local }),
    h.transport.subscribe({ kind: 'display', queueIds: ['q'] }, { onMessage: queue }),
  ];
  await tick();
  h.options().onmessage?.(message('edge_local_status'));
  expect(local).toHaveBeenCalledTimes(1);
  expect(queue).not.toHaveBeenCalled();
  h.options().onmessage?.(message('queue_display_changed'));
  expect(queue).toHaveBeenCalledTimes(1);
  expect(local).toHaveBeenCalledTimes(1);
  h.options().onmessage?.(message('heartbeat'));
  expect(local).toHaveBeenCalledTimes(2);
  expect(queue).toHaveBeenCalledTimes(2);
  stop.forEach((close) => {
    close();
  });
  await tick();
});

it('uses current credentials on reconnect and refreshes expired authenticated sessions', async () => {
  const h = harness();
  const opened = vi.fn();
  const stop = h.transport.subscribe(
    { kind: 'local-status' },
    { onMessage: vi.fn(), onOpen: opened },
  );
  await tick();
  const stream = h.options();
  await stream.fetch?.('stream', { headers: stream.headers });
  expect(new Headers(h.fetch.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
    'Bearer jwt-one',
  );
  await expect(stream.onopen?.(new Response('', { status: 401 }))).rejects.toThrow('refreshed');
  expect(h.refreshCredential).toHaveBeenCalledTimes(1);
  await stream.fetch?.('stream', { headers: stream.headers });
  expect(new Headers(h.fetch.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe(
    'Bearer jwt-two',
  );
  await stream.onopen?.(response());
  await stream.onopen?.(response());
  expect(opened.mock.calls).toEqual([[false], [true]]);
  stop();
  await tick();
});

it('keeps ticket secrets in headers when a preview joins the authenticated connection', async () => {
  const h = harness();
  const tracking = h.transport.subscribe(
    { kind: 'tracking', mode: 'replicated', getToken: () => 'opaque-ticket' },
    { onMessage: vi.fn() },
  );
  await tick();
  expect(h.options().method).toBe('GET');
  const local = h.transport.subscribe({ kind: 'local-status' }, { onMessage: vi.fn() });
  await tick();
  const stream = h.options(1);
  expect(stream.method).toBe('POST');
  expect(bodyText(stream)).not.toContain('opaque-ticket');
  expect(urlText(h.requests[1]?.url)).not.toContain('opaque-ticket');
  await stream.fetch?.('stream', { headers: stream.headers });
  expect(new Headers(h.fetch.mock.calls[0]?.[1]?.headers).get('X-Registration-Token')).toBe(
    'opaque-ticket',
  );
  expect((JSON.parse(bodyText(stream)) as { tracking: string }).tracking).toBe('replicated');
  expect(h.maxActive()).toBe(1);
  local();
  tracking();
  await tick();
});

it('does not split more than one hundred queues into parallel connections', async () => {
  const h = harness();
  const stop = h.transport.subscribe(
    { kind: 'display', queueIds: Array.from({ length: 250 }, (_, i) => 'q' + String(i)) },
    { onMessage: vi.fn() },
  );
  await tick();
  expect(h.requests).toHaveLength(1);
  expect((JSON.parse(bodyText(h.options())) as { queueIds: string[] }).queueIds).toHaveLength(250);
  stop();
  await tick();
});

it('reports a rejected public token without refreshing the user session', async () => {
  const h = harness();
  const rejected = vi.fn();
  const stop = h.transport.subscribe(
    { kind: 'tracking', mode: 'replicated', getToken: () => 'ticket' },
    { onMessage: vi.fn(), onRejected: rejected },
  );
  await tick();
  let failure: unknown;
  try {
    await h.options().onopen?.(new Response('', { status: 410 }));
  } catch (error) {
    failure = error;
  }
  expect(() => h.options().onerror?.(failure)).toThrow();
  expect(rejected).toHaveBeenCalledWith(410);
  expect(h.refreshCredential).not.toHaveBeenCalled();
  stop();
  await tick();
});

it('combines anonymous announcements and tracking into one public POST without leaking credentials', async () => {
  const h = harness();
  const notice = vi.fn(),
    ticket = vi.fn();
  const stop = [
    h.transport.subscribe({ kind: 'announcements', siteId: 'site-a' }, { onMessage: notice }),
    h.transport.subscribe(
      { kind: 'tracking', mode: 'replicated', getToken: () => 'private-ticket' },
      { onMessage: ticket },
    ),
  ];
  await tick();
  expect(h.requests).toHaveLength(1);
  expect(urlText(h.requests[0]?.url)).toContain('/public/realtime/events');
  expect(h.options().method).toBe('POST');
  expect(JSON.parse(bodyText(h.options()))).toEqual({
    announcements: true,
    announcementSiteId: 'site-a',
    tracking: 'replicated',
  });
  expect(bodyText(h.options())).not.toContain('private-ticket');
  await h.options().fetch?.('stream', { headers: h.options().headers });
  const headers = new Headers(h.fetch.mock.calls[0]?.[1]?.headers);
  expect(headers.get('Authorization')).toBeNull();
  expect(headers.get('X-Registration-Token')).toBe('private-ticket');
  h.options().onmessage?.(message('announcements'));
  expect(notice).toHaveBeenCalledTimes(1);
  expect(ticket).not.toHaveBeenCalled();
  expect(h.maxActive()).toBe(1);
  stop.forEach((unsubscribe) => { unsubscribe(); });
  await tick();
});
it('keeps site announcements, their administration and queue display on one authenticated connection', async () => {
  const h = harness();
  const stop = [
    h.transport.subscribe({ kind: 'announcements', siteId: 'site-a' }, { onMessage: vi.fn() }),
    h.transport.subscribe({ kind: 'announcements-admin' }, { onMessage: vi.fn() }),
    h.transport.subscribe({ kind: 'display', queueIds: ['queue-a'] }, { onMessage: vi.fn() }),
  ];
  await tick();
  expect(h.requests).toHaveLength(1);
  expect(JSON.parse(bodyText(h.options()))).toMatchObject({
    announcements: true,
    announcementAdministration: true,
    announcementSiteId: 'site-a',
    queueIds: ['queue-a'],
  });
  stop[0]?.();
  const next = h.transport.subscribe(
    { kind: 'announcements', siteId: 'site-b' },
    { onMessage: vi.fn() },
  );
  await tick();
  expect(h.options().signal?.aborted).toBe(true);
  expect(JSON.parse(bodyText(h.options(1)))).toMatchObject({ announcementSiteId: 'site-b' });
  expect(h.maxActive()).toBe(1);
  stop.forEach((unsubscribe) => { unsubscribe(); });
  next();
  await tick();
});
