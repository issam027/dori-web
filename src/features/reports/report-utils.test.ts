import { describe, expect, it } from 'vitest';
import type { QueueResponseDto } from '@/api/generated/models';
import type { ReportGroupViewModel } from './report-utils';
import {
  addDays,
  groupsToQueueRows,
  reportPeriodDates,
  reportsToCsv,
  toReportMetricsViewModel,
} from './report-utils';

const group: ReportGroupViewModel = {
  dimension: { queueId: '00000000-0000-4000-8000-000000000010' },
  buckets: [],
  volume: {
    registered: 12,
    walkin: 8,
    appointments: 4,
    served: 10,
    noShow: 1,
    expired: 0,
    cancelled: 1,
  },
  timing: {
    averageWaitMinutes: 7,
    medianWaitMinutes: 6,
    p90WaitMinutes: 12,
    averageServiceMinutes: 5,
    medianServiceMinutes: 4,
    p90ServiceMinutes: 9,
  },
  rates: { noShowRate: 0.1, cancellationRate: 0.08, expirationRate: 0 },
};

describe('report calculations', () => {
  it('maps grouped API series to queue rows', () => {
    const queue = {
      queueId: '00000000-0000-4000-8000-000000000010',
      queueCode: 'A',
      queueName: 'Accueil',
    } as QueueResponseDto;
    expect(groupsToQueueRows([group], [queue])[0]).toMatchObject({
      queueId: '00000000-0000-4000-8000-000000000010',
      queueName: 'Accueil',
    });
  });

  it('keeps nullable metrics and resolves string queue identifiers from API dimensions', () => {
    const nullableGroup: ReportGroupViewModel = {
      ...group,
      dimension: { queueId: '00000000-0000-4000-8000-000000000010', queueName: 'Nom API' },
      timing: {
        averageWaitMinutes: null,
        medianWaitMinutes: null,
        p90WaitMinutes: null,
        averageServiceMinutes: null,
        medianServiceMinutes: null,
        p90ServiceMinutes: null,
      },
      rates: { noShowRate: null, cancellationRate: null, expirationRate: null },
    };
    const queue = {
      queueId: '00000000-0000-4000-8000-000000000010',
      queueCode: 'A',
      queueName: 'Accueil',
    } as QueueResponseDto;
    const [row] = groupsToQueueRows([nullableGroup], [queue]);

    expect(row).toMatchObject({
      queueId: '00000000-0000-4000-8000-000000000010',
      queueCode: 'A',
      queueName: 'Accueil',
    });
    expect(row?.timing.averageWaitMinutes).toBeNull();
    expect(row?.rates.noShowRate).toBeNull();
  });

  it('returns no queue rows for an empty API group list', () => {
    expect(groupsToQueueRows([], [])).toEqual([]);
  });

  it('maps generated API metrics to the report view model without inventing unavailable metrics', () => {
    expect(
      toReportMetricsViewModel(
        {
          registered: 4,
          served: 2,
          noShow: 1,
          cancelled: 1,
          averageWaitMinutes: null,
        medianWaitMinutes: null,
        p90WaitMinutes: null,
          averageServiceMinutes: 5,
        medianServiceMinutes: null,
        p90ServiceMinutes: null,
        },
        3,
        1,
      ),
    ).toEqual({
      volume: {
        registered: 4,
        served: 2,
        walkin: 3,
        appointments: 1,
        noShow: 1,
        cancelled: 1,
        expired: 0,
      },
      timing: {
        averageWaitMinutes: null,
        medianWaitMinutes: null,
        p90WaitMinutes: null,
        averageServiceMinutes: 5,
        medianServiceMinutes: null,
        p90ServiceMinutes: null,
      },
      rates: { noShowRate: 0.25, cancellationRate: 0.25, expirationRate: null },
    });
  });

  it('exports grouped rows as CSV', () => {
    const row = {
      ...group,
      queueId: '00000000-0000-4000-8000-000000000010',
      queueCode: 'A',
      queueName: 'Accueil',
    };
    expect(reportsToCsv([row])).toContain('"Accueil"');
  });

  it('accepts the API maximum inclusive period of 366 days', () => {
    expect(reportPeriodDates('2026-01-01', '2026-12-31')).toHaveLength(365);
    expect(reportPeriodDates('2026-01-01', '2027-01-02')).toEqual([]);
    expect(addDays('2026-10-10', -6)).toBe('2026-10-04');
  });
});
