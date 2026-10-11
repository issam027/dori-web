import { describe, expect, it } from 'vitest';
import {
  canSendManualNotification,
  notificationRecipient,
  transitionNotificationWizard,
} from './notification-wizard-machine';

const person = { personId: 1, phoneNumber: '+33600000000', email: 'a@b.test' } as never;

describe('notification wizard machine', () => {
  it('navigates forward, backward and resets without leaving its bounds', () => {
    expect(transitionNotificationWizard('audience', 'back')).toBe('audience');
    expect(transitionNotificationWizard('audience', 'next')).toBe('registration');
    expect(transitionNotificationWizard('registration', 'next')).toBe('content');
    expect(transitionNotificationWizard('content', 'next')).toBe('content');
    expect(transitionNotificationWizard('content', 'back')).toBe('registration');
    expect(transitionNotificationWizard('content', 'reset')).toBe('audience');
  });

  it('validates the selected channel and the final payload', () => {
    expect(notificationRecipient(person, 'sms')).toBe('+33600000000');
    expect(notificationRecipient(person, 'email')).toBe('a@b.test');
    expect(
      canSendManualNotification({
        hasRegistration: true,
        content: 'Message',
        person,
        channel: 'sms',
        pending: false,
      }),
    ).toBe(true);
    expect(
      canSendManualNotification({
        hasRegistration: false,
        content: 'Message',
        person,
        channel: 'sms',
        pending: false,
      }),
    ).toBe(false);
    expect(
      canSendManualNotification({
        hasRegistration: true,
        content: 'Message',
        person: { personId: 2 } as never,
        channel: 'email',
        pending: false,
      }),
    ).toBe(false);
    expect(
      canSendManualNotification({
        hasRegistration: true,
        content: 'Message',
        person,
        channel: 'sms',
        pending: true,
      }),
    ).toBe(false);
  });
});
