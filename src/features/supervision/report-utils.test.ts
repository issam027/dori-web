import { describe, expect, it } from 'vitest';
import type { DailyQueueReportResponseDto } from '@/api/generated/models';
import {
  addDays,
  aggregateReports,
  aggregateReportsByQueue,
  reportPeriodDates,
  reportsToCsv,
} from './report-utils';

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

  it('builds an inclusive period limited to seven days', () => {
    expect(reportPeriodDates('2026-10-04', '2026-10-10')).toHaveLength(7);
    expect(reportPeriodDates('2026-10-04', '2026-10-11')).toEqual([]);
    expect(reportPeriodDates('2026-10-10', '2026-10-09')).toEqual([]);
    expect(addDays('2026-10-10', -6)).toBe('2026-10-04');
  });

  it('consolidates daily reports into one weighted row per queue', () => {
    const first = report(10, 8, 2, 10);
    const second = { ...report(30, 27, 3, 20), queueId: first.queueId, queueCode: first.queueCode };
    const [consolidated] = aggregateReportsByQueue([first, second]);

    expect(consolidated?.volume.totalRegistered).toBe(40);
    expect(consolidated?.volume.totalServed).toBe(35);
    expect(consolidated?.kpis.averageWaitMinutes).toBe(17.5);
    expect(consolidated?.kpis.noShowRate).toBe(5 / 40);
  });
});
