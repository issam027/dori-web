import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import type { NotificationResponseDto } from '@/api/generated/models';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { notify } from '@/core/notifications/notification-store';
import { Card } from '@/design-system/components/Card';
import { DataTable } from '@/design-system/components/DataTable';
import { FilterDrawer } from '@/design-system/components/FilterDrawer';
import { Modal } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { Pagination } from '@/design-system/components/Pagination';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { ManualNotificationWizard } from './ManualNotificationWizard';
import { canResendNotification, maskRecipient } from './notification-utils';
import { useNotification, useNotifications, useResendNotification } from './hooks/useNotifications';

const statusTone = (status: string): 'neutral' | 'success' | 'warning' | 'danger' =>
  status === 'delivered'
    ? 'success'
    : status === 'failed'
      ? 'danger'
      : status === 'pending' || status === 'processing'
        ? 'warning'
        : 'neutral';

export function NotificationsPage() {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const canSend = hasPermission(user, 'notification_send');
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [wizard, setWizard] = useState(false);
  const [detailId, setDetailId] = useState<number>();
  const journal = useNotifications({
    page,
    channel: channel || undefined,
    status: status || undefined,
    date: date || undefined,
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
  const activeFilters = Number(Boolean(channel)) + Number(Boolean(status)) + Number(Boolean(date));

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Communication"
        title={t('common.notifications')}
        description={t('supervision.notifications.journalDEnvoiDetailEtEmissionManuelle')}
        actions={
          <div className="action-row">
            <FilterDrawer activeCount={activeFilters}>
              <div className="form-stack">
                <label>
                  {t('common.canal')}
                  <select
                    value={channel}
                    onChange={(event) => {
                      setChannel(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">{t('supervision.notifications.tous')}</option>
                    <option value="sms">{t('common.sms')}</option>
                    <option value="email">{t('common.email')}</option>
                  </select>
                </label>
                <label>
                  {t('common.status')}
                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">{t('supervision.notifications.tous')}</option>
                    {['pending', 'processing', 'sent', 'delivered', 'failed'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('common.date')}
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                      setPage(1);
                    }}
                  />
                </label>
              </div>
            </FilterDrawer>
            {canSend ? (
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  setWizard(true);
                }}
              >
                <Plus aria-hidden="true" />
                {t('supervision.notifications.nouvelEnvoi')}
              </button>
            ) : null}
          </div>
        }
      />
      <Card>
        <DataTable
          caption={t('supervision.notifications.journalDesNotifications')}
          rows={items}
          getRowKey={(row) => row.notificationId}
          columns={[
            {
              key: 'created',
              header: 'Créée',
              render: (row) => new Date(row.createdAt).toLocaleString(),
            },
            {
              key: 'ticket',
              header: 'Inscription',
              render: (row) => row.ticketNumber ?? `#${String(row.registrationId)}`,
            },
            { key: 'channel', header: 'Canal', render: (row) => row.channel.toUpperCase() },
            {
              key: 'recipient',
              header: 'Destinataire',
              render: (row) => maskRecipient(row.recipient),
            },
            {
              key: 'status',
              header: 'Statut',
              render: (row) => (
                <StatusBadge tone={statusTone(row.notificationStatus)}>
                  {row.notificationStatus}
                </StatusBadge>
              ),
            },
            {
              key: 'attempts',
              header: 'Tentatives',
              align: 'end',
              render: (row) => row.attemptCount,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="action-row">
                  <button
                    type="button"
                    className="button button-small"
                    onClick={() => {
                      setDetailId(row.notificationId);
                    }}
                  >
                    <Search aria-hidden="true" />
                    {t('supervision.notifications.detail')}
                  </button>
                  {canResendNotification(row.notificationStatus, canSend) ? (
                    <button
                      type="button"
                      className="button button-small"
                      disabled={resend.isPending}
                      onClick={() => {
                        resend.run(row.notificationId);
                      }}
                    >
                      <RefreshCcw aria-hidden="true" />
                      {t('supervision.notifications.reemettre')}
                    </button>
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
      <dt>{t('supervision.notifications.destinataireVariant2')}</dt>
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
