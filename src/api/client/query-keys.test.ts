import { QueryClient } from '@tanstack/react-query';
import { invalidateQueueOperations } from './query-invalidations';
import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('keeps scope, filters, pagination and language-dependent values distinct', () => {
    expect(queryKeys.persons.search(1, 'ali', 1, 5, 'fr')).not.toEqual(
      queryKeys.persons.search(2, 'ali', 1, 5, 'fr'),
    );
    expect(queryKeys.persons.search(1, 'ali', 1, 5, 'fr')).not.toEqual(
      queryKeys.persons.search(1, 'ali', 2, 5, 'fr'),
    );
    expect(queryKeys.admin.translations('fr')).not.toEqual(
      queryKeys.admin.translations('en'),
    );
    expect(queryKeys.reports.daily(1, '2026-10-01', '2026-10-07', [10])).not.toEqual(
      queryKeys.reports.daily(1, '2026-10-01', '2026-10-07', [11]),
    );
  });

  it('invalidates every queue-operation resource through one policy', async () => {
    const queryClient = new QueryClient();
    const roots = [
      queryKeys.queues.all,
      queryKeys.queueSessions.all,
      queryKeys.threads.all,
      queryKeys.queueStatus.all,
      queryKeys.queuePreview.all,
      queryKeys.registrations.all,
    ];
    roots.forEach((key) => queryClient.setQueryData([...key, 'test'], 'cached'));

    await invalidateQueueOperations(queryClient);

    roots.forEach((key) => {
      expect(queryClient.getQueryState([...key, 'test'])?.isInvalidated).toBe(true);
    });
  });
});
