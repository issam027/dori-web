import { formatReportNumber, formatReportPercent } from './report-number';

describe('report number formatting', () => {
  it('does not add or remove decimal digits', () => {
    expect(formatReportNumber(12, 'fr')).toBe('12');
    expect(formatReportNumber(12.32, 'fr')).toBe('12,32');
    expect(formatReportNumber(12.32, 'en')).toBe('12.32');
  });

  it('formats API rates as localized percentages without fixed decimals', () => {
    expect(formatReportPercent(0.12, 'fr')).toBe('12 %');
    expect(formatReportPercent(0.1232, 'fr')).toBe('12,32 %');
  });
});
