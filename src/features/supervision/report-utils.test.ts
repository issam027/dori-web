import { describe, expect, it } from 'vitest';
import type { DailyQueueReportResponseDto } from '@/api/generated/models';
import { aggregateReports, reportsToCsv } from './report-utils';

const report = (
  registered: number,
  served: number,
  noShow: number,
  wait: number,
): DailyQueueReportResponseDto => ({
  queueId: registered,
  queueCode: `Q${String(registered)}`,
  queueName: 'Accueil',
  siteName: 'Site',
  businessDate: '2026-10-08',
  volume: {
    totalRegistered: registered,
    totalWalkin: registered,
    totalAppointment: 0,
    totalServed: served,
    totalNoShow: noShow,
    totalExpired: 0,
    totalCancelled: 0,
    totalOpen: 0,
  },
  kpis: { noShowRate: 0, averageWaitMinutes: wait, averageServiceMinutes: 5 },
});

describe('report calculations', () => {
  it('aggregates API reports with weighted averages', () => {
    expect(aggregateReports([report(10, 8, 2, 10), report(30, 27, 3, 20)])).toEqual({
      registered: 40,
      served: 35,
      noShowRate: 5 / 40,
      averageWaitMinutes: 17.5,
      averageServiceMinutes: 5,
    });
  });

  it('exports the API rows as a clearly local CSV', () => {
    const csv = reportsToCsv([report(10, 8, 2, 10)]);
    expect(csv).toContain('attente_moyenne_min');
    expect(csv).toContain('"Accueil"');
  });
});
