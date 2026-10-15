import type { QueueResponseDto, ReportBucketDto, ReportGroupDto, ReportMetricsDto } from '@/api/generated/models';

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

export type QueueReportRow = ReportGroupDto & {
  queueId: number;
  queueCode: string;
  queueName: string;
};

export function groupsToQueueRows(
  groups: readonly ReportGroupDto[],
  queues: readonly QueueResponseDto[],
): QueueReportRow[] {
  return groups.map((group, index) => {
    const rawId = group.dimension.queueId ?? group.dimension.id;
    const queueId = typeof rawId === 'number' ? rawId : Number(rawId);
    const queue = queues.find((candidate) => candidate.queueId === queueId) ?? queues[index];
    return {
      ...group,
      queueId: Number.isFinite(queueId) ? queueId : (queue?.queueId ?? index),
      queueCode:
        queue?.queueCode ??
        (typeof group.dimension.queueCode === 'string' ? group.dimension.queueCode : ''),
      queueName:
        queue?.queueName ??
        (typeof group.dimension.queueName === 'string'
          ? group.dimension.queueName
          : String(queueId)),
    };
  });
}

export function reportsToCsv(rows: readonly QueueReportRow[], buckets: readonly ReportBucketDto[] = [], summary?: ReportMetricsDto) {
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
    ['code', 'file', 'inscrits', 'servis', 'absents', 'taux_absence', 'attente_moyenne_min', 'service_moyen_min'],
    ...data,
  ];
  const summarySection = summary ? [
    ['SYNTHESE'],
    ['inscrits', 'servis', 'sans_rendez_vous', 'rendez_vous', 'absents', 'annules', 'expires', 'attente_moyenne_min', 'attente_mediane_min', 'attente_p90_min', 'service_moyen_min', 'service_median_min', 'service_p90_min'],
    [summary.volume.registered, summary.volume.served, summary.volume.walkin, summary.volume.appointments, summary.volume.noShow, summary.volume.cancelled, summary.volume.expired, summary.timing.averageWaitMinutes ?? '', summary.timing.medianWaitMinutes ?? '', summary.timing.p90WaitMinutes ?? '', summary.timing.averageServiceMinutes ?? '', summary.timing.medianServiceMinutes ?? '', summary.timing.p90ServiceMinutes ?? ''],
    [],
  ] : [];
  const timelineSection = buckets.length ? [
    [], ['SERIE TEMPORELLE'],
    ['debut', 'fin', 'inscrits', 'sans_rendez_vous', 'rendez_vous', 'servis', 'absents', 'annules', 'expires', 'attente_moyenne_min', 'attente_mediane_min', 'attente_p90_min', 'service_moyen_min', 'service_median_min', 'service_p90_min', 'taux_absence'],
    ...buckets.map((bucket) => [bucket.periodStart, bucket.periodEnd, bucket.volume.registered, bucket.volume.walkin, bucket.volume.appointments, bucket.volume.served, bucket.volume.noShow, bucket.volume.cancelled, bucket.volume.expired, bucket.timing.averageWaitMinutes ?? '', bucket.timing.medianWaitMinutes ?? '', bucket.timing.p90WaitMinutes ?? '', bucket.timing.averageServiceMinutes ?? '', bucket.timing.medianServiceMinutes ?? '', bucket.timing.p90ServiceMinutes ?? '', bucket.rates.noShowRate ?? '']),
  ] : [];
  return [...summarySection, ...queueSection, ...timelineSection].map((row) => row.map(escape).join(',')).join('\n');
}
