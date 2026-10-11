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
        title={t('ui.supervision.notifications_page.notifications_fki4un')}
        description={t(
          'ui.supervision.notifications_page.journal_d_envoi_detail_et_emission_manuelle_pbxvuy',
        )}
        actions={
          <div className="action-row">
            <FilterDrawer activeCount={activeFilters}>
              <div className="form-stack">
                <label>
                  {t('ui.supervision.notifications_page.canal_1219p1c')}
                  <select
                    value={channel}
                    onChange={(event) => {
                      setChannel(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">{t('ui.supervision.notifications_page.tous_1eotn8w')}</option>
                    <option value="sms">{t('ui.supervision.notifications_page.sms_q3rkiy')}</option>
                    <option value="email">
                      {t('ui.supervision.notifications_page.email_inbfc7')}
                    </option>
                  </select>
                </label>
                <label>
                  {t('ui.supervision.notifications_page.statut_1yaum3a')}
                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">{t('ui.supervision.notifications_page.tous_1eotn8w')}</option>
                    {['pending', 'processing', 'sent', 'delivered', 'failed'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('ui.supervision.notifications_page.date_ggjuyh')}
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
                {t('ui.supervision.notifications_page.nouvel_envoi_1kutyxn')}
              </button>
            ) : null}
          </div>
        }
      />
      <Card>
        <DataTable
          caption={t('ui.supervision.notifications_page.journal_des_notifications_1gdlx9g')}
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
                    {t('ui.supervision.notifications_page.detail_qlpl2o')}
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
                      {t('ui.supervision.notifications_page.reemettre_1d0q7c4')}
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
        title={t('ui.supervision.notifications_page.detail_de_la_notification_xau4jx')}
      >
        <NotificationDetail notification={detail.data?.data} />
      </Modal>
    </div>
  );
}

function NotificationDetail({ notification }: { notification?: NotificationResponseDto }) {
  const { t } = useTranslation();
  if (!notification) return <p>{t('ui.supervision.notifications_page.chargement_16kwy5p')}</p>;
  return (
    <dl className="detail-list">
      <dt>{t('ui.supervision.notifications_page.inscription_1bzavbp')}</dt>
      <dd>#{notification.registrationId}</dd>
      <dt>{t('ui.supervision.notifications_page.destinataire_1qtg5cw')}</dt>
      <dd>{maskRecipient(notification.recipient)}</dd>
      <dt>{t('ui.supervision.notifications_page.canal_1219p1c')}</dt>
      <dd>{notification.channel}</dd>
      <dt>{t('ui.supervision.notifications_page.statut_1yaum3a')}</dt>
      <dd>{notification.notificationStatus}</dd>
      <dt>{t('ui.supervision.notifications_page.contenu_1hxusj9')}</dt>
      <dd>{notification.notificationContent}</dd>
      <dt>{t('ui.supervision.notifications_page.echec_14peoen')}</dt>
      <dd>{notification.failureReason ?? '—'}</dd>
    </dl>
  );
}
