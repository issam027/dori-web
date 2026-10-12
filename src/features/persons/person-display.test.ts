import { describe, expect, it } from 'vitest';
import { displayPersonLanguage, formatPersonDate, normalizePersonText } from './person-display';

describe('person display safeguards', () => {
  it('accepts missing runtime values despite stricter generated contracts', () => {
    expect(displayPersonLanguage(null)).toBeUndefined();
    expect(displayPersonLanguage(undefined)).toBeUndefined();
    expect(formatPersonDate(null, 'fr')).toBeUndefined();
    expect(formatPersonDate('invalid-date', 'fr')).toBeUndefined();
    expect(normalizePersonText(null)).toBe('');
    expect(normalizePersonText(undefined)).toBe('');
  });

  it('normalizes valid language and date values', () => {
    expect(displayPersonLanguage(' fr ')).toBe('FR');
    expect(formatPersonDate('2026-10-12', 'fr')).toContain('2026');
  });
});
