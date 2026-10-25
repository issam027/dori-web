import { io, type Socket } from 'socket.io-client';

export interface QueueRealtimeEvent {
  queueId?: string;
  ticketNumber?: string;
  threadNumber?: number;
  timestamp?: string;
}

type RealtimeSocket = Pick<Socket, 'connected' | 'connect' | 'disconnect' | 'emit' | 'on' | 'off'>;

interface QueueRealtimeGatewayOptions {
  token: string;
  onEvent: (event: QueueRealtimeEvent) => void;
  onReconnect: () => void;
  createSocket?: (token: string) => RealtimeSocket;
}

function createSocket(token: string): Socket {
  const realtimeUrl = import.meta.env.VITE_REALTIME_URL || import.meta.env.VITE_API_BASE_URL;
  return io(realtimeUrl || undefined, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
  });
}

function queueRoom(queueId: string): string {
  return `queue:${queueId}:display`;
}

export class QueueRealtimeGateway {
  private readonly socket: RealtimeSocket;
  private queueIds: string[] = [];
  private hasConnected = false;

  constructor(private readonly options: QueueRealtimeGatewayOptions) {
    this.socket = (options.createSocket ?? createSocket)(options.token);
  }

  connect(queueIds: readonly string[]): void {
    this.queueIds = [...new Set(queueIds)].sort();
    this.socket.on('connect', this.handleConnect);
    this.socket.on('registration_called', this.handleRegistrationCalled);
    this.socket.connect();
  }

  disconnect(): void {
    if (this.socket.connected) {
      this.queueIds.forEach((queueId) => {
        this.socket.emit('unsubscribe', { room: queueRoom(queueId) });
      });
    }
    this.socket.off('connect', this.handleConnect);
    this.socket.off('registration_called', this.handleRegistrationCalled);
    this.socket.disconnect();
    this.queueIds = [];
    this.hasConnected = false;
  }

  private readonly handleConnect = () => {
    this.queueIds.forEach((queueId) => {
      this.socket.emit('subscribe', { room: queueRoom(queueId) });
    });
    if (this.hasConnected) this.options.onReconnect();
    this.hasConnected = true;
  };

  private readonly handleRegistrationCalled = (event: QueueRealtimeEvent) => {
    this.options.onEvent(event);
  };
}
