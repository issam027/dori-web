import { describe, expect, it } from 'vitest';
import { appointmentLocalParts, appointmentUtcIso, dateInTimeZone } from './appointment-rules';

describe('appointment timezone rules', () => {
  it('round-trips a Tunis appointment without using the browser timezone', () => {
    const iso = appointmentUtcIso('2026-10-08', '09:30', 'Africa/Tunis');
    expect(iso).toBe('2026-10-08T08:30:00.000Z');
    expect(appointmentLocalParts(iso, 'Africa/Tunis')).toEqual({
      date: '2026-10-08',
      time: '09:30',
    });
  });

  it('handles daylight-saving offsets for Paris', () => {
    expect(appointmentUtcIso('2026-07-15', '14:00', 'Europe/Paris')).toBe(
      '2026-07-15T12:00:00.000Z',
    );
    expect(appointmentUtcIso('2026-01-15', '14:00', 'Europe/Paris')).toBe(
      '2026-01-15T13:00:00.000Z',
    );
  });

  it('uses the site civil date rather than the browser or UTC date', () => {
    const instant = new Date('2026-10-08T23:30:00.000Z');
    expect(dateInTimeZone('Europe/Paris', instant)).toBe('2026-10-09');
    expect(dateInTimeZone('America/New_York', instant)).toBe('2026-10-08');
  });
});
