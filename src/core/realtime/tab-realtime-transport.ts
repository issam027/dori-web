import {
  fetchEventSource,
  type EventSourceMessage,
  type FetchEventSourceInit,
} from '@microsoft/fetch-event-source';
import { getAccessToken } from '@/core/auth/access-token';
import { refreshAccessToken } from '@/api/client/http-client';

export type TabRealtimeSelection =
  | { kind: 'display'; queueIds: readonly string[] }
  | { kind: 'local-status' }
  | { kind: 'installations' }
  | { kind: 'tracking'; mode: 'direct' | 'replicated'; queueId?: string; getToken: () => string };
export type TabRealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'closed';
export interface TabRealtimeListener {
  onMessage: (message: EventSourceMessage) => void;
  onOpen?: (reconnected: boolean) => void;
  onStatus?: (status: TabRealtimeStatus) => void;
  onError?: (error: unknown) => void;
  onRejected?: (status: number) => void;
}
interface Entry {
  selection: TabRealtimeSelection;
  listener: TabRealtimeListener;
  opened: boolean;
}
interface TransportOptions {
  eventStream?: (url: RequestInfo, options: FetchEventSourceInit) => Promise<void>;
  fetch?: typeof fetch;
  getCredential?: () => string | null;
  refreshCredential?: () => Promise<void>;
}
interface Plan {
  key: string;
  url: string;
  authenticated: boolean;
  token?: string;
  body?: string;
}
class RejectedRealtimeStream extends Error {
  constructor(readonly status: number) {
    super(`Realtime stream rejected (${String(status)})`);
  }
}

/** One transport per JS window. Logical listeners never own a network connection. */
export class TabRealtimeTransport {
  private readonly entries = new Map<number, Entry>();
  private nextId = 0;
  private scheduled?: ReturnType<typeof setTimeout>;
  private work = Promise.resolve();
  private current?: {
    plan: Plan;
    controller: AbortController;
    task: Promise<void>;
    connected: boolean;
  };

  constructor(private readonly options: TransportOptions = {}) {}

  subscribe(selection: TabRealtimeSelection, listener: TabRealtimeListener): () => void {
    const id = ++this.nextId;
    this.entries.set(id, { selection, listener, opened: false });
    listener.onStatus?.('connecting');
    this.schedule();
    return () => {
      if (!this.entries.delete(id)) return;
      if (!this.entries.size) this.current?.controller.abort();
      listener.onStatus?.('closed');
      this.schedule();
    };
  }

  private schedule(): void {
    if (this.scheduled !== undefined) clearTimeout(this.scheduled);
    this.scheduled = setTimeout(() => {
      this.scheduled = undefined;
      this.work = this.work
        .then(() => this.reconcile())
        .catch((error: unknown) => {
          this.broadcastError(error);
        });
    }, 0);
  }

  private plan(): Plan | undefined {
    const entries = [...this.entries.values()];
    if (!entries.length) return undefined;
    const base = import.meta.env.PROD ? '' : import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
    const authenticated = entries.some((entry) => entry.selection.kind !== 'tracking');
    const tickets = entries.flatMap((entry) =>
      entry.selection.kind === 'tracking' ? [entry.selection] : [],
    );
    const tracking = tickets[0];
    const token = tracking?.getToken();
    if (
      tickets.some(
        (ticket) =>
          ticket.getToken() !== token ||
          ticket.mode !== tracking?.mode ||
          ticket.queueId !== tracking.queueId,
      )
    )
      throw new Error('A tab can follow only one ticket at a time');
    if (authenticated) {
      const queueIds = [
        ...new Set(
          entries.flatMap((entry) =>
            entry.selection.kind === 'display' ? [...entry.selection.queueIds] : [],
          ),
        ),
      ].sort();
      const body = JSON.stringify({
        queueIds,
        localStatus: entries.some((entry) => entry.selection.kind === 'local-status'),
        installations: entries.some((entry) => entry.selection.kind === 'installations'),
        tracking: tracking?.mode ?? 'none',
        ...(tracking?.queueId ? { trackingQueueId: tracking.queueId } : {}),
      });
      return {
        key: body + ':' + (token ?? ''),
        url: base + '/api/v1/realtime/events',
        authenticated,
        body,
        token,
      };
    }
    if (!tracking || !token) throw new Error('Missing tracking credential');
    const url =
      tracking.mode === 'replicated'
        ? base + '/api/v1/realtime/tracking'
        : base +
          '/api/v1/realtime/queues/' +
          encodeURIComponent(tracking.queueId ?? '') +
          '/tracking';
    return { key: url + ':' + token, url, authenticated, token };
  }

  private broadcastError(error: unknown): void {
    for (const { listener } of this.entries.values()) {
      listener.onError?.(error);
      listener.onStatus?.('failed');
    }
  }

  private async reconcile(): Promise<void> {
    let plan: Plan | undefined;
    try {
      plan = this.plan();
    } catch (error) {
      const old = this.current;
      this.current = undefined;
      old?.controller.abort();
      await old?.task;
      this.broadcastError(error);
      return;
    }
    if (!this.current?.controller.signal.aborted && this.current?.plan.key === plan?.key) {
      if (this.current?.connected) this.openListeners(true);
      return;
    }
    const old = this.current;
    this.current = undefined;
    old?.controller.abort();
    // The former fetch is closed before the next one starts, even during route changes.
    await old?.task;
    plan = this.plan();
    if (!plan) return;
    const controller = new AbortController();
    const connection = { plan, controller, connected: false, task: Promise.resolve() };
    this.current = connection;
    for (const { listener } of this.entries.values()) listener.onStatus?.('connecting');
    const requestFetch = this.options.fetch ?? globalThis.fetch;
    connection.task = (this.options.eventStream ?? fetchEventSource)(plan.url, {
      method: plan.authenticated ? 'POST' : 'GET',
      body: plan.body,
      signal: controller.signal,
      openWhenHidden: true,
      headers: {
        Accept: 'text/event-stream',
        'last-event-id': '',
        ...(plan.body ? { 'Content-Type': 'application/json' } : {}),
      },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (plan.authenticated) {
          const credential = (this.options.getCredential ?? getAccessToken)();
          if (credential) headers.set('Authorization', `Bearer ${credential}`);
        }
        if (plan.token) headers.set('X-Registration-Token', plan.token);
        return requestFetch(input, { ...init, headers });
      },
      onopen: async (response) => {
        if (controller.signal.aborted) return;
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          connection.connected = true;
          this.openListeners();
          return;
        }
        if (response.status === 401 && plan.authenticated) {
          try {
            await (this.options.refreshCredential ?? refreshAccessToken)();
          } catch {
            throw new RejectedRealtimeStream(401);
          }
          throw new Error('SSE credential refreshed');
        }
        if (response.status >= 400 && response.status < 500 && response.status !== 429)
          throw new RejectedRealtimeStream(response.status);
        throw new Error('Realtime stream unavailable');
      },
      onmessage: (message) => {
        if (controller.signal.aborted) return;
        for (const entry of this.entries.values())
          if (this.matches(entry.selection, message)) entry.listener.onMessage(message);
      },
      onclose: () => {
        throw new Error('Realtime stream closed');
      },
      onerror: (error: unknown) => {
        if (controller.signal.aborted) return;
        connection.connected = false;
        if (error instanceof RejectedRealtimeStream) {
          for (const { listener } of this.entries.values()) listener.onRejected?.(error.status);
          if (error.status === 410) {
            for (const [id, entry] of this.entries) {
              if (entry.selection.kind !== 'tracking') continue;
              this.entries.delete(id);
              entry.listener.onStatus?.('failed');
            }
            this.schedule();
          }
          throw error;
        }
        for (const { listener } of this.entries.values()) {
          listener.onError?.(error);
          listener.onStatus?.('reconnecting');
        }
        return 3000;
      },
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) this.broadcastError(error);
    });
  }

  private openListeners(onlyNew = false): void {
    for (const entry of this.entries.values()) {
      if (onlyNew && entry.opened) continue;
      entry.listener.onStatus?.('connected');
      entry.listener.onOpen?.(entry.opened);
      entry.opened = true;
    }
  }

  private matches(selection: TabRealtimeSelection, message: EventSourceMessage): boolean {
    if (message.event === 'heartbeat') return true;
    if (selection.kind === 'local-status') return message.event === 'edge_local_status';
    if (selection.kind === 'installations') return message.event === 'edge_installations_changed';
    if (selection.kind === 'tracking')
      return (
        message.event ===
        (selection.mode === 'replicated' ? 'tracking_changed' : 'queue_position_changed')
      );
    return message.event === 'queue_display_changed';
  }
}

export const tabRealtimeTransport = new TabRealtimeTransport();
