import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client';

export type QueueRealtimeChannel = 'display' | 'tracking';

export interface QueueDisplayChangedEvent {
  queueId: string;
  reason:
    'registration_created' | 'registration_called' | 'registration_served' | 'registration_no_show';
}

export interface QueuePositionChangedEvent {
  queueId: string;
  reason: 'registration_called';
}

export type QueueRealtimeEvent<TChannel extends QueueRealtimeChannel> = TChannel extends 'display'
  ? QueueDisplayChangedEvent
  : QueuePositionChangedEvent;

type RealtimeSocket = Pick<Socket, 'connected' | 'connect' | 'disconnect' | 'emit' | 'on' | 'off'>;

interface QueueRealtimeGatewayOptions<TChannel extends QueueRealtimeChannel> {
  channel: TChannel;
  getCredential: () => string;
  onEvent: (event: QueueRealtimeEvent<TChannel>) => void;
  onReconnect: () => void;
  createSocket?: (
    channel: QueueRealtimeChannel,
    getCredential: () => string,
  ) => RealtimeSocket;
}

const channelContracts = {
  display: {
    event: 'queue_display_changed',
    reasons: new Set([
      'registration_created',
      'registration_called',
      'registration_served',
      'registration_no_show',
    ]),
  },
  tracking: {
    event: 'queue_position_changed',
    reasons: new Set(['registration_called']),
  },
} as const;

export function queueSocketOptions(
  channel: QueueRealtimeChannel,
  getCredential: () => string,
): Partial<ManagerOptions & SocketOptions> {
  return {
    path: '/api/socket-io/socket.io',
    auth: (callback) => {
      const credential = getCredential();
      callback(channel === 'display' ? { token: credential } : { registrationToken: credential });
    },
    autoConnect: false,
    transports: ['websocket'],
  };
}

function createSocket(
  channel: QueueRealtimeChannel,
  getCredential: () => string,
): Socket {
  const realtimeUrl = import.meta.env.VITE_REALTIME_URL || import.meta.env.VITE_API_BASE_URL;
  return io(realtimeUrl || undefined, queueSocketOptions(channel, getCredential));
}

function queueRoom(queueId: string, channel: QueueRealtimeChannel): string {
  return `queue:${queueId}:${channel}`;
}

function isQueueEvent(
  value: unknown,
  channel: QueueRealtimeChannel,
): value is QueueDisplayChangedEvent | QueuePositionChangedEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.queueId === 'string' &&
    typeof event.reason === 'string' &&
    channelContracts[channel].reasons.has(event.reason)
  );
}

export class QueueRealtimeGateway<TChannel extends QueueRealtimeChannel> {
  private readonly socket: RealtimeSocket;
  private readonly eventName: string;
  private queueIds: string[] = [];
  private hasConnected = false;
  private started = false;

  constructor(private readonly options: QueueRealtimeGatewayOptions<TChannel>) {
    this.socket = (options.createSocket ?? createSocket)(options.channel, options.getCredential);
    this.eventName = channelContracts[options.channel].event;
  }

  connect(queueIds: readonly string[]): void {
    if (this.started) return;
    this.queueIds = [...new Set(queueIds)].sort();
    if (!this.queueIds.length) return;
    this.started = true;
    this.socket.on('connect', this.handleConnect);
    this.socket.on(this.eventName, this.handleQueueEvent);
    this.socket.connect();
  }

  disconnect(): void {
    if (!this.started) return;
    if (this.socket.connected) {
      this.queueIds.forEach((queueId) => {
        this.socket.emit('unsubscribe', {
          room: queueRoom(queueId, this.options.channel),
        });
      });
    }
    this.socket.off('connect', this.handleConnect);
    this.socket.off(this.eventName, this.handleQueueEvent);
    this.socket.disconnect();
    this.queueIds = [];
    this.hasConnected = false;
    this.started = false;
  }

  private readonly handleConnect = () => {
    this.queueIds.forEach((queueId) => {
      this.socket.emit('subscribe', {
        room: queueRoom(queueId, this.options.channel),
      });
    });
    if (this.hasConnected) this.options.onReconnect();
    this.hasConnected = true;
  };

  private readonly handleQueueEvent = (event: unknown) => {
    if (!isQueueEvent(event, this.options.channel) || !this.queueIds.includes(event.queueId))
      return;
    this.options.onEvent(event as QueueRealtimeEvent<TChannel>);
  };
}
