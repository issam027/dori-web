import { useTranslation } from 'react-i18next';
import { RefreshCcw, Search } from 'lucide-react';
import type { NotificationResponseDto } from '@/api/generated/models';
import { Button } from '@/design-system/components/Button';
import { DataTableMobileCard } from '@/design-system/components/DataTableMobileCard';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { maskRecipient, notificationStatusTone } from './notification-utils';
import { notificationStatusKey } from '@/shared/presentation/domain-labels';

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
      title={notification.ticketNumber ?? t('common.unknownTicket')}
      subtitle={createdAt}
      badge={
        <StatusBadge tone={notificationStatusTone(notification.notificationStatus)}>
          {t(notificationStatusKey(notification.notificationStatus))}
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
          <Button size="small" type="button" onClick={onView}>
            <Search aria-hidden="true" />
            {t('supervision.notifications.detail')}
          </Button>
          {canResend ? (
            <Button size="small" type="button" disabled={resendPending} onClick={onResend}>
              <RefreshCcw aria-hidden="true" />
              {t('supervision.notifications.reemettre')}
            </Button>
          ) : null}
        </>
      }
    />
  );
}
