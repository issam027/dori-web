import type { QueueResponseDto, ReportGroupDto } from '@/api/generated/models';

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
      queueCode: queue?.queueCode ?? String(group.dimension.queueCode ?? ''),
      queueName: queue?.queueName ?? String(group.dimension.queueName ?? queueId),
    };
  });
}

export function reportsToCsv(rows: readonly QueueReportRow[]) {
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
  return [
    ['code', 'file', 'inscrits', 'servis', 'absents', 'taux_absence', 'attente_moyenne_min', 'service_moyen_min'],
    ...data,
  ].map((row) => row.map(escape).join(',')).join('\n');
}
