import type { QueueEngineControllerGetCockpit200 } from '@/api/generated/models';
import { mergeCockpitQueue } from './useCockpit';

function response(queueIds: string[], recentId: string): QueueEngineControllerGetCockpit200 {
  return {
    code: 'OK',
    translationKey: null,
    translationParams: {},
    data: {
      siteId: 'site-1',
      siteName: 'Site',
      serverTime: {},
      operator: { userId: 'user-1', username: 'operator', fullName: 'Operator' },
      queues: queueIds.map((queueId) => ({
        queueId,
        queueCode: queueId,
        queueName: queueId,
        waitingCount: queueId === 'queue-1' ? 8 : 3,
        remainingAppointmentsCount: 0,
        estimatedWaitMinutes: null,
        threadCount: 2,
        occupiedThreadsCount: 0,
        availableThreadNumbers: [1, 2],
        sessions: [],
        currentOperatorSessionId: null,
        sessionOpening: {
          allowed: true,
          availableThreadNumbers: [1, 2],
          requiresReplacement: false,
          replaceableSessions: [],
        },
        centralizedNext: { eligible: false, unavailableReason: 'no_session' },
        activeCall: null,
        nextCandidates: [],
      })),
      recentPassages: [
        {
          registrationId: recentId,
          queueId: 'queue-1',
          queueName: 'Queue 1',
          ticketNumber: 'A001',
          personName: 'Person',
          threadNumber: 1,
          counterName: 'Desk 1',
          calledAt: {},
          closedAt: {},
          outcome: 'served',
        },
      ],
    },
  };
}

describe('cockpit partial refresh merge', () => {
  it('replaces only the refreshed queue and keeps the others', () => {
    const current = response(['queue-1', 'queue-2'], 'old');
    const incoming = response(['queue-1'], 'new');
    const refreshedQueue = incoming.data.queues[0];
    if (!refreshedQueue) throw new Error('Expected a refreshed queue');
    refreshedQueue.waitingCount = 2;

    const merged = mergeCockpitQueue(current, incoming);

    expect(merged.data.queues).toHaveLength(2);
    expect(merged.data.queues[0]?.waitingCount).toBe(2);
    expect(merged.data.queues[1]?.queueId).toBe('queue-2');
    expect(merged.data.recentPassages[0]?.registrationId).toBe('new');
  });

  it('uses the incoming response when no full cache exists', () => {
    const incoming = response(['queue-1'], 'new');
    expect(mergeCockpitQueue(undefined, incoming)).toBe(incoming);
  });
});
