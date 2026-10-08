import type { DailyQueueReportResponseDto } from '@/api/generated/models';

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
