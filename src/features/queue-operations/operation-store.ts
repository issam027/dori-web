import { create } from 'zustand';
import type { CallNextRegistrationResponseDto } from '@/api/generated/models';

interface OperationState {
  activeCall: CallNextRegistrationResponseDto | null;
  recentCalls: CallNextRegistrationResponseDto[];
  startCall: (call: CallNextRegistrationResponseDto) => void;
  closeCall: () => void;
  reset: () => void;
}

export const useOperationStore = create<OperationState>((set) => ({
  activeCall: null,
  recentCalls: [],
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
  reset: () => {
    set({ activeCall: null, recentCalls: [] });
  },
}));

export function canCallNext(
  hasActiveSession: boolean,
  activeCall: CallNextRegistrationResponseDto | null,
  pending: boolean,
): boolean {
  return hasActiveSession && !activeCall && !pending;
}
