import { describe, expect, it } from 'vitest';
import type { QueueResponseDto } from '@/api/generated/models';
import { chartMaximum, comparisonChartData } from './report-chart-data';
import { toReportMetricsViewModel, type ReportGroupViewModel } from '../report-utils';

function group(id: string, name: string, counts: number[]): ReportGroupViewModel {
  const metrics = toReportMetricsViewModel({
    registered: 10,
    served: 8,
    noShow: 1,
    cancelled: 1,
    medianWaitMinutes: null,
    p90WaitMinutes: null,
    medianServiceMinutes: null,
    p90ServiceMinutes: null,
    averageWaitMinutes: 10,
    averageServiceMinutes: 5,
  });
  return {
    ...metrics,
    dimension: { queueId: id, queueName: name },
    buckets: counts.map((registered, index) => ({
      ...metrics,
      volume: { ...metrics.volume, registered },
      periodStart: `2026-11-0${String(index + 1)}`,
      periodEnd: `2026-11-0${String(index + 2)}`,
    })),
  };
}
describe('report chart data', () => {
  it('keeps a group label when its queue is absent from the lookup', () => {
    const queues = [
      { queueId: 'other', queueCode: 'B', queueName: 'Other queue' },
    ] as QueueResponseDto[];
    const data = comparisonChartData(
      [group('missing', 'Expected queue', [3])],
      queues,
      null,
      'registered',
      String,
    );
    expect(data.available[0]?.label).toBe('Expected queue');
  });
  it('retains palette positions, fills missing periods and respects empty selection', () => {
    const groups = [group('a', 'A', [1, 2]), group('b', 'B', [4])];
    const data = comparisonChartData(groups, [], ['a', 'b', 'deleted'], 'registered', String);
    expect(data.effective).toEqual(['a', 'b']);
    expect(data.series[1]).toMatchObject({ index: 1, values: [4, 0] });
    expect(comparisonChartData(groups, [], [], 'registered', String).series).toEqual([]);
  });
  it('handles large series without argument spreading or non-finite scales', () => {
    expect(
      chartMaximum([
        { values: Array.from({ length: 300000 }, (_, i) => i) },
        { values: [Infinity, NaN] },
      ]),
    ).toBe(299999);
    expect(chartMaximum([])).toBe(1);
  });
});
