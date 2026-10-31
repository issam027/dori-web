import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockServer } from '@/shared/testing/mock-server';
import { useReports } from './useReports';

const queueId = '00000000-0000-4000-8000-000000000010';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useReports', () => {
  it('builds queue groups from one series request', async () => {
    let requestCount = 0;
    mockServer.use(
      http.get('http://localhost:3000/api/v1/monitoring/series', () => {
        requestCount += 1;
        return HttpResponse.json({
          code: 'OK',
          translationKey: null,
          translationParams: {},
          data: {
            generatedAt: '2026-10-31T08:00:00.000Z',
            timezone: 'Africa/Tunis',
            appliedFilters: {
              from: '2026-10-25T00:00:00.000Z',
              to: '2026-11-01T00:00:00.000Z',
              bucket: 'day',
              siteId: '00000000-0000-4000-8000-000000000001',
              queueIds: [queueId],
            },
            totals: {
              registered: 3,
              served: 2,
              noShow: 1,
              cancelled: 0,
              averageWaitMinutes: 5,
              averageServiceMinutes: 4,
            },
            series: [
              {
                periodStart: '2026-10-25T00:00:00.000Z',
                registered: 3,
                served: 2,
                noShow: 1,
                cancelled: 0,
                averageWaitMinutes: 5,
                averageServiceMinutes: 4,
              },
            ],
            breakdowns: {
              byQueue: [
                {
                  queueId,
                  queueName: 'Accueil',
                  registered: 3,
                  served: 2,
                  noShow: 1,
                  cancelled: 0,
                  averageWaitMinutes: 5,
                  averageServiceMinutes: 4,
                  series: [
                    {
                      periodStart: '2026-10-25T00:00:00.000Z',
                      registered: 3,
                      served: 2,
                      noShow: 1,
                      cancelled: 0,
                      averageWaitMinutes: 5,
                      averageServiceMinutes: 4,
                    },
                  ],
                },
              ],
              byUser: [],
              byTier: [],
              byEntryType: [{ entryType: 'walkin', count: 3 }],
              byStatus: [],
            },
          },
        });
      }),
    );

    const { result } = renderHook(
      () =>
        useReports({
          siteId: '00000000-0000-4000-8000-000000000001',
          startDate: '2026-10-25',
          endDate: '2026-10-31',
          queueId,
          granularity: 'day',
          timezone: 'Africa/Tunis',
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestCount).toBe(1);
    expect(result.current.data?.data.groups[0]).toMatchObject({
      dimension: { queueId, queueName: 'Accueil' },
      volume: { registered: 3, served: 2 },
    });
  });
});
