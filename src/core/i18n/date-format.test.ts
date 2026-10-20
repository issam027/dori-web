import { formatDate, formatDateTime, formatDateValue } from './date-format';

describe('date formatting', () => {
  const value = '2026-01-15T11:00:00.000Z';

  it('formats valid values with the requested locale and options', () => {
    expect(formatDate(value, 'fr-FR')).toBe(
      new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value)),
    );
    expect(formatDateTime(value, 'en-US')).toBe(
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value)),
    );
    expect(formatDateValue(value, 'fr-FR', { hour: '2-digit' })).toBe(
      new Intl.DateTimeFormat('fr-FR', { hour: '2-digit' }).format(new Date(value)),
    );
  });

  it('returns undefined for absent or invalid values', () => {
    expect(formatDateTime(undefined, 'fr-FR')).toBeUndefined();
    expect(formatDateTime('invalid', 'fr-FR')).toBeUndefined();
  });
});
