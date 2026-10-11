import type { PersonResponseDto, SendManualNotificationDtoChannel } from '@/api/generated/models';

export type NotificationWizardStep = 'audience' | 'registration' | 'content';
export type NotificationWizardEvent = 'next' | 'back' | 'reset';

const order: readonly NotificationWizardStep[] = ['audience', 'registration', 'content'];

export function transitionNotificationWizard(
  step: NotificationWizardStep,
  event: NotificationWizardEvent,
): NotificationWizardStep {
  if (event === 'reset') return 'audience';
  const index = order.indexOf(step);
  if (event === 'next') return order[Math.min(index + 1, order.length - 1)] ?? step;
  return order[Math.max(index - 1, 0)] ?? step;
}

export function notificationRecipient(
  person: PersonResponseDto | undefined,
  channel: SendManualNotificationDtoChannel,
): string | undefined {
  return channel === 'sms' ? (person?.phoneNumber ?? undefined) : (person?.email ?? undefined);
}

export function canSendManualNotification({
  hasRegistration,
  content,
  person,
  channel,
  pending,
}: {
  hasRegistration: boolean;
  content: string;
  person: PersonResponseDto | undefined;
  channel: SendManualNotificationDtoChannel;
  pending: boolean;
}): boolean {
  return (
    hasRegistration &&
    Boolean(content.trim()) &&
    Boolean(notificationRecipient(person, channel)) &&
    !pending
  );
}
