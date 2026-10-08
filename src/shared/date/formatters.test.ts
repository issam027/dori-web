import { formatCurrency, formatDateTime, selectPlural } from './formatters';

describe('localized formatters', () => {
  it('renders dates in the site timezone instead of the browser timezone', () => {
    const value = '2026-10-08T10:00:00.000Z';
    expect(formatDateTime(value, 'fr-FR', 'Europe/Paris')).toContain('12:00');
    expect(formatDateTime(value, 'fr-FR', 'Africa/Tunis')).toContain('11:00');
  });

  it('formats ISO currencies and plural categories by locale', () => {
    expect(formatCurrency(25, 'EUR', 'fr-FR')).toContain('25,00');
    expect(selectPlural(1, 'en')).toBe('one');
    expect(selectPlural(2, 'en')).toBe('other');
  });
});
