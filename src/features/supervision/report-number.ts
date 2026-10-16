export function formatReportNumber(value: number, locale: string): string {
  if (!Number.isFinite(value)) return String(value);
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 20,
  }).format(value);
}

export function formatReportPercent(value: number, locale: string): string {
  return `${formatReportNumber(value * 100, locale)} %`;
}
