import { create } from 'zustand';
import type { CurrentUserResponseDto } from '@/api/generated/models';
import { clearAccessToken } from './access-token';

type SessionStatus = 'anonymous' | 'hydrating' | 'authenticated';

interface SessionState {
  status: SessionStatus;
  user: CurrentUserResponseDto | null;
  beginHydration: () => void;
  authenticate: (user: CurrentUserResponseDto) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'hydrating',
  user: null,
  beginHydration: () => {
    set({ status: 'hydrating' });
  },
  authenticate: (user) => {
    set({ status: 'authenticated', user });
  },
  clear: () => {
    clearAccessToken();
    set({ status: 'anonymous', user: null });
  },
}));
