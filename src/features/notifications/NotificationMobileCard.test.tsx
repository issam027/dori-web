import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationMobileCard } from './NotificationMobileCard';

const notification = {
  notificationId: '00000000-0000-4000-8000-000000000004',
  registrationId: '00000000-0000-4000-8000-000000000012',
  ticketNumber: 'A-012',
  channel: 'sms' as const,
  notificationType: 'threshold' as const,
  locale: 'fr',
  recipient: '+33612345678',
  notificationContent: 'Message',
  notificationStatus: 'failed' as const,
  attemptCount: 2,
  createdAt: '2026-10-21T08:30:00.000Z',
  updatedAt: '2026-10-21T08:35:00.000Z',
};

it('renders notification details and delegates its mobile actions', async () => {
  const user = userEvent.setup();
  const onView = vi.fn();
  const onResend = vi.fn();
  render(
    <div role="list">
      <NotificationMobileCard
        notification={notification}
        createdAt="21 octobre 2026"
        canResend
        resendPending={false}
        onView={onView}
        onResend={onResend}
      />
    </div>,
  );

  expect(screen.getByRole('listitem')).toHaveTextContent('A-012');
  expect(screen.getByRole('listitem')).toHaveTextContent('Échec');
  await user.click(screen.getByRole('button', { name: /détail/i }));
  await user.click(screen.getByRole('button', { name: /réémettre/i }));
  expect(onView).toHaveBeenCalledOnce();
  expect(onResend).toHaveBeenCalledOnce();
});
