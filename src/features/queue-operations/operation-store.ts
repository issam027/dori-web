import { create } from 'zustand';
import type { CallNextRegistrationResponseDto } from '@/api/generated/models';

export interface PassageSummary {
  registrationId: number;
  ticketNumber: string;
  personName: string;
  firstName?: string;
  lastName?: string;
  arrivedAt?: string;
  calledAt: string;
  closedAt: string;
  threadNumber: number;
  outcome: 'served' | 'no_show';
}

interface OperationState {
  activeCalls: Record<number, CallNextRegistrationResponseDto>;
  recentCalls: CallNextRegistrationResponseDto[];
  passages: PassageSummary[];
  startCall: (queueId: number, call: CallNextRegistrationResponseDto) => void;
  closeCall: (queueId: number) => void;
  addPassage: (passage: PassageSummary) => void;
  reset: () => void;
}

export const useOperationStore = create<OperationState>()((set) => ({
      activeCalls: {},
      recentCalls: [],
      passages: [],
      startCall: (queueId, call) => {
        set((state) => ({
          activeCalls: { ...state.activeCalls, [queueId]: call },
          recentCalls: [
            call,
            ...state.recentCalls.filter((item) => item.registrationId !== call.registrationId),
          ].slice(0, 4),
        }));
      },
      closeCall: (queueId) => {
        set((state) => ({
          activeCalls: Object.fromEntries(
            Object.entries(state.activeCalls).filter(([key]) => Number(key) !== queueId),
          ),
        }));
      },
      addPassage: (passage) => {
        set((state) => ({
          passages: [
            passage,
            ...state.passages.filter((item) => item.registrationId !== passage.registrationId),
          ].slice(0, 10),
        }));
      },
      reset: () => {
        set({ activeCalls: {}, recentCalls: [], passages: [] });
      },
    }));

export function canCallNext(
  hasActiveSession: boolean,
  activeCall: CallNextRegistrationResponseDto | undefined,
  pending: boolean,
): boolean {
  return hasActiveSession && !activeCall && !pending;
}
