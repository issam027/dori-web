import { create } from 'zustand';
import type { QueueRealtimeChannel, QueueRealtimeStatus } from './queue-realtime-gateway';

export interface RealtimeConnectionState {
  channel: QueueRealtimeChannel;
  queueId: string;
  status: QueueRealtimeStatus;
  lastError?: string;
  updatedAt: string;
}

interface RealtimeStatusState {
  connections: Record<string, RealtimeConnectionState>;
  updateStatus: (
    channel: QueueRealtimeChannel,
    queueId: string,
    status: QueueRealtimeStatus,
  ) => void;
  reportError: (channel: QueueRealtimeChannel, queueId: string, error: unknown) => void;
}

function connectionKey(channel: QueueRealtimeChannel, queueId: string): string {
  return `${channel}:${queueId}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const useRealtimeStatusStore = create<RealtimeStatusState>((set) => ({
  connections: {},
  updateStatus: (channel, queueId, status) => {
    const key = connectionKey(channel, queueId);
    set((state) => ({
      connections: {
        ...state.connections,
        [key]: {
          ...state.connections[key],
          channel,
          queueId,
          status,
          updatedAt: new Date().toISOString(),
          ...(status === 'connected' ? { lastError: undefined } : {}),
        },
      },
    }));
  },
  reportError: (channel, queueId, error) => {
    const key = connectionKey(channel, queueId);
    set((state) => ({
      connections: {
        ...state.connections,
        [key]: {
          ...state.connections[key],
          channel,
          queueId,
          status: state.connections[key]?.status ?? 'failed',
          lastError: errorMessage(error),
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  },
}));

export function getRealtimeConnection(
  channel: QueueRealtimeChannel,
  queueId: string,
): RealtimeConnectionState | undefined {
  return useRealtimeStatusStore.getState().connections[connectionKey(channel, queueId)];
}
