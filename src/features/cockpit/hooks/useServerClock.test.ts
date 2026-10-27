import { elapsedMinutes } from './useServerClock';

describe('cockpit server clock', () => {
  it('computes elapsed whole minutes without returning negative values', () => {
    const now = Date.parse('2026-10-27T10:10:30.000Z');
    expect(elapsedMinutes('2026-10-27T10:03:00.000Z', now)).toBe(7);
    expect(elapsedMinutes('2026-10-27T10:12:00.000Z', now)).toBe(0);
  });

  it('returns null for malformed API values', () => {
    expect(elapsedMinutes({}, Date.now())).toBeNull();
    expect(elapsedMinutes('invalid', Date.now())).toBeNull();
  });
});
