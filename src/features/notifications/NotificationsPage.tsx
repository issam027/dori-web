import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCcw, RotateCcw, Search } from 'lucide-react';
import type {
  NotificationResponseDto,
  NotificationsControllerFindNotificationsSort,
} from '@/api/generated/models';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { notify } from '@/core/notifications/notification-store';
import { Card } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { ManualNotificationWizard } from './ManualNotificationWizard';
import { canResendNotification, maskRecipient, notificationStatusTone } from './notification-utils';
import { useNotification, useNotifications, useResendNotification } from './hooks/useNotifications';
import { useScopeStore } from '@/core/scope/scope-store';
import { useQueues } from '@/features/queues/hooks/useQueues';
import { Button } from '@/design-system/components/Button';
import { formatDateTime } from '@/core/i18n/date-format';
import { NotificationMobileCard } from './NotificationMobileCard';

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const canSend = hasPermission(user, 'notification_send');
  const siteId = useScopeStore((state) => state.activeSiteId);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const queues = useQueues({ siteId, enabled: filtersOpen });
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState<'' | 'sms' | 'email'>('');
  const [status, setStatus] = useState<
    '' | 'pending' | 'processing' | 'sent' | 'delivered' | 'failed'
  >('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [queueId, setQueueId] = useState<number>();
  const [registrationId, setRegistrationId] = useState('');
  const [sort, setSort] = useState<NotificationsControllerFindNotificationsSort>('createdAt:desc');
  const [wizard, setWizard] = useState(false);
  const [detailId, setDetailId] = useState<number>();
  const journal = useNotifications({
    page,
    channel: channel || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    queueId,
    registrationId: registrationId ? Number(registrationId) : undefined,
    siteId: siteId ?? undefined,
    sort,
  });
  const detail = useNotification(detailId);
  const resend = useResendNotification(() => {
    notify({
      tone: 'success',
      title: t('notifications.delivery.requeued'),
      message: t('notifications.delivery.requeuedMessage'),
    });
  });
  const items = journal.data?.data.items ?? [];

  return (
    <div className="page-stack admin-page notifications-page">
      <PageHeader
        eyebrow={t('common.notifications')}
        title={t('common.notifications')}
        description={t('supervision.notifications.journalDEnvoiDetailEtEmissionManuelle')}
        actions={
          canSend ? (
            <Button
              variant="unstyled"
              type="button"
              className="button button-primary"
              labelMode="always"
              onClick={() => {
                setWizard(true);
              }}
            >
              <Plus aria-hidden="true" />
              {t('supervision.notifications.nouvelEnvoi')}
            </Button>
          ) : null
        }
      />
      <Card className="admin-filter-card notification-filter-card">
        <details
          onToggle={(event) => {
            setFiltersOpen(event.currentTarget.open);
          }}
        >
          <summary>
            <span>
              <Search aria-hidden="true" /> {t('notifications.filters.title')}
            </span>
            <small>{t('notifications.filters.help')}</small>
          </summary>
          <div className="admin-filter-grid notification-filter-grid">
            <label>
              {t('common.canal')}
              <select
                value={channel}
                onChange={(event) => {
                  setChannel(event.target.value as '' | 'sms' | 'email');
                  setPage(1);
                }}
              >
                <option value="">{t('common.all')}</option>
                <option value="sms">{t('common.sms')}</option>
                <option value="email">{t('common.email')}</option>
              </select>
            </label>
            <label>
              {t('common.status')}
              <select
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value as
                      '' | 'pending' | 'processing' | 'sent' | 'delivered' | 'failed',
                  );
                  setPage(1);
                }}
              >
                <option value="">{t('common.all')}</option>
                {['pending', 'processing', 'sent', 'delivered', 'failed'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              {t('reports.startDate')}
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              {t('reports.endDate')}
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              {t('queues.singular')}
              <select
                value={queueId ?? ''}
                onChange={(event) => {
                  setQueueId(event.target.value ? Number(event.target.value) : undefined);
                  setPage(1);
                }}
              >
                <option value="">{t('common.all')}</option>
                {queues.data?.data.items.map((queue) => (
                  <option key={queue.queueId} value={queue.queueId}>
                    {queue.queueName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('notifications.filters.registrationId')}
              <input
                type="number"
                min="1"
                value={registrationId}
                onChange={(event) => {
                  setRegistrationId(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              {t('notifications.filters.sort')}
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as NotificationsControllerFindNotificationsSort);
                  setPage(1);
                }}
              >
                <option value="createdAt:desc">{t('notifications.filters.newest')}</option>
                <option value="createdAt:asc">{t('notifications.filters.oldest')}</option>
                <option value="notificationStatus:asc">{t('common.status')}</option>
                <option value="channel:asc">{t('common.canal')}</option>
                <option value="sentAt:desc">{t('notifications.filters.recentlySent')}</option>
              </select>
            </label>
            <div className="admin-filter-actions">
              <Button
                variant="unstyled"
                className="button"
                type="button"
                onClick={() => {
                  setChannel('');
                  setStatus('');
                  setDateFrom('');
                  setDateTo('');
                  setQueueId(undefined);
                  setRegistrationId('');
                  setSort('createdAt:desc');
                  setPage(1);
                }}
              >
                <RotateCcw aria-hidden="true" />
                {t('common.reset')}
              </Button>
            </div>
          </div>
        </details>
      </Card>
      <Card className="settings-card notification-journal-card">
        <DataTable
          caption={t('supervision.notifications.journalDesNotifications')}
          rows={items}
          getRowKey={(row) => row.notificationId}
          renderMobileRow={(row) => (
            <NotificationMobileCard
              notification={row}
              createdAt={formatDateTime(row.createdAt, i18n.language) ?? '—'}
              canResend={canResendNotification(row.notificationStatus, canSend)}
              resendPending={resend.isPending}
              onView={() => {
                setDetailId(row.notificationId);
              }}
              onResend={() => {
                resend.run(row.notificationId);
              }}
            />
          )}
          columns={[
            {
              key: 'created',
              header: t('common.createdAt'),
              render: (row) => formatDateTime(row.createdAt, i18n.language) ?? '—',
            },
            {
              key: 'ticket',
              header: t('supervision.notifications.inscription'),
              render: (row) => row.ticketNumber ?? `#${String(row.registrationId)}`,
            },
            {
              key: 'channel',
              header: t('common.canal'),
              render: (row) => row.channel.toUpperCase(),
            },
            {
              key: 'recipient',
              header: t('common.recipient'),
              render: (row) => maskRecipient(row.recipient),
            },
            {
              key: 'status',
              header: t('common.status'),
              render: (row) => (
                <StatusBadge tone={notificationStatusTone(row.notificationStatus)}>
                  {row.notificationStatus}
                </StatusBadge>
              ),
            },
            {
              key: 'attempts',
              header: t('common.attempts'),
              align: 'end',
              render: (row) => row.attemptCount,
            },
            {
              key: 'actions',
              header: t('common.actions'),
              render: (row) => (
                <div className="action-row">
                  <Button
                    variant="unstyled"
                    type="button"
                    className="button button-small"
                    onClick={() => {
                      setDetailId(row.notificationId);
                    }}
                  >
                    <Search aria-hidden="true" />
                    {t('supervision.notifications.detail')}
                  </Button>
                  {canResendNotification(row.notificationStatus, canSend) ? (
                    <Button
                      variant="unstyled"
                      type="button"
                      className="button button-small"
                      disabled={resend.isPending}
                      onClick={() => {
                        resend.run(row.notificationId);
                      }}
                    >
                      <RefreshCcw aria-hidden="true" />
                      {t('supervision.notifications.reemettre')}
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
        <Pagination
          page={journal.data?.data.page ?? page}
          totalPages={Math.max(1, journal.data?.data.totalPages ?? 1)}
          onPageChange={setPage}
        />
      </Card>
      <ManualNotificationWizard open={wizard} onOpenChange={setWizard} />
      <Modal
        open={Boolean(detailId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetailId(undefined);
        }}
        title={t('supervision.notifications.detailDeLaNotification')}
      >
        <NotificationDetail notification={detail.data?.data} />
      </Modal>
    </div>
  );
}

function NotificationDetail({ notification }: { notification?: NotificationResponseDto }) {
  const { t } = useTranslation();
  if (!notification) return <p>{t('supervision.notifications.chargement')}</p>;
  return (
    <dl className="detail-list">
      <dt>{t('supervision.notifications.inscription')}</dt>
      <dd>#{notification.registrationId}</dd>
      <dt>{t('common.recipient')}</dt>
      <dd>{maskRecipient(notification.recipient)}</dd>
      <dt>{t('common.canal')}</dt>
      <dd>{notification.channel}</dd>
      <dt>{t('common.status')}</dt>
      <dd>{notification.notificationStatus}</dd>
      <dt>{t('common.contenu')}</dt>
      <dd>{notification.notificationContent}</dd>
      <dt>{t('supervision.notifications.echec')}</dt>
      <dd>{notification.failureReason ?? '—'}</dd>
    </dl>
  );
}
