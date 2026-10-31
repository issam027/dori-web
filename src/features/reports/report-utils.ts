import type { MonitoringSeriesMetricsDto, QueueResponseDto } from '@/api/generated/models';

interface ReportVolumeViewModel {
  registered: number;
  served: number;
  walkin: number;
  appointments: number;
  noShow: number;
  cancelled: number;
  expired: number;
}
interface ReportTimingViewModel {
  averageWaitMinutes: number | null;
  medianWaitMinutes: number | null;
  p90WaitMinutes: number | null;
  averageServiceMinutes: number | null;
  medianServiceMinutes: number | null;
  p90ServiceMinutes: number | null;
}
interface ReportRatesViewModel {
  noShowRate: number | null;
  cancellationRate: number | null;
  expirationRate: number | null;
}
export interface ReportMetricsViewModel {
  volume: ReportVolumeViewModel;
  timing: ReportTimingViewModel;
  rates: ReportRatesViewModel;
}
export interface ReportBucketViewModel extends ReportMetricsViewModel {
  periodStart: string;
  periodEnd: string;
}
export interface ReportGroupViewModel extends ReportMetricsViewModel {
  dimension: Record<string, string | number | undefined>;
  buckets: ReportBucketViewModel[];
}

/** Maps the generated API contract to the richer shape consumed by report views. */
export function toReportMetricsViewModel(
  value: MonitoringSeriesMetricsDto,
  walkin = 0,
  appointments = 0,
): ReportMetricsViewModel {
  return {
    volume: {
      registered: value.registered,
      served: value.served,
      noShow: value.noShow,
      cancelled: value.cancelled,
      walkin,
      appointments,
      expired: 0,
    },
    timing: {
      averageWaitMinutes: value.averageWaitMinutes,
      averageServiceMinutes: value.averageServiceMinutes,
      medianWaitMinutes: value.medianWaitMinutes ?? null,
      p90WaitMinutes: value.p90WaitMinutes ?? null,
      medianServiceMinutes: value.medianServiceMinutes ?? null,
      p90ServiceMinutes: value.p90ServiceMinutes ?? null,
    },
    rates: {
      noShowRate: value.registered ? value.noShow / value.registered : null,
      cancellationRate: value.registered ? value.cancelled / value.registered : null,
      expirationRate: null,
    },
  };
}

const DAY_IN_MS = 86_400_000;

function parseBusinessDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatBusinessDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return formatBusinessDate(new Date(parseBusinessDate(date).getTime() + days * DAY_IN_MS));
}

export function reportPeriodDates(startDate: string, endDate: string): string[] {
  const start = parseBusinessDate(startDate).getTime();
  const end = parseBusinessDate(endDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const dayCount = Math.floor((end - start) / DAY_IN_MS) + 1;
  if (dayCount > 366) return [];
  return Array.from({ length: dayCount }, (_, index) =>
    formatBusinessDate(new Date(start + index * DAY_IN_MS)),
  );
}

export type QueueReportRow = ReportGroupViewModel & {
  queueId: string;
  queueCode: string;
  queueName: string;
};

export function groupsToQueueRows(
  groups: readonly ReportGroupViewModel[],
  queues: readonly QueueResponseDto[],
): QueueReportRow[] {
  return groups.map((group, index) => {
    const rawId = group.dimension.queueId ?? group.dimension.id;
    const queue = queues.find((candidate) => candidate.queueId === rawId) ?? queues[index];
    const queueId = typeof rawId === 'string' ? rawId : queue?.queueId;
    return {
      ...group,
      queueId: queueId ?? queue?.queueId ?? `unknown-${String(index)}`,
      queueCode:
        queue?.queueCode ??
        (typeof group.dimension.queueCode === 'string' ? group.dimension.queueCode : ''),
      queueName:
        queue?.queueName ??
        (typeof group.dimension.queueName === 'string'
          ? group.dimension.queueName
          : (queueId ?? '')),
    };
  });
}

export function reportsToCsv(
  rows: readonly QueueReportRow[],
  buckets: readonly ReportBucketViewModel[] = [],
  summary?: ReportMetricsViewModel,
) {
  const data = rows.map((row) => [
    row.queueCode,
    row.queueName,
    row.volume.registered,
    row.volume.served,
    row.volume.noShow,
    row.rates.noShowRate ?? '',
    row.timing.averageWaitMinutes ?? '',
    row.timing.averageServiceMinutes ?? '',
  ]);
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const queueSection = [
    ['COMPARAISON PAR FILE'],
    [
      'code',
      'file',
      'inscrits',
      'servis',
      'absents',
      'taux_absence',
      'attente_moyenne_min',
      'service_moyen_min',
    ],
    ...data,
  ];
  const summarySection = summary
    ? [
        ['SYNTHESE'],
        [
          'inscrits',
          'servis',
          'sans_rendez_vous',
          'rendez_vous',
          'absents',
          'annules',
          'expires',
          'attente_moyenne_min',
          'attente_mediane_min',
          'attente_p90_min',
          'service_moyen_min',
          'service_median_min',
          'service_p90_min',
        ],
        [
          summary.volume.registered,
          summary.volume.served,
          summary.volume.walkin,
          summary.volume.appointments,
          summary.volume.noShow,
          summary.volume.cancelled,
          summary.volume.expired,
          summary.timing.averageWaitMinutes ?? '',
          summary.timing.medianWaitMinutes ?? '',
          summary.timing.p90WaitMinutes ?? '',
          summary.timing.averageServiceMinutes ?? '',
          summary.timing.medianServiceMinutes ?? '',
          summary.timing.p90ServiceMinutes ?? '',
        ],
        [],
      ]
    : [];
  const timelineSection = buckets.length
    ? [
        [],
        ['SERIE TEMPORELLE'],
        [
          'debut',
          'fin',
          'inscrits',
          'sans_rendez_vous',
          'rendez_vous',
          'servis',
          'absents',
          'annules',
          'expires',
          'attente_moyenne_min',
          'attente_mediane_min',
          'attente_p90_min',
          'service_moyen_min',
          'service_median_min',
          'service_p90_min',
          'taux_absence',
        ],
        ...buckets.map((bucket) => [
          bucket.periodStart,
          bucket.periodEnd,
          bucket.volume.registered,
          bucket.volume.walkin,
          bucket.volume.appointments,
          bucket.volume.served,
          bucket.volume.noShow,
          bucket.volume.cancelled,
          bucket.volume.expired,
          bucket.timing.averageWaitMinutes ?? '',
          bucket.timing.medianWaitMinutes ?? '',
          bucket.timing.p90WaitMinutes ?? '',
          bucket.timing.averageServiceMinutes ?? '',
          bucket.timing.medianServiceMinutes ?? '',
          bucket.timing.p90ServiceMinutes ?? '',
          bucket.rates.noShowRate ?? '',
        ]),
      ]
    : [];
  return [...summarySection, ...queueSection, ...timelineSection]
    .map((row) => row.map(escape).join(','))
    .join('\n');
}
