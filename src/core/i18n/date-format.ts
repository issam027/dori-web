import { getDirection, getTextDirection } from './config';

export type DateValue = string | number | Date;

function validDate(value: DateValue | null | undefined): Date | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDateValue(
  value: DateValue | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string | undefined {
  const date = validDate(value);
  if (!date) return undefined;
  const formatted = new Intl.DateTimeFormat(locale, options).format(date);
  // Arabic date groups retain their reading order inside the Tunisian LTR layout.
  return getTextDirection(locale) !== getDirection(locale)
    ? '\u2067' + formatted + '\u2069'
    : formatted;
}

export function formatDateTime(
  value: DateValue | null | undefined,
  locale: string,
): string | undefined {
  return formatDateValue(value, locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(
  value: DateValue | null | undefined,
  locale: string,
  dateStyle: 'short' | 'medium' | 'long' | 'full' = 'long',
): string | undefined {
  return formatDateValue(value, locale, { dateStyle });
}
