import type { CallNextRegistrationResponseDto } from '@/api/generated/models';
import { canCallNext, useOperationStore } from './operation-store';

function call(registrationId: number): CallNextRegistrationResponseDto {
  return {
    registrationId,
    ticketNumber: `A${String(registrationId)}`,
    entryType: 'walkin',
    calledEarly: false,
    tier: {},
    status: 'called',
    sessionId: 1,
    threadNumber: 1,
    priorityScore: 1,
    calledAt: '2026-10-08T08:00:00Z',
    person: {},
  };
}

describe('operator call lock', () => {
  afterEach(() => {
    useOperationStore.getState().reset();
  });

  it('blocks calls without an active session and across every queue while handling a person', () => {
    expect(canCallNext(false, null, false)).toBe(false);
    expect(canCallNext(true, null, false)).toBe(true);
    useOperationStore.getState().startCall(call(1));
    expect(canCallNext(true, useOperationStore.getState().activeCall, false)).toBe(false);
  });

  it('keeps only the four latest confirmed calls', () => {
    [1, 2, 3, 4, 5].forEach((id) => {
      useOperationStore.getState().startCall(call(id));
    });
    expect(useOperationStore.getState().recentCalls.map((item) => item.registrationId)).toEqual([
      5, 4, 3, 2,
    ]);
  });

  it('keeps completed passages while clearing the active call', () => {
    useOperationStore.getState().startCall(call(8));
    useOperationStore.getState().addPassage({
      registrationId: 8,
      ticketNumber: 'A8',
      personName: 'Lina Martin',
      calledAt: '2026-10-08T08:00:00Z',
      closedAt: '2026-10-08T08:10:00Z',
      threadNumber: 1,
      outcome: 'served',
    });
    useOperationStore.getState().closeCall();

    expect(useOperationStore.getState().activeCall).toBeNull();
    expect(useOperationStore.getState().passages).toHaveLength(1);
  });
});
