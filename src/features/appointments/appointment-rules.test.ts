import { describe, expect, it } from 'vitest';
import { appointmentLocalParts, appointmentUtcIso } from './appointment-rules';

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
  });
});
