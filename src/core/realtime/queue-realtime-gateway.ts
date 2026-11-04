import type { EventSourceMessage } from '@microsoft/fetch-event-source';
import { tabRealtimeTransport, type TabRealtimeTransport } from './tab-realtime-transport';

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

interface QueueRealtimeGatewayOptions<TChannel extends QueueRealtimeChannel> {
  channel: TChannel;
  getCredential: () => string;
  onEvent: (event: QueueRealtimeEvent<TChannel>) => void;
  onReconnect: (queueId: string) => void;
  onStatusChange?: (queueId: string, status: QueueRealtimeStatus) => void;
  onHeartbeat?: (queueId: string) => void;
  onError?: (queueId: string, error: unknown) => void;
  transport?: Pick<TabRealtimeTransport, 'subscribe'>;
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
  private subscriptions: Array<() => void> = [];
  private started = false;
  constructor(private readonly options: QueueRealtimeGatewayOptions<TChannel>) {}

  connect(queueIds: readonly string[]): void {
    if (this.started) return;
    const ids = [...new Set(queueIds)].sort();
    if (!ids.length) return;
    this.started = true;
    const transport = this.options.transport ?? tabRealtimeTransport;
    const groups = this.options.channel === 'display' ? [ids] : ids.map((id) => [id]);
    for (const group of groups) {
      const first = group[0];
      if (!first) continue;
      this.subscriptions.push(
        transport.subscribe(
          this.options.channel === 'display'
            ? { kind: 'display', queueIds: group }
            : {
                kind: 'tracking',
                mode: 'direct',
                queueId: first,
                getToken: this.options.getCredential,
              },
          {
            onOpen: () => {
              for (const id of group) this.options.onReconnect(id);
            },
            onStatus: (status) => {
              for (const id of group) this.options.onStatusChange?.(id, status);
            },
            onError: (error) => {
              for (const id of group) this.options.onError?.(id, error);
            },
            onMessage: (message) => {
              if (message.event === 'heartbeat') {
                for (const id of group) this.options.onHeartbeat?.(id);
                return;
              }
              const event = group
                .map((id) => parseQueueEvent(message, this.options.channel, id))
                .find(Boolean);
              if (event) this.options.onEvent(event as QueueRealtimeEvent<TChannel>);
              else if (message.event === channelContracts[this.options.channel].event) {
                // A shared topic may concern another listener's queue: ignore it.
                try {
                  const value: unknown = JSON.parse(message.data);
                  if (
                    value &&
                    typeof value === 'object' &&
                    'queueId' in value &&
                    !group.includes(String(value.queueId))
                  )
                    return;
                } catch {
                  /* Report malformed messages below. */
                }
                this.options.onError?.(first, new Error('Invalid queue realtime event'));
              }
            },
          },
        ),
      );
    }
  }
  disconnect(): void {
    for (const unsubscribe of this.subscriptions) unsubscribe();
    this.subscriptions = [];
    this.started = false;
  }
}
