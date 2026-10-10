import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CallNextRegistrationResponseDto } from '@/api/generated/models';

export interface PassageSummary {
  registrationId: number;
  ticketNumber: string;
  personName: string;
  arrivedAt?: string;
  calledAt: string;
  closedAt: string;
  threadNumber: number;
  outcome: 'served' | 'no_show';
}

interface OperationState {
  activeCall: CallNextRegistrationResponseDto | null;
  recentCalls: CallNextRegistrationResponseDto[];
  passages: PassageSummary[];
  startCall: (call: CallNextRegistrationResponseDto) => void;
  closeCall: () => void;
  addPassage: (passage: PassageSummary) => void;
  reset: () => void;
}

export const useOperationStore = create<OperationState>()(
  persist(
    (set) => ({
      activeCall: null,
      recentCalls: [],
      passages: [],
      startCall: (call) => {
        set((state) => ({
          activeCall: call,
          recentCalls: [
            call,
            ...state.recentCalls.filter((item) => item.registrationId !== call.registrationId),
          ].slice(0, 4),
        }));
      },
      closeCall: () => {
        set({ activeCall: null });
      },
      addPassage: (passage) => {
        set((state) => ({
          passages: [
            passage,
            ...state.passages.filter((item) => item.registrationId !== passage.registrationId),
          ].slice(0, 20),
        }));
      },
      reset: () => {
        set({ activeCall: null, recentCalls: [], passages: [] });
      },
    }),
    {
      name: 'dori:operator-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ activeCall, recentCalls, passages }) => ({
        activeCall,
        recentCalls,
        passages,
      }),
    },
  ),
);

export function canCallNext(
  hasActiveSession: boolean,
  activeCall: CallNextRegistrationResponseDto | null,
  pending: boolean,
): boolean {
  return hasActiveSession && !activeCall && !pending;
}
