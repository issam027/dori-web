import {
  fetchEventSource,
  type EventSourceMessage,
  type FetchEventSourceInit,
} from '@microsoft/fetch-event-source';

export type QueueRealtimeChannel = 'display' | 'tracking';
export type QueueRealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'closed';
export type QueueRealtimeHealth = 'connecting' | 'active' | 'degraded';
export const realtimeHeartbeatTimeoutMs = 35_000;
export const realtimeDegradedRefreshIntervalMs = 30_000;

export interface QueueDisplayChangedEvent {
  queueId: string;
  reason:
    | 'registration_created'
    | 'appointment_checked_in'
    | 'registration_called'
    | 'registration_served'
    | 'registration_no_show'
    | 'registration_recalled'
    | 'estimation_updated';
  timestamp: string;
}

export interface QueuePositionChangedEvent {
  queueId: string;
  timestamp: string;
}

export type QueueRealtimeEvent<TChannel extends QueueRealtimeChannel> = TChannel extends 'display'
  ? QueueDisplayChangedEvent
  : QueuePositionChangedEvent;

type EventStream = (input: RequestInfo, init: FetchEventSourceInit) => Promise<void>;

interface QueueRealtimeGatewayOptions<TChannel extends QueueRealtimeChannel> {
  channel: TChannel;
  getCredential: () => string;
  refreshCredential?: () => Promise<void>;
  onEvent: (event: QueueRealtimeEvent<TChannel>) => void;
  onReconnect: (queueId: string) => void;
  onStatusChange?: (queueId: string, status: QueueRealtimeStatus) => void;
  onHeartbeat?: (queueId: string) => void;
  onError?: (queueId: string, error: unknown) => void;
  eventStream?: EventStream;
  fetch?: typeof fetch;
}

const channelContracts = {
  display: {
    event: 'queue_display_changed',
    reasons: new Set([
      'registration_created',
      'appointment_checked_in',
      'registration_called',
      'registration_served',
      'registration_no_show',
      'registration_recalled',
      'estimation_updated',
    ]),
  },
  tracking: { event: 'queue_position_changed' },
} as const;

class FatalRealtimeError extends Error {}

export function queueRealtimeUrl(
  queueId: string | readonly string[],
  channel: QueueRealtimeChannel,
): string {
  const baseUrl = import.meta.env.PROD ? '' : import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  if (Array.isArray(queueId))
    return `${baseUrl}/api/v1/realtime/queues/display?queueIds=${encodeURIComponent(queueId.join(','))}`;
  return `${baseUrl}/api/v1/realtime/queues/${encodeURIComponent(queueId as string)}/${channel}`;
}

function isQueueEvent(
  value: unknown,
  channel: QueueRealtimeChannel,
): value is QueueDisplayChangedEvent | QueuePositionChangedEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  if (
    typeof event.queueId !== 'string' ||
    typeof event.timestamp !== 'string' ||
    Number.isNaN(Date.parse(event.timestamp))
  )
    return false;
  return channel === 'tracking'
    ? event.reason === undefined || event.reason === 'estimation_updated'
    : typeof event.reason === 'string' && channelContracts.display.reasons.has(event.reason);
}

function parseQueueEvent(
  message: EventSourceMessage,
  channel: QueueRealtimeChannel,
  queueId: string,
): QueueDisplayChangedEvent | QueuePositionChangedEvent | undefined {
  if (message.event !== channelContracts[channel].event) return undefined;
  try {
    const event: unknown = JSON.parse(message.data);
    return isQueueEvent(event, channel) && event.queueId === queueId ? event : undefined;
  } catch {
    return undefined;
  }
}

export class QueueRealtimeGateway<TChannel extends QueueRealtimeChannel> {
  private readonly controllers = new Map<string, AbortController>();
  private started = false;

  constructor(private readonly options: QueueRealtimeGatewayOptions<TChannel>) {}

  connect(queueIds: readonly string[]): void {
    if (this.started) return;
    const uniqueQueueIds = [...new Set(queueIds)].sort();
    if (!uniqueQueueIds.length) return;
    this.started = true;
    uniqueQueueIds.forEach((queueId) => {
      this.options.onStatusChange?.(queueId, 'connecting');
    });
    if (this.options.channel === 'display' && uniqueQueueIds.length > 1) {
      for (let start = 0; start < uniqueQueueIds.length; start += 100) {
        const group = uniqueQueueIds.slice(start, start + 100);
        const first = group[0];
        if (first) this.open(first, group);
      }
    } else
      uniqueQueueIds.forEach((id) => {
        this.open(id);
      });
  }

  disconnect(): void {
    this.controllers.forEach((controller) => {
      controller.abort();
    });
    this.controllers.forEach((_controller, queueId) => {
      this.options.onStatusChange?.(queueId, 'closed');
    });
    this.controllers.clear();
    this.started = false;
  }

  private open(queueId: string, queueIds: readonly string[] = [queueId]): void {
    const controller = new AbortController();
    const eventStream = this.options.eventStream ?? fetchEventSource;
    const requestFetch = this.options.fetch ?? globalThis.fetch;
    let hasOpened = false;
    let requestedCredential = this.options.getCredential();
    queueIds.forEach((id) => this.controllers.set(id, controller));

    void eventStream(
      queueRealtimeUrl(queueIds.length > 1 ? queueIds : queueId, this.options.channel),
      {
        signal: controller.signal,
        openWhenHidden: true,
        headers: { Accept: 'text/event-stream', 'last-event-id': '' },
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          const credential = this.options.getCredential();
          requestedCredential = credential;
          if (this.options.channel === 'display')
            headers.set('Authorization', `Bearer ${credential}`);
          else headers.set('X-Registration-Token', credential);
          return requestFetch(input, { ...init, headers });
        },
        onopen: async (response) => {
          const contentType = response.headers.get('content-type') ?? '';
          if (response.ok && contentType.includes('text/event-stream')) {
            if (hasOpened)
              queueIds.forEach((id) => {
                this.options.onReconnect(id);
              });
            hasOpened = true;
            queueIds.forEach((id) => this.options.onStatusChange?.(id, 'connected'));
            return;
          }
          if (response.status === 401 && this.options.refreshCredential) {
            queueIds.forEach((id) => this.options.onStatusChange?.(id, 'reconnecting'));
            if (requestedCredential === this.options.getCredential())
              await this.options.refreshCredential();
            throw new Error('SSE credential refreshed');
          }
          if (response.status >= 400 && response.status < 500 && response.status !== 429)
            throw new FatalRealtimeError(
              `SSE request rejected with status ${String(response.status)}`,
            );
          throw new Error(`SSE request failed with status ${String(response.status)}`);
        },
        onmessage: (message) => {
          if (message.event === 'heartbeat') {
            if (queueIds.length === 1) this.options.onHeartbeat?.(queueId);
            else {
              try {
                const id: unknown = (JSON.parse(message.data) as { queueId?: unknown }).queueId;
                if (typeof id === 'string' && queueIds.includes(id)) this.options.onHeartbeat?.(id);
              } catch {
                /* Ignore malformed heartbeats. */
              }
            }
            return;
          }
          const event = queueIds
            .map((id) => parseQueueEvent(message, this.options.channel, id))
            .find(Boolean);
          if (event) {
            this.options.onEvent(event as QueueRealtimeEvent<TChannel>);
            return;
          }
          if (message.event === channelContracts[this.options.channel].event) {
            this.options.onError?.(
              queueId,
              new Error(`Invalid ${message.event} payload received from the SSE stream`),
            );
          }
        },
        onclose: () => {
          throw new Error('SSE connection closed');
        },
        onerror: (error) => {
          queueIds.forEach((id) => this.options.onError?.(id, error));
          if (error instanceof FatalRealtimeError) {
            queueIds.forEach((id) => this.options.onStatusChange?.(id, 'failed'));
            throw error;
          }
          queueIds.forEach((id) => this.options.onStatusChange?.(id, 'reconnecting'));
        },
      },
    ).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      queueIds.forEach((id) => this.options.onStatusChange?.(id, 'failed'));
      queueIds.forEach((id) => this.options.onError?.(id, error));
    });
  }
}
