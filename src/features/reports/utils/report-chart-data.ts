import type { QueueResponseDto } from '@/api/generated/models';
import type {
  ReportBucketViewModel,
  ReportGroupViewModel,
  ReportMetricsViewModel,
} from '../report-utils';

export type ComparisonMetric =
  | 'registered'
  | 'served'
  | 'noShow'
  | 'cancelled'
  | 'averageWaitMinutes'
  | 'averageServiceMinutes'
  | 'noShowRate';

function metricValue(bucket: ReportMetricsViewModel, metric: ComparisonMetric) {
  if (metric === 'noShowRate') return (bucket.rates.noShowRate ?? 0) * 100;
  if (metric === 'averageWaitMinutes' || metric === 'averageServiceMinutes')
    return bucket.timing[metric] ?? 0;
  return bucket.volume[metric];
}

export function chartMaximum(series: readonly { values: readonly number[] }[]): number {
  let maximum = 1;
  for (const item of series)
    for (const value of item.values) {
      if (Number.isFinite(value) && value > maximum) maximum = value;
    }
  return maximum;
}

/** Index queue identities once; selection order and palette indices remain stable. */
export function comparisonChartData(
  groups: readonly ReportGroupViewModel[],
  queues: readonly QueueResponseDto[],
  selected: readonly string[] | null,
  metric: ComparisonMetric,
  fallback: (number: number) => string,
) {
  const queuesById = new Map(queues.map((queue) => [queue.queueId, queue]));
  const available = groups.map((group, index) => {
    const value =
      group.dimension.queueId ??
      group.dimension.queue_id ??
      group.dimension.id ??
      group.dimension.value ??
      group.dimension.key;
    const identified = typeof value === 'number' || typeof value === 'string';
    const id = identified ? String(value) : String(index);
    // An explicit identity must never inherit an unrelated queue's label by array position.
    const queue = identified ? queuesById.get(id) : queues[index];
    const label =
      group.dimension.queueName ??
      group.dimension.queue_name ??
      group.dimension.label ??
      group.dimension.name ??
      group.dimension.queueCode ??
      group.dimension.queue_code;
    return {
      id,
      index,
      group,
      label: queue
        ? `${queue.queueCode} · ${queue.queueName}`
        : typeof label === 'string'
          ? label
          : fallback(index + 1),
    };
  });
  const availableIds = new Set(available.map((item) => item.id));
  const effective =
    selected?.filter((id) => availableIds.has(id)) ?? available.slice(0, 3).map((item) => item.id);
  const selection = new Set(effective);
  const visible = available.filter((item) => selection.has(item.id));
  const bucketByPeriod = new Map<string, ReportBucketViewModel>();
  for (const item of visible)
    for (const bucket of item.group.buckets) bucketByPeriod.set(bucket.periodStart, bucket);
  const periods = [...bucketByPeriod.keys()].sort();
  const buckets = periods.flatMap((period) => {
    const bucket = bucketByPeriod.get(period);
    return bucket ? [bucket] : [];
  });
  const series = visible.map((item) => {
    const values = new Map(
      item.group.buckets.map((bucket) => [bucket.periodStart, metricValue(bucket, metric)]),
    );
    return {
      id: item.id,
      label: item.label,
      index: item.index,
      values: periods.map((period) => values.get(period) ?? 0),
    };
  });
  return { available, effective, buckets, series, visible };
}
