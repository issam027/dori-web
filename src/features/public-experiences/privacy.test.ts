import { describe, expect, it } from 'vitest';
import { isPublicDisplaySnapshot, trackingProgress } from './privacy';

describe('public experience privacy', () => {
  it('derives progress only from the API position', () => {
    expect(trackingProgress(4)).toBe(25);
    expect(trackingProgress(undefined)).toBe(0);
  });
  it('rejects display payloads containing PII-shaped fields', () => {
    expect(isPublicDisplaySnapshot({ queueId: 1, activeThreads: [{ currentTicket: 'A1' }] })).toBe(
      true,
    );
    expect(isPublicDisplaySnapshot({ firstName: 'Private' })).toBe(false);
  });
});
