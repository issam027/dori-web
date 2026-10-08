import { describe, expect, it } from 'vitest';
import { canResendNotification, maskRecipient } from './notification-utils';

describe('notification safeguards', () => {
  it('masks email and phone recipients', () => {
    expect(maskRecipient('hello@example.com')).toBe('he***@example.com');
    expect(maskRecipient('+33612345678')).toBe('+3••••78');
  });
  it('only allows failed notifications to be resent by an authorized user', () => {
    expect(canResendNotification('failed', true)).toBe(true);
    expect(canResendNotification('delivered', true)).toBe(false);
    expect(canResendNotification('failed', false)).toBe(false);
  });
});
