import { describe, expect, it } from 'vitest';
import {
  appointmentLocalParts,
  appointmentUtcIso,
  dateInTimeZone,
  isSlotAvailable,
  slotTime,
} from './appointment-rules';

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

  it('converts UTC slot times returned by API into the service timezone', () => {
    // 08:00 UTC in Paris (UTC+2 in October) is 10:00 local time
    expect(slotTime('2026-10-16T08:00:00.000Z', 'Europe/Paris')).toBe('10:00');
    // ISO string without trailing Z should also be treated as UTC
    expect(slotTime('2026-10-16T08:00:00', 'Europe/Paris')).toBe('10:00');
    // In Tunis (UTC+1), 08:00 UTC is 09:00
    expect(slotTime('2026-10-16T08:00:00.000Z', 'Africa/Tunis')).toBe('09:00');
    // Plain time string without ISO
    expect(slotTime('10:30', 'Europe/Paris')).toBe('10:30');
    // Empty value
    expect(slotTime('', 'Europe/Paris')).toBe('');
  });

  it('evaluates slot availability based on available remaining places', () => {
    // If available is 0, slot is unavailable even if isAvailable flag was true
    expect(isSlotAvailable({ available: 0, isAvailable: true })).toBe(false);
    expect(isSlotAvailable({ available: 2, isAvailable: true })).toBe(true);
    expect(isSlotAvailable({ available: 1, isAvailable: false })).toBe(true);
    expect(isSlotAvailable({ available: -1 })).toBe(false);
    // Fallback when available is undefined
    expect(isSlotAvailable({ isAvailable: true })).toBe(false);
    expect(isSlotAvailable({ isAvailable: false })).toBe(false);
  });
});

