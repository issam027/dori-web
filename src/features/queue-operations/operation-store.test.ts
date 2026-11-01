import type { CallNextRegistrationResponseDto } from '@/api/generated/models';
import { useOperationStore } from '@/shared/queue-operations/operation-store';

function call(registrationId: string): CallNextRegistrationResponseDto {
  return {
    registrationId,
    ticketNumber: `A${registrationId}`,
    entryType: 'walkin',
    calledEarly: false,
    tier: { tierId: 'tier-1', tierCode: 'STANDARD', tierName: 'Standard' },
    status: 'called',
    sessionId: '00000000-0000-4000-8000-000000000001',
    threadNumber: 1,
    priorityScore: 1,
    calledAt: '2026-10-08T08:00:00Z',
    person: { personId: 'person-1', hasNotes: false },
  };
}

describe('operator call lock by queue', () => {
  afterEach(() => {
    useOperationStore.getState().reset();
  });

  it('blocks only the queue that already has an active call', () => {
    useOperationStore
      .getState()
      .startCall(
        '00000000-0000-4000-8000-000000000010',
        call('00000000-0000-4000-8000-000000000001'),
      );
  });

  it('does not create an active call for another queue', () => {
    useOperationStore.getState().startCall('queue-one', call('registration-one'));
    expect(useOperationStore.getState().activeCalls['queue-one']).toBeDefined();
    expect(useOperationStore.getState().activeCalls['queue-two']).toBeUndefined();
  });

  it('keeps only the four latest confirmed calls', () => {
    [
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-000000000005',
    ].forEach((id) => {
      useOperationStore.getState().startCall(id, call(id));
    });
    expect(useOperationStore.getState().recentCalls.map((item) => item.registrationId)).toEqual([
      '00000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000002',
    ]);
  });

  it('keeps completed passages while clearing the active call', () => {
    useOperationStore
      .getState()
      .startCall(
        '00000000-0000-4000-8000-000000000010',
        call('00000000-0000-4000-8000-000000000008'),
      );
    useOperationStore.getState().addPassage({
      registrationId: '00000000-0000-4000-8000-000000000008',
      ticketNumber: 'A8',
      personName: 'Lina Martin',
      calledAt: '2026-10-08T08:00:00Z',
      closedAt: '2026-10-08T08:10:00Z',
      threadNumber: 1,
      outcome: 'served',
    });
    useOperationStore.getState().closeCall('00000000-0000-4000-8000-000000000010');

    expect(
      useOperationStore.getState().activeCalls['00000000-0000-4000-8000-000000000010'],
    ).toBeUndefined();
    expect(useOperationStore.getState().passages).toHaveLength(1);
  });
});
