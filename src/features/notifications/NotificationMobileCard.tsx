import { useTranslation } from 'react-i18next';
import { RefreshCcw, Search } from 'lucide-react';
import type { NotificationResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { maskRecipient, notificationStatusTone } from './notification-utils';

export function NotificationMobileCard({
  notification,
  createdAt,
  canResend,
  resendPending,
  onView,
  onResend,
}: {
  notification: NotificationResponseDto;
  createdAt: string;
  canResend: boolean;
  resendPending: boolean;
  onView: () => void;
  onResend: () => void;
}) {
  const { t } = useTranslation();
  return (
    <DataTableMobileCard
      title={notification.ticketNumber ?? `#${notification.registrationId}`}
      subtitle={createdAt}
      badge={
        <StatusBadge tone={notificationStatusTone(notification.notificationStatus)}>
          {notification.notificationStatus}
        </StatusBadge>
      }
      fields={[
        {
          label: t('common.recipient'),
          value: maskRecipient(notification.recipient),
          wide: true,
        },
        { label: t('common.canal'), value: notification.channel.toUpperCase() },
        { label: t('common.attempts'), value: notification.attemptCount },
      ]}
      actions={
        <>
          <Button variant="unstyled" type="button" className="button button-small" onClick={onView}>
            <Search aria-hidden="true" />
            {t('supervision.notifications.detail')}
          </Button>
          {canResend ? (
            <Button
              variant="unstyled"
              type="button"
              className="button button-small"
              disabled={resendPending}
              onClick={onResend}
            >
              <RefreshCcw aria-hidden="true" />
              {t('supervision.notifications.reemettre')}
            </Button>
          ) : null}
        </>
      }
    />
  );
}
