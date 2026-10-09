import { create } from 'zustand';

export type NotificationTone = 'success' | 'info' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  tone: NotificationTone;
  title: string;
  message?: string;
  correlationId?: string;
  duration: number;
}

type NotificationInput = Omit<AppNotification, 'id' | 'duration'> & {
  id?: string;
  duration?: number;
};

interface NotificationState {
  items: AppNotification[];
  push: (notification: NotificationInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATION: Record<NotificationTone, number> = {
  success: 5_000,
  info: 6_000,
  warning: 8_000,
  error: 12_000,
};

const signature = (item: Pick<AppNotification, 'tone' | 'title' | 'message' | 'correlationId'>) =>
  [item.tone, item.title, item.message, item.correlationId].join('|');

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  push: (input) => {
    const id = input.id ?? crypto.randomUUID();
    const notification: AppNotification = {
      ...input,
      id,
      duration: input.duration ?? DEFAULT_DURATION[input.tone],
    };
    set((state) => {
      const withoutDuplicate = state.items.filter(
        (item) => signature(item) !== signature(notification),
      );
      return { items: [...withoutDuplicate, notification].slice(-4) };
    });
    return id;
  },
  dismiss: (id) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },
  clear: () => {
    set({ items: [] });
  },
}));

export const notify = (notification: NotificationInput) =>
  useNotificationStore.getState().push(notification);

