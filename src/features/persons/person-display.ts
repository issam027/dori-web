export function displayPersonLanguage(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized.toUpperCase() : undefined;
}

export function normalizePersonText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function formatPersonDate(
  value: string | null | undefined,
  locale: string,
): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
