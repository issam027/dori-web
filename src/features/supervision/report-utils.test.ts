import { describe, expect, it } from 'vitest';
import type { QueueResponseDto } from '@/api/generated/models';
import type { ReportGroupDto } from './report-utils';
import { addDays, groupsToQueueRows, reportPeriodDates, reportsToCsv } from './report-utils';

const group: ReportGroupDto = {
  dimension: { queueId: 10 }, buckets: [],
  volume: { registered: 12, walkin: 8, appointments: 4, served: 10, noShow: 1, expired: 0, cancelled: 1 },
  timing: { averageWaitMinutes: 7, medianWaitMinutes: 6, p90WaitMinutes: 12, averageServiceMinutes: 5, medianServiceMinutes: 4, p90ServiceMinutes: 9 },
  rates: { noShowRate: 0.1, cancellationRate: 0.08, expirationRate: 0 },
};

describe('report calculations', () => {
  it('maps grouped API series to queue rows', () => {
    const queue = { queueId: 10, queueCode: 'A', queueName: 'Accueil' } as QueueResponseDto;
    expect(groupsToQueueRows([group], [queue])[0]).toMatchObject({ queueId: 10, queueName: 'Accueil' });
  });

  it('exports grouped rows as CSV', () => {
    const row = { ...group, queueId: 10, queueCode: 'A', queueName: 'Accueil' };
    expect(reportsToCsv([row])).toContain('"Accueil"');
  });

  it('accepts the API maximum inclusive period of 366 days', () => {
    expect(reportPeriodDates('2026-01-01', '2026-12-31')).toHaveLength(365);
    expect(reportPeriodDates('2026-01-01', '2027-01-02')).toEqual([]);
    expect(addDays('2026-10-10', -6)).toBe('2026-10-04');
  });
});
