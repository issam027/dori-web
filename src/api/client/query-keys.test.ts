import { QueryClient } from '@tanstack/react-query';
import { invalidateQueueCall, invalidateQueueSession } from './query-invalidations';
import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('keeps scope, filters, pagination and language-dependent values distinct', () => {
    expect(
      queryKeys.persons.search('00000000-0000-4000-8000-000000000001', 'ali', 1, 5, 'fr'),
    ).not.toEqual(
      queryKeys.persons.search('00000000-0000-4000-8000-000000000002', 'ali', 1, 5, 'fr'),
    );
    expect(
      queryKeys.persons.search('00000000-0000-4000-8000-000000000001', 'ali', 1, 5, 'fr'),
    ).not.toEqual(
      queryKeys.persons.search('00000000-0000-4000-8000-000000000001', 'ali', 2, 5, 'fr'),
    );
    expect(queryKeys.admin.translations('fr')).not.toEqual(queryKeys.admin.translations('en'));
    expect(
      queryKeys.reports.daily('00000000-0000-4000-8000-000000000001', '2026-10-01', '2026-10-07', [
        '00000000-0000-4000-8000-000000000010',
      ]),
    ).not.toEqual(
      queryKeys.reports.daily('00000000-0000-4000-8000-000000000001', '2026-10-01', '2026-10-07', [
        '00000000-0000-4000-8000-000000000011',
      ]),
    );
    expect(
      queryKeys.appointments.byQueueRange(
        '00000000-0000-4000-8000-000000000001',
        '2026-10-01',
        '2026-10-07',
      ),
    ).not.toEqual(
      queryKeys.appointments.byQueueRange(
        '00000000-0000-4000-8000-000000000001',
        '2026-10-08',
        '2026-10-14',
      ),
    );
    expect(
      queryKeys.appointments.byQueueRange(
        '00000000-0000-4000-8000-000000000001',
        '2026-10-01',
        '2026-10-07',
      ),
    ).not.toEqual(
      queryKeys.appointments.byQueueRange(
        '00000000-0000-4000-8000-000000000002',
        '2026-10-01',
        '2026-10-07',
      ),
    );
  });

  it('preserves the legacy tuple shapes of the centralized feature keys', () => {
    const filters = { search: 'abcd', sort: 'username:asc' };
    const series = {
      siteId: '00000000-0000-4000-8000-000000000001',
      queueIds: ['00000000-0000-4000-8000-000000000010'],
    };

    expect(queryKeys.admin.usersPage(2, filters)).toEqual(['admin', 'users-page', 2, filters]);
    expect(queryKeys.admin.userDetail('00000000-0000-4000-8000-000000000007')).toEqual([
      'admin',
      'user-detail',
      '00000000-0000-4000-8000-000000000007',
    ]);
    expect(queryKeys.admin.translationsPage(3, filters)).toEqual([
      'admin',
      'translations-page',
      3,
      filters,
    ]);
    expect(queryKeys.queueOperators.byQueue('00000000-0000-4000-8000-000000000010')).toEqual([
      'queue-operators',
      '00000000-0000-4000-8000-000000000010',
    ]);
    expect(
      queryKeys.queueOperators.candidates(
        '00000000-0000-4000-8000-000000000010',
        '00000000-0000-4000-8000-000000000001',
        'abcd',
        2,
      ),
    ).toEqual([
      'queue-operator-candidates',
      '00000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000001',
      'abcd',
      2,
    ]);
    expect(queryKeys.monitoring.series(series)).toEqual(['monitoring', 'series', series]);
  });

  it('invalidates only resources targeted by a queue operation', async () => {
    const queryClient = new QueryClient();
    const targetedKeys = [
      queryKeys.queueStatus.detail('queue-1'),
      queryKeys.queuePreview.bySite('site-1'),
      queryKeys.queueSessions.byQueue('queue-1'),
      queryKeys.threads.byQueue('queue-1'),
      queryKeys.registrations.list({ queueId: 'queue-1' }),
      queryKeys.registrations.list({ siteId: 'site-1' }),
      queryKeys.registrations.operator('user-1', 'CALLED', 'site-1', 100),
    ];
    const unrelatedKeys = [
      queryKeys.queues.detail('queue-1'),
      queryKeys.queueStatus.detail('queue-2'),
      queryKeys.queuePreview.bySite('site-2'),
      queryKeys.queueSessions.byQueue('queue-2'),
      queryKeys.threads.byQueue('queue-2'),
      queryKeys.registrations.list({ queueId: 'queue-2' }),
    ];
    [...targetedKeys, ...unrelatedKeys].forEach((key) => queryClient.setQueryData(key, 'cached'));

    await invalidateQueueCall(queryClient, 'queue-1', 'site-1');
    await invalidateQueueSession(queryClient, 'queue-1');

    targetedKeys.forEach((key) => {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    });
    unrelatedKeys.forEach((key) => {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    });
  });
});
