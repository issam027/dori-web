import { queryKeys } from '@/api/client/query-keys';
import { refreshCockpitQueue } from './cockpit-realtime';

describe('cockpit realtime refresh', () => {
  it('refreshes only queue state and preview after a registration is created', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);

    await refreshCockpitQueue({ invalidateQueries } as never, 'site-1', 'queue-1');

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.queueStatus.detail('queue-1'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.queuePreview.bySite('site-1'),
    });
  });

  it('also refreshes registrations after reconnections', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as never;

    await refreshCockpitQueue(queryClient, 'site-1', 'queue-1', true);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.registrations.all });
    expect(invalidateQueries).toHaveBeenCalledTimes(3);
  });
});
