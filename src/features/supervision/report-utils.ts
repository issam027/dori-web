import type { DailyQueueReportResponseDto } from '@/api/generated/models';

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
  if (dayCount > 7) return [];
  return Array.from({ length: dayCount }, (_, index) =>
    formatBusinessDate(new Date(start + index * DAY_IN_MS)),
  );
}

export function aggregateReports(reports: readonly DailyQueueReportResponseDto[]) {
  const registered = reports.reduce((sum, report) => sum + report.volume.totalRegistered, 0);
  const served = reports.reduce((sum, report) => sum + report.volume.totalServed, 0);
  const noShow = reports.reduce((sum, report) => sum + report.volume.totalNoShow, 0);
  const weight = reports.reduce((sum, report) => sum + report.volume.totalRegistered, 0);
  const weighted = (field: 'averageWaitMinutes' | 'averageServiceMinutes') =>
    weight === 0
      ? 0
      : reports.reduce(
          (sum, report) => sum + report.kpis[field] * report.volume.totalRegistered,
          0,
        ) / weight;
  return {
    registered,
    served,
    noShowRate: served + noShow === 0 ? 0 : noShow / (served + noShow),
    averageWaitMinutes: weighted('averageWaitMinutes'),
    averageServiceMinutes: weighted('averageServiceMinutes'),
  };
}

export function aggregateReportsByQueue(
  reports: readonly DailyQueueReportResponseDto[],
): DailyQueueReportResponseDto[] {
  const grouped = new Map<number, DailyQueueReportResponseDto[]>();
  reports.forEach((report) => {
    const queueReports = grouped.get(report.queueId) ?? [];
    queueReports.push(report);
    grouped.set(report.queueId, queueReports);
  });
  return Array.from(grouped.values(), (queueReports) => {
    const first = queueReports[0];
    if (!first) throw new Error('A queue report group cannot be empty');
    const totals = aggregateReports(queueReports);
    const sumVolume = (field: keyof DailyQueueReportResponseDto['volume']) =>
      queueReports.reduce((sum, report) => sum + report.volume[field], 0);

    return {
      ...first,
      volume: {
        totalRegistered: totals.registered,
        totalWalkin: sumVolume('totalWalkin'),
        totalAppointment: sumVolume('totalAppointment'),
        totalServed: totals.served,
        totalNoShow: sumVolume('totalNoShow'),
        totalExpired: sumVolume('totalExpired'),
        totalCancelled: sumVolume('totalCancelled'),
        totalOpen: sumVolume('totalOpen'),
      },
      kpis: {
        noShowRate: totals.noShowRate,
        averageWaitMinutes: totals.averageWaitMinutes,
        averageServiceMinutes: totals.averageServiceMinutes,
      },
    };
  });
}

export function reportsToCsv(reports: readonly DailyQueueReportResponseDto[]) {
  const rows = reports.map((report) => [
    report.businessDate,
    report.siteName,
    report.queueCode,
    report.queueName,
    report.volume.totalRegistered,
    report.volume.totalServed,
    report.volume.totalNoShow,
    report.kpis.noShowRate,
    report.kpis.averageWaitMinutes,
    report.kpis.averageServiceMinutes,
  ]);
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return [
    [
      'date',
      'site',
      'code',
      'file',
      'inscrits',
      'servis',
      'absents',
      'taux_absence',
      'attente_moyenne_min',
      'service_moyen_min',
    ],
    ...rows,
  ]
    .map((row) => row.map(escape).join(','))
    .join('\n');
}
