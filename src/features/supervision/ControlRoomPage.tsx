import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { CalendarDays, ListChecks, MonitorUp, UsersRound } from 'lucide-react';
import { useSessionStore } from '@/core/auth/session-store';
import { hasPermission } from '@/core/permissions/permissions';
import { useScopeStore } from '@/core/scope/scope-store';
import { Card, MetricCard } from '@/design-system/components/Card';
import { EmptyState, ErrorState } from '@/design-system/components/FeedbackState';
import { ConfirmDialog } from '@/design-system/components/Modal';
import { PageHeader } from '@/design-system/components/PageHeader';
import { StatusBadge } from '@/design-system/components/StatusBadge';
import { maskRecipient } from './notification-utils';
import { slaTone } from './sla';
import { notify } from '@/core/notifications/notification-store';
import { useDashboardQueueLoad, useDashboardSummary } from './hooks/useReports';
import { useRecentNotifications } from './hooks/useNotifications';
import { useQueueStatuses } from '@/features/queues/hooks/useQueues';
import { useDeskSession } from '@/features/queue-operations/hooks/useQueueOperations';
import { useResetQueue } from './hooks/useControlRoom';

export function ControlRoomPage() {
  const { t: __t } = useTranslation();
  const siteId = useScopeStore((s) => s.activeSiteId);
  const user = useSessionStore((s) => s.user);
  const [resetQueue, setResetQueue] = useState<{ id: number; name: string }>();
  const load = useDashboardQueueLoad(siteId);
  const summary = useDashboardSummary(siteId);
  const items = load.data?.data ?? [];
  const queueIds = items.map((queue) => queue.queueId);
  const statuses = useQueueStatuses(queueIds);
  const { threads, sessions } = useDeskSession(null, queueIds);
  const notifications = useRecentNotifications();
  const reset = useResetQueue(() => {
    const queueName = resetQueue?.name;
    setResetQueue(undefined);
    notify({
      tone: 'success',
      title: __t('notifications.queue.reset'),
      message: queueName
        ? __t('notifications.queue.resetMessage', { queue: queueName })
        : undefined,
    });
  });
  if (load.isError || summary.isError)
    return <ErrorState onRetry={() => void Promise.all([load.refetch(), summary.refetch()])} />;
  const activeCounters = statuses.reduce(
    (sum, status) => sum + (status.data?.data.activeThreads ?? 0),
    0,
  );
  const totalCounters = threads.reduce((sum, thread) => sum + (thread.data?.data.total ?? 0), 0);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={__t('common.pilotage')}
        title={__t('supervision.controlRoom.supervisionTempsReel')}
        description={__t('supervision.controlRoom.chargeGuichetsSessionsEtAlertesIssuesDeL')}
      />
      <div className="metric-grid">
        {[
          {
            label: __t('common.activeQueues'),
            value: summary.data?.data.activeQueues,
            icon: ListChecks,
          },
          {
            label: __t('common.waiting'),
            value: summary.data?.data.waitingTotal,
            icon: UsersRound,
          },
          {
            label: __t('common.activeCounters'),
            value: `${String(activeCounters)}/${totalCounters ? String(totalCounters) : '—'}`,
            icon: MonitorUp,
          },
          {
            label: __t('common.todayAppointments'),
            value: summary.data?.data.appointmentsToday,
            icon: CalendarDays,
          },
        ].map(({ label, value, icon: Icon }) => (
          <MetricCard key={label} label={label} value={value ?? '—'} icon={<Icon />} />
        ))}
      </div>
      {!load.isLoading && !items.length ? (
        <EmptyState title={__t('supervision.controlRoom.aucuneFileASuperviser')} />
      ) : (
        <div className="queue-card-grid">
          {items.map((queue, index) => {
            const status = statuses[index]?.data?.data;
            const tone = slaTone(queue.waitingCount, status?.estimatedWaitMinutes ?? 0);
            const queueSessions = sessions[index]?.data?.data.items ?? [];
            return (
              <Card key={queue.queueId}>
                <div className="card-head">
                  <div>
                    <span className="eyebrow">
                      {queue.queueCode} · {queue.siteName}
                    </span>
                    <h2>{queue.queueName}</h2>
                  </div>
                  <StatusBadge tone={tone}>
                    {__t('supervision.controlRoom.sla')}
                    {status?.estimatedWaitMinutes ?? '—'} {__t('common.min')}
                  </StatusBadge>
                </div>
                <div className="queue-load">
                  <strong>{queue.waitingCount}</strong>
                  <span>
                    {__t('supervision.controlRoom.enAttenteForfaitDominant')}
                    {queue.dominantTier}
                  </span>
                </div>
                <p>
                  {status?.activeThreads ?? 0} {__t('common.guichetSActifS')}
                  {queueSessions.length} {__t('supervision.controlRoom.sessionS')}
                </p>
                {queueSessions.length ? (
                  <ul className="compact-list">
                    {queueSessions.map((session) => (
                      <li key={session.sessionId}>
                        {__t('common.guichet')}
                        {session.threadNumber ?? __t('supervision.controlRoom.flottant')} ·{' '}
                        {session.username ??
                          __t('controlRoom.operatorReference', {
                            value0: String(session.userId),
                          })}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {tone === 'danger' ? (
                  <p className="alert-inline" role="alert">
                    {__t('supervision.controlRoom.seuilLocalDeVigilanceDepasseVerifiezLaCha')}
                  </p>
                ) : null}
                {hasPermission(user, 'queue_edit') ? (
                  <button
                    className="button button-danger"
                    type="button"
                    onClick={() => {
                      setResetQueue({ id: queue.queueId, name: queue.queueName });
                    }}
                  >
                    {__t('supervision.controlRoom.reinitialisationDUrgence')}
                  </button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
      <Card>
        <h2>{__t('supervision.controlRoom.notificationsRecentes')}</h2>
        <ul className="compact-list">
          {notifications.data?.data.items.map((notification) => (
            <li key={notification.notificationId}>
              <strong>
                {notification.ticketNumber ??
                  __t('common.hashIdentifier', {
                    value0: String(notification.registrationId),
                  })}
              </strong>{' '}
              · {notification.channel.toUpperCase()} {__t('supervision.controlRoom.vers')}
              {maskRecipient(notification.recipient)} ·{' '}
              <StatusBadge
                tone={
                  notification.notificationStatus === 'failed'
                    ? 'danger'
                    : notification.notificationStatus === 'delivered'
                      ? 'success'
                      : 'warning'
                }
              >
                {notification.notificationStatus}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </Card>
      <ConfirmDialog
        open={Boolean(resetQueue)}
        onOpenChange={(open) => {
          if (!open) setResetQueue(undefined);
        }}
        title={__t('supervision.controlRoom.reinitialisationDUrgence')}
        description={__t('supervision.controlRoom.resetDescription', {
          queue: resetQueue?.name ?? '',
        })}
        confirmLabel={
          reset.isPending
            ? __t('supervision.controlRoom.resetting')
            : __t('supervision.controlRoom.confirmReset')
        }
        destructive
        onConfirm={() => {
          if (resetQueue) reset.run(resetQueue.id);
        }}
      />
    </div>
  );
}
